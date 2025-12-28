import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { ShiftCorrectionModal } from './ShiftCorrectionModal';

interface ClosedShift {
  id: string;
  userName: string;
  startTime: any;
  endTime: any;
  initialCash: number;
  payments: {
    cash: number;
    pix: number;
    stone_real: number;
    stone_cumulative: number;
    pagbank_real: number;
    pagbank_cumulative: number;
  };
  closingData: {
    finalCashCount: number;
    divergence: number;
    divergenceReason?: string;
    withdrawals: number;
  };
  financialSummary: {
    totalRevenue: number;
  };
}

export const ShiftHistory: React.FC = () => {
  const [shifts, setShifts] = useState<ClosedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<ClosedShift | null>(null);

  useEffect(() => {
    const unsubscribe = db.collection('shifts')
      .where('status', '==', 'closed')
      .orderBy('endTime', 'desc')
      .limit(20)
      .onSnapshot((snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClosedShift[];
        setShifts(items);
        setLoading(false);
      });

    return () => unsubscribe();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEditClick = (shift: ClosedShift, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingShift(shift);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando histórico...</div>;

  return (
    <div className="space-y-4 relative">
      {editingShift && (
        <ShiftCorrectionModal 
          shift={editingShift} 
          onClose={() => setEditingShift(null)} 
        />
      )}

      {shifts.length === 0 ? (
        <div className="p-12 text-center bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-slate-400">Nenhum turno fechado encontrado.</p>
        </div>
      ) : (
        shifts.map((shift) => {
          const hasDivergence = Math.abs(shift.closingData.divergence) > 1.00;
          const isExpanded = expandedId === shift.id;

          return (
            <div key={shift.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden transition-all group">
              <div 
                onClick={() => toggleExpand(shift.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 relative"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${hasDivergence ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {hasDivergence ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{shift.userName}</h4>
                    <p className="text-xs text-slate-400">
                      {shift.endTime?.toDate().toLocaleDateString()} • 
                      {shift.startTime?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                      {shift.endTime?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">Total Vendido</p>
                    <p className="font-bold text-white">R$ {shift.financialSummary?.totalRevenue?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className={`text-right ${hasDivergence ? 'text-red-400' : 'text-emerald-400'}`}>
                    <p className="text-xs opacity-70">Divergência</p>
                    <p className="font-bold">R$ {shift.closingData.divergence.toFixed(2)}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => handleEditClick(shift, e)}
                    className="p-2 bg-slate-700 hover:bg-amber-600 text-slate-300 hover:text-white rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Corrigir Turno (Produtos, Pagamentos, Caixa)"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-300 border-b border-slate-700 pb-2">Conferência de Dinheiro</h5>
                      <div className="flex justify-between text-slate-400">
                        <span>Fundo de Caixa (Inicial)</span>
                        <span>+ R$ {shift.initialCash.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Vendas em Dinheiro (Sistema)</span>
                        <span>+ R$ {shift.payments.cash.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>Sangrias (Retiradas)</span>
                        <span>- R$ {shift.closingData.withdrawals.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-medium pt-2 border-t border-slate-700/50">
                        <span>Esperado na Gaveta</span>
                        <span>= R$ {(shift.initialCash + shift.payments.cash - shift.closingData.withdrawals).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Contado pelo Operador</span>
                        <span>R$ {shift.closingData.finalCashCount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-bold text-slate-300 border-b border-slate-700 pb-2">Processamento de Cartões</h5>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-3 rounded">
                          <p className="text-xs text-emerald-500 font-bold mb-1">STONE</p>
                          <div className="flex justify-between text-slate-400 text-xs mb-1">
                            <span>Visor:</span>
                            <span>{shift.payments.stone_cumulative.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-white font-bold border-t border-slate-600 pt-1">
                            <span>Venda Real:</span>
                            <span>R$ {shift.payments.stone_real.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="bg-slate-800 p-3 rounded">
                          <p className="text-xs text-yellow-500 font-bold mb-1">PAGBANK</p>
                          <div className="flex justify-between text-slate-400 text-xs mb-1">
                            <span>Visor:</span>
                            <span>{shift.payments.pagbank_cumulative.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-white font-bold border-t border-slate-600 pt-1">
                            <span>Venda Real:</span>
                            <span>R$ {shift.payments.pagbank_real.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                         <div className="flex justify-between text-slate-300">
                            <span>PIX</span>
                            <span>R$ {shift.payments.pix.toFixed(2)}</span>
                          </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};