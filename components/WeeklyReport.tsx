import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { Calendar, RefreshCw, Info, X } from 'lucide-react';

interface ReportData {
  userId: string;
  userName: string;
  role: string;
  hoursWorked: number;
  consumptionTotal: number;
  transportTotal: number;
  toPay: number;
  details: { date: string, hours: number, consumption: number }[];
}

export const WeeklyReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<ReportData | null>(null);
  
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const usersSnap = await db.collection('users').where('role', '==', 'employee').get();
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const startTs = new Date(startDate);
      const endTs = new Date(endDate);
      endTs.setHours(23, 59, 59);

      const shiftsSnap = await db.collection('shifts')
        .where('endTime', '>=', startTs)
        .where('endTime', '<=', endTs)
        .where('status', '==', 'closed')
        .get();

      const processed: ReportData[] = await Promise.all(users.map(async (user: any) => {
        let totalMs = 0;
        let consumption = 0;
        const detailsMap = new Map<string, {hours: number, consumption: number}>();

        for (const shiftDoc of shiftsSnap.docs) {
          const shift = shiftDoc.data();
          let worked = false;
          if (shift.userId === user.id) {
            worked = true;
          } else {
             const teamSnap = await shiftDoc.ref.collection('team').doc(user.id).get();
             if (teamSnap.exists) worked = true;
          }

          if (worked) {
            const start = shift.startTime.toDate();
            const end = shift.endTime.toDate();
            const durationMs = end - start;
            totalMs += durationMs;

            const consumeSnap = await shiftDoc.ref.collection('records')
              .where('type', '==', 'consumption')
              .where('consumerId', '==', user.id)
              .get();
            
            let shiftConsume = 0;
            consumeSnap.forEach(d => shiftConsume += d.data().total);
            consumption += shiftConsume;

            const dateKey = end.toLocaleDateString();
            const existing = detailsMap.get(dateKey) || { hours: 0, consumption: 0 };
            detailsMap.set(dateKey, {
                hours: existing.hours + (durationMs / (1000 * 60 * 60)),
                consumption: existing.consumption + shiftConsume
            });
          }
        }

        const details = Array.from(detailsMap.entries()).map(([date, data]) => ({
            date,
            hours: data.hours,
            consumption: data.consumption
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const hours = totalMs / (1000 * 60 * 60);
        
        return {
          userId: user.id,
          userName: user.name,
          role: user.role,
          hoursWorked: hours,
          consumptionTotal: consumption,
          transportTotal: 0,
          toPay: 0,
          details
        };
      }));

      setReportData(processed);

    } catch (e) {
      console.error(e);
      alert("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
           <Calendar className="w-4 h-4" />
           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />
           <span>até</span>
           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />
        </div>
        <button 
          onClick={fetchReport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Carregar Dados da Folha
        </button>
      </div>

      <div className="space-y-4">
        {reportData.map(data => (
          <div key={data.userId} className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col md:flex-row gap-6">
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                {data.userName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{data.userName}</h3>
                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded capitalize">{data.role}</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Horas Trab.</p>
                <p className="text-xl font-bold text-white">{data.hoursWorked.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Consumo</p>
                <p className="text-xl font-bold text-red-400">R$ {data.consumptionTotal.toFixed(2)}</p>
              </div>
              <div>
                 <p className="text-xs text-slate-500 uppercase font-bold">Transporte</p>
                 <p className="text-xl font-bold text-slate-300">R$ {data.transportTotal.toFixed(2)}</p>
              </div>
              <div className="border-l border-slate-700 pl-4">
                 <p className="text-xs text-emerald-500 uppercase font-bold">A Pagar (Est.)</p>
                 <p className="text-xl font-bold text-emerald-400">R$ --</p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
               <button 
                 onClick={() => setSelectedUserDetail(data)}
                 className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
               >
                 <Info className="w-3 h-3" /> Detalhes
               </button>
            </div>
          </div>
        ))}
        {!loading && reportData.length === 0 && (
          <div className="text-center p-8 text-slate-500">Clique em "Carregar Dados" para gerar a folha.</div>
        )}
      </div>

      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white">Detalhamento Semanal</h3>
              <button onClick={() => setSelectedUserDetail(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="text-center mb-6">
                <p className="text-lg font-bold text-white">{selectedUserDetail.userName}</p>
                <p className="text-sm text-slate-500">Extrato de horas e consumo</p>
            </div>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedUserDetail.details.length === 0 ? (
                    <p className="text-center text-slate-500 italic">Sem registros no período.</p>
                ) : (
                    selectedUserDetail.details.map((day, idx) => (
                        <div key={idx} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-300 text-sm">{day.date}</p>
                                <p className="text-xs text-emerald-500 font-bold">{day.hours.toFixed(1)} horas trabalhadas</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500 uppercase">Consumo</p>
                                <p className="text-sm font-bold text-red-400">R$ {day.consumption.toFixed(2)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button onClick={() => setSelectedUserDetail(null)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};