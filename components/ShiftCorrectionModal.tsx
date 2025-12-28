import React, { useState, useEffect } from 'react';
import { db, functions } from '../lib/firebase';
import { X, Save, ShoppingBag, CreditCard, Banknote, History, Trash2, AlertTriangle } from 'lucide-react';

interface ShiftCorrectionModalProps {
  shift: any;
  onClose: () => void;
}

type Tab = 'products' | 'payments' | 'cash' | 'history';

export const ShiftCorrectionModal: React.FC<ShiftCorrectionModalProps> = ({ shift, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // Form States
  const [paymentsForm, setPaymentsForm] = useState({
    pix: shift.payments.pix,
    stone_cumulative: shift.payments.stone_cumulative,
    pagbank_cumulative: shift.payments.pagbank_cumulative
  });
  const [cashForm, setCashForm] = useState({
    finalCashCount: shift.closingData.finalCashCount,
    withdrawals: shift.closingData.withdrawals,
    divergenceReason: shift.closingData.divergenceReason || ''
  });

  const [saving, setSaving] = useState(false);

  // Load Records for Products Tab
  useEffect(() => {
    if (activeTab === 'products') {
      setLoadingRecords(true);
      const unsub = db.collection('shifts').doc(shift.id).collection('records')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
          setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoadingRecords(false);
        });
      return () => unsub();
    }
  }, [activeTab, shift.id]);

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm("Excluir este registro afetará o total do turno. Continuar?")) {
      await db.collection('shifts').doc(shift.id).collection('records').doc(recordId).delete();
    }
  };

  const handleSavePayments = async () => {
    setSaving(true);
    try {
      const updateShiftFn = functions.httpsCallable('updateShift');
      await updateShiftFn({
        shiftId: shift.id,
        ...shift.closingData, // keep existing cash data
        payments: {
          pix: parseFloat(paymentsForm.pix),
          stone_cumulative: parseFloat(paymentsForm.stone_cumulative),
          pagbank_cumulative: parseFloat(paymentsForm.pagbank_cumulative)
        },
        divergenceReason: cashForm.divergenceReason
      });
      alert("Pagamentos atualizados!");
    } catch (e) {
      alert("Erro ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCash = async () => {
    setSaving(true);
    try {
      const updateShiftFn = functions.httpsCallable('updateShift');
      await updateShiftFn({
        shiftId: shift.id,
        finalCashCount: parseFloat(cashForm.finalCashCount),
        withdrawals: parseFloat(cashForm.withdrawals),
        divergenceReason: cashForm.divergenceReason,
        payments: { ...shift.payments } // keep existing payment data
      });
      alert("Caixa atualizado!");
    } catch (e) {
      alert("Erro ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Correções de Turno</h2>
            <p className="text-xs text-slate-400">ID: {shift.id} • Operador: {shift.userName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900">
          <button onClick={() => setActiveTab('products')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'products' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-slate-800/50' : 'text-slate-500 hover:text-white'}`}>
            <ShoppingBag className="w-4 h-4" /> Produtos
          </button>
          <button onClick={() => setActiveTab('payments')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'payments' ? 'text-blue-500 border-b-2 border-blue-500 bg-slate-800/50' : 'text-slate-500 hover:text-white'}`}>
            <CreditCard className="w-4 h-4" /> Pagamentos
          </button>
          <button onClick={() => setActiveTab('cash')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'cash' ? 'text-amber-500 border-b-2 border-amber-500 bg-slate-800/50' : 'text-slate-500 hover:text-white'}`}>
            <Banknote className="w-4 h-4" /> Caixa
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'text-purple-500 border-b-2 border-purple-500 bg-slate-800/50' : 'text-slate-500 hover:text-white'}`}>
            <History className="w-4 h-4" /> Histórico
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          
          {/* TAB: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white">Registro de Vendas</h3>
                <span className="text-xs text-slate-500">Exclusão estorna o valor automaticamente</span>
              </div>
              {loadingRecords ? <p className="text-slate-500">Carregando...</p> : (
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3 rounded-l-lg">Hora</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3 rounded-r-lg">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {records.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-800/50">
                        <td className="p-3">{rec.timestamp?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="p-3 font-medium text-white">{rec.productName}</td>
                        <td className="p-3 capitalize">{rec.type === 'consumption' ? 'Consumo' : 'Venda'}</td>
                        <td className="p-3 font-bold text-emerald-500">R$ {rec.total.toFixed(2)}</td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteRecord(rec.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5"/> Edição de Pagamentos Digitais</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Stone (Cumulativo Visor)</label>
                    <input 
                      type="number" step="0.01" 
                      value={paymentsForm.stone_cumulative} 
                      onChange={e => setPaymentsForm({...paymentsForm, stone_cumulative: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">PagBank (Cumulativo Visor)</label>
                    <input 
                      type="number" step="0.01" 
                      value={paymentsForm.pagbank_cumulative} 
                      onChange={e => setPaymentsForm({...paymentsForm, pagbank_cumulative: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">PIX (Total Turno)</label>
                    <input 
                      type="number" step="0.01" 
                      value={paymentsForm.pix} 
                      onChange={e => setPaymentsForm({...paymentsForm, pix: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={handleSavePayments}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Salvando...' : 'Salvar Pagamentos'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CASH */}
          {activeTab === 'cash' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2"><Banknote className="w-5 h-5"/> Conferência de Caixa</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Dinheiro Contado (Gaveta)</label>
                    <input 
                      type="number" step="0.01" 
                      value={cashForm.finalCashCount} 
                      onChange={e => setCashForm({...cashForm, finalCashCount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Sangrias / Retiradas</label>
                    <input 
                      type="number" step="0.01" 
                      value={cashForm.withdrawals} 
                      onChange={e => setCashForm({...cashForm, withdrawals: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Justificativa de Divergência</label>
                    <textarea 
                      value={cashForm.divergenceReason} 
                      onChange={e => setCashForm({...cashForm, divergenceReason: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none h-24" 
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={handleSaveCash}
                    disabled={saving}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Salvando...' : 'Salvar Caixa'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <History className="w-16 h-16 mb-4 opacity-20" />
              <p>Histórico de alterações em desenvolvimento.</p>
              <p className="text-xs">As edições são registradas nos logs do sistema.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};