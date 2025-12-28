import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import firebase from 'firebase/compat/app';
import { ArrowDownCircle, ArrowUpCircle, Check, DollarSign, Plus } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'entry' | 'exit';
  category: string;
  description: string;
  amount: number;
  date: any;
  status?: 'pending' | 'confirmed';
  shiftId?: string; // If linked to a shift closure
}

export const FinancialControl: React.FC = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingShifts, setPendingShifts] = useState<any[]>([]);
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'fornecedores' });

  // 1. Fetch Transactions & Pending Shifts
  useEffect(() => {
    // Transactions stream
    const unsubTrans = db.collection('financial_movements')
      .orderBy('date', 'desc')
      .limit(50)
      .onSnapshot(snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(items);
        
        // Simple client-side balance calculation (in production, use an aggregated document)
        const total = items.reduce((acc, curr) => {
          return curr.type === 'entry' ? acc + curr.amount : acc - curr.amount;
        }, 0);
        setBalance(total);
      });

    // Pending Shifts (Closed but not confirmed)
    const unsubShifts = db.collection('shifts')
      .where('status', '==', 'closed')
      .where('financialConfirmed', '==', false) // Need to add this flag to shifts
      .limit(10)
      .onSnapshot(snap => {
         // If field doesn't exist, we might get all closed. Filter manually if needed.
         // For now assuming we start adding this flag or check if it exists in movements.
         const list = snap.docs
           .map(d => ({ id: d.id, ...d.data() }))
           .filter((s: any) => !s.financialMovementId); // Only show if not linked yet
         setPendingShifts(list);
      });

    return () => { unsubTrans(); unsubShifts(); };
  }, []);

  const confirmEnvelope = async (shift: any) => {
    const amount = shift.closingData?.finalCashCount || 0;
    
    try {
      await db.runTransaction(async (t) => {
        // 1. Create financial movement
        const moveRef = db.collection('financial_movements').doc();
        t.set(moveRef, {
          type: 'entry',
          category: 'faturamento',
          description: `Fechamento Turno - ${shift.userName}`,
          amount: amount,
          date: firebase.firestore.FieldValue.serverTimestamp(),
          shiftId: shift.id,
          status: 'confirmed'
        });

        // 2. Mark shift as confirmed
        const shiftRef = db.collection('shifts').doc(shift.id);
        t.update(shiftRef, { 
          financialConfirmed: true,
          financialMovementId: moveRef.id 
        });
      });
    } catch (e) {
      alert("Erro ao confirmar envelope.");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newExpense.amount);
    if (!val) return;

    await db.collection('financial_movements').add({
      type: 'exit',
      category: newExpense.category,
      description: newExpense.description,
      amount: val,
      date: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'confirmed'
    });
    setShowExpenseModal(false);
    setNewExpense({ description: '', amount: '', category: 'fornecedores' });
  };

  return (
    <div className="space-y-6">
      {/* Header Balance */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">Saldo em Caixa (Cofre)</p>
          <h2 className="text-4xl font-bold text-white">R$ {balance.toFixed(2)}</h2>
        </div>
        <button 
          onClick={() => setShowExpenseModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20"
        >
          <Plus className="w-5 h-5" />
          Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Envelopes */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
              Envelopes Pendentes (Entradas)
            </h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-80 overflow-y-auto">
            {pendingShifts.length === 0 && <p className="p-6 text-slate-500 text-center">Tudo em dia!</p>}
            {pendingShifts.map(shift => (
              <div key={shift.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{shift.userName}</p>
                  <p className="text-xs text-slate-400">
                    {shift.endTime?.toDate().toLocaleDateString()} • {shift.endTime?.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold">R$ {shift.closingData?.finalCashCount.toFixed(2)}</span>
                  <button 
                    onClick={() => confirmEnvelope(shift)}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                    title="Confirmar Recebimento"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-400" />
              Extrato de Movimentações
            </h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-80 overflow-y-auto">
             {transactions.map(t => (
               <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${t.type === 'entry' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                     {t.type === 'entry' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                   </div>
                   <div>
                     <p className="text-white text-sm font-medium">{t.description}</p>
                     <p className="text-xs text-slate-500 capitalize">{t.category} • {t.date?.toDate().toLocaleDateString()}</p>
                   </div>
                 </div>
                 <span className={`font-bold ${t.type === 'entry' ? 'text-emerald-400' : 'text-red-400'}`}>
                   {t.type === 'entry' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                 </span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Registrar Novo Gasto</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Descrição</label>
                <input 
                  required type="text" 
                  value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  placeholder="Ex: Conta de Luz"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Valor (R$)</label>
                <input 
                  required type="number" step="0.01"
                  value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Categoria</label>
                <select
                  value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="fornecedores">Fornecedores / Insumos</option>
                  <option value="contas">Contas (Luz/Água)</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="pessoal">Pessoal / Vale</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 text-slate-400 py-2">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
