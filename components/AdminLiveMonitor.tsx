import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  Clock, DollarSign, Users, Settings, Trash2, Edit2, X,
  ArrowDownCircle, TrendingUp, Wallet
} from 'lucide-react';

interface ActiveShift {
  id: string;
  userId: string;
  userName?: string;
  startTime: any;
  salesCash: number;
  initialCash: number;
  totalWithdrawals?: number;
  status: 'open';
}

interface Withdrawal {
  id: string;
  amount: number;
  reason: string;
  timestamp: any;
}

export const AdminLiveMonitor: React.FC = () => {
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);

  // Managing State
  const [managingShift, setManagingShift] = useState<ActiveShift | null>(null);
  const [shiftRecords, setShiftRecords] = useState<any[]>([]);
  const [shiftTeam, setShiftTeam] = useState<any[]>([]);
  const [shiftWithdrawals, setShiftWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'withdrawals' | 'team' | 'settings'>('sales');
  const [newInitialCash, setNewInitialCash] = useState('');

  // 1. Live Monitor - All open shifts
  useEffect(() => {
    const unsubscribe = db.collection('shifts')
      .where('status', '==', 'open')
      .onSnapshot((snapshot) => {
        const shifts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ActiveShift[];
        setActiveShifts(shifts);
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Shift Details when Managing
  useEffect(() => {
    if (!managingShift) {
      setShiftRecords([]);
      setShiftTeam([]);
      setShiftWithdrawals([]);
      return;
    }

    // Listen to Sales Records
    const unsubRecords = db.collection('shifts').doc(managingShift.id).collection('records')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snap => {
        setShiftRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    // Listen to Team Members
    const unsubTeam = db.collection('shifts').doc(managingShift.id).collection('team')
      .onSnapshot(snap => {
        setShiftTeam(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    // Listen to Withdrawals
    const unsubWithdrawals = db.collection('shifts').doc(managingShift.id).collection('withdrawals')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snap => {
        setShiftWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Withdrawal[]);
      });

    setNewInitialCash(managingShift.initialCash.toString());

    return () => {
      unsubRecords();
      unsubTeam();
      unsubWithdrawals();
    };
  }, [managingShift]);

  const handleDeleteRecord = async (recordId: string) => {
    if (confirm(`Tem certeza que deseja apagar este registro? Isso ajustara o caixa automaticamente.`)) {
      await db.collection('shifts').doc(managingShift!.id).collection('records').doc(recordId).delete();
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId: string) => {
    if (confirm(`Tem certeza que deseja apagar esta sangria? O valor sera devolvido ao caixa.`)) {
      await db.collection('shifts').doc(managingShift!.id).collection('withdrawals').doc(withdrawalId).delete();
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (confirm(`Remover colaborador deste turno?`)) {
      await db.collection('shifts').doc(managingShift!.id).collection('team').doc(memberId).delete();
    }
  };

  const handleUpdateInitialCash = async () => {
    const val = parseFloat(newInitialCash);
    if (isNaN(val)) return;
    await db.collection('shifts').doc(managingShift!.id).update({ initialCash: val });
    alert("Fundo de caixa atualizado.");
  };

  // Calculate metrics
  const totalCurrentSales = activeShifts.reduce((acc, shift) => acc + (shift.salesCash || 0), 0);
  const totalWithdrawals = activeShifts.reduce((acc, shift) => acc + (shift.totalWithdrawals || 0), 0);
  const totalShiftWithdrawals = shiftWithdrawals.reduce((acc, w) => acc + w.amount, 0);

  // Current drawer for managed shift
  const currentDrawer = managingShift
    ? managingShift.initialCash + managingShift.salesCash - totalShiftWithdrawals
    : 0;

  if (loading) return <div className="p-4 text-slate-400">Carregando monitoramento...</div>;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 rounded-full">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Vendas Ativas</p>
              <h3 className="text-2xl font-bold text-white">R$ {totalCurrentSales.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 rounded-full">
              <ArrowDownCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Sangrias Ativas</p>
              <h3 className="text-2xl font-bold text-white">R$ {totalWithdrawals.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Turnos Abertos</p>
              <h3 className="text-2xl font-bold text-white">{activeShifts.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Liquido Ativo</p>
              <h3 className="text-2xl font-bold text-white">R$ {(totalCurrentSales - totalWithdrawals).toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Live List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Ao Vivo: Caixas Abertos
          </h3>
        </div>
        <div className="divide-y divide-slate-700">
          {activeShifts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum turno aberto no momento.</div>
          ) : (
            activeShifts.map((shift) => {
              const drawerTotal = shift.initialCash + shift.salesCash - (shift.totalWithdrawals || 0);
              return (
                <div key={shift.id} className="p-4 hover:bg-slate-700/50 transition-colors flex justify-between items-center group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{shift.userName || `Operador ${shift.userId.slice(0,4)}`}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Online
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {shift.startTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <DollarSign className="w-3 h-3" />
                        Vendas: R$ {shift.salesCash.toFixed(2)}
                      </span>
                      {(shift.totalWithdrawals || 0) > 0 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <ArrowDownCircle className="w-3 h-3" />
                          Sangrias: R$ {(shift.totalWithdrawals || 0).toFixed(2)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-white font-bold">
                        <Wallet className="w-3 h-3" />
                        Gaveta: R$ {drawerTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setManagingShift(shift)}
                    className="px-4 py-2 bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Settings className="w-4 h-4" />
                    Gerenciar
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Management Modal */}
      {managingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800 rounded-t-xl">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-500" />
                  Gerenciar Turno Ativo
                </h3>
                <p className="text-xs text-slate-400">{managingShift.userName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Gaveta Atual</p>
                  <p className="text-lg font-bold text-emerald-400">R$ {currentDrawer.toFixed(2)}</p>
                </div>
                <button onClick={() => setManagingShift(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('sales')}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'sales' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Vendas ({shiftRecords.filter(r => r.type === 'sale').length})
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'withdrawals' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Sangrias ({shiftWithdrawals.length})
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'team' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Equipe ({shiftTeam.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'settings' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Ajustes
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50">

              {activeTab === 'sales' && (
                <div className="space-y-2">
                  {shiftRecords.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Nenhuma venda registrada.</p>
                  )}
                  {shiftRecords.map(rec => (
                    <div key={rec.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${rec.type === 'consumption' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {rec.type === 'consumption' ? <Users className="w-4 h-4"/> : <DollarSign className="w-4 h-4"/>}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{rec.productName} (x{rec.quantity || 1})</p>
                          <p className="text-xs text-slate-500">
                            {rec.timestamp?.toDate().toLocaleTimeString()} • {rec.type === 'consumption' ? `Consumo: ${rec.consumerName}` : 'Venda'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold ${rec.type === 'consumption' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          R$ {rec.total.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'withdrawals' && (
                <div className="space-y-2">
                  {shiftWithdrawals.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Nenhuma sangria registrada.</p>
                  )}
                  {totalShiftWithdrawals > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-200 font-medium">Total em Sangrias</span>
                        <span className="text-amber-400 font-bold text-lg">R$ {totalShiftWithdrawals.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {shiftWithdrawals.map(w => (
                    <div key={w.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                          <ArrowDownCircle className="w-4 h-4"/>
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{w.reason}</p>
                          <p className="text-xs text-slate-500">
                            {w.timestamp?.toDate().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-amber-400">- R$ {w.amount.toFixed(2)}</span>
                        <button
                          onClick={() => handleDeleteWithdrawal(w.id)}
                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Excluir Sangria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-2">
                  {shiftTeam.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Apenas o operador principal.</p>
                  )}
                  {shiftTeam.map(member => (
                    <div key={member.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveTeamMember(member.id)}
                        className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Shift Summary */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Resumo do Turno</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fundo Inicial</span>
                        <span className="text-white">R$ {managingShift.initialCash.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vendas (Dinheiro)</span>
                        <span className="text-emerald-400">+ R$ {managingShift.salesCash.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sangrias</span>
                        <span className="text-amber-400">- R$ {totalShiftWithdrawals.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-slate-700 my-2" />
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Total Gaveta</span>
                        <span className="text-emerald-400">R$ {currentDrawer.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit Initial Cash */}
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ajustar Fundo de Caixa</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newInitialCash}
                        onChange={e => setNewInitialCash(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-white"
                      />
                      <button
                        onClick={handleUpdateInitialCash}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded font-bold"
                      >
                        Salvar
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Mudanca reflete imediatamente no painel do funcionario.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
