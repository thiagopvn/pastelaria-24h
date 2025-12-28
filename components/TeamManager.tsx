import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import firebase from 'firebase/compat/app';
import { Users, UserPlus, Coffee, Trash2, Plus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface TeamMember {
  userId: string;
  name: string;
  role: string;
  addedAt: any;
}

interface TeamManagerProps {
  shiftId: string;
  products: Product[];
}

export const TeamManager: React.FC<TeamManagerProps> = ({ shiftId, products }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Consumption Modal State
  const [consumptionModalUser, setConsumptionModalUser] = useState<TeamMember | null>(null);
  const [userConsumptions, setUserConsumptions] = useState<any[]>([]);

  // 1. Fetch Users & Current Team
  useEffect(() => {
    const unsubUsers = db.collection('users').onSnapshot(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });

    const unsubTeam = db.collection('shifts').doc(shiftId).collection('team')
      .orderBy('addedAt')
      .onSnapshot(snap => {
        setTeam(snap.docs.map(d => ({ userId: d.id, ...d.data() } as TeamMember)));
      });

    return () => { unsubUsers(); unsubTeam(); };
  }, [shiftId]);

  // 2. Fetch Consumptions when modal opens
  useEffect(() => {
    if (!consumptionModalUser) return;
    
    const unsub = db.collection('shifts').doc(shiftId).collection('records')
      .where('type', '==', 'consumption')
      .where('consumerId', '==', consumptionModalUser.userId)
      .onSnapshot(snap => {
        setUserConsumptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      
    return () => unsub();
  }, [consumptionModalUser, shiftId]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    const user = allUsers.find(u => u.id === selectedUserId);
    if (!user) return;

    await db.collection('shifts').doc(shiftId).collection('team').doc(user.id).set({
      name: user.name,
      role: user.role,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setSelectedUserId('');
  };

  const handleAddConsumption = async (product: Product) => {
    if (!consumptionModalUser) return;
    
    await db.collection('shifts').doc(shiftId).collection('records').add({
      type: 'consumption',
      productId: product.id,
      productName: product.name,
      total: product.price,
      consumerId: consumptionModalUser.userId,
      consumerName: consumptionModalUser.name,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  };

  const removeMember = async (userId: string) => {
    if(confirm("Remover colaborador deste turno?")) {
        await db.collection('shifts').doc(shiftId).collection('team').doc(userId).delete();
    }
  };

  const totalConsumptionValue = userConsumptions.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Equipe do Turno
        </h3>
        <div className="flex items-center gap-2">
           <select 
             value={selectedUserId}
             onChange={(e) => setSelectedUserId(e.target.value)}
             className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none w-40"
           >
             <option value="">Selecionar...</option>
             {allUsers
               .filter(u => !team.find(t => t.userId === u.id)) // Filter already added
               .map(u => (
                 <option key={u.id} value={u.id}>{u.name}</option>
               ))}
           </select>
           <button 
             onClick={handleAddMember}
             disabled={!selectedUserId}
             className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50"
           >
             <UserPlus className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="divide-y divide-slate-700">
        {team.length === 0 && <p className="p-4 text-slate-500 text-sm text-center">Nenhum colaborador adicional.</p>}
        {team.map(member => (
          <div key={member.userId} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{member.name}</p>
                <p className="text-xs text-slate-500 capitalize">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setConsumptionModalUser(member)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white border border-slate-600 transition-colors"
              >
                <Coffee className="w-3 h-3" />
                Consumo
              </button>
              <button onClick={() => removeMember(member.userId)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Consumption Modal */}
      {consumptionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white">Consumo</h3>
                <p className="text-xs text-slate-400">{consumptionModalUser.name}</p>
              </div>
              <button onClick={() => setConsumptionModalUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {/* List Consumptions */}
               <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-slate-400 uppercase">Itens Consumidos</span>
                   <span className="text-sm font-bold text-red-400">- R$ {totalConsumptionValue.toFixed(2)}</span>
                 </div>
                 {userConsumptions.length === 0 ? (
                   <p className="text-xs text-slate-600 italic">Nenhum item lançado.</p>
                 ) : (
                   <ul className="space-y-1">
                     {userConsumptions.map(c => (
                       <li key={c.id} className="flex justify-between text-sm text-slate-300">
                         <span>1x {c.productName}</span>
                         <span>R$ {c.total.toFixed(2)}</span>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>

               {/* Add Product Grid */}
               <div className="grid grid-cols-2 gap-2">
                 {products.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => handleAddConsumption(p)}
                     className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded flex flex-col items-center text-center gap-1"
                   >
                     <span className="text-xs font-medium text-white line-clamp-1">{p.name}</span>
                     <span className="text-xs text-emerald-400 font-bold">R$ {p.price.toFixed(2)}</span>
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="p-4 border-t border-slate-800">
              <button 
                onClick={() => setConsumptionModalUser(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
