import React, { useState, useEffect } from 'react';
import { db, functions } from '../lib/firebase';
import { User, UserPlus, Shield, User as UserIcon } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const createUserFn = functions.httpsCallable('createUser');
      await createUserFn(newUser);
      setShowForm(false);
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
      alert("Usuário criado com sucesso!");
    } catch (error) {
      alert("Erro ao criar usuário: " + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando usuários...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-emerald-500" />
          Colaboradores
        </h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
              <input 
                type="text" required
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input 
                type="email" required
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Senha Inicial</label>
              <input 
                type="password" required minLength={6}
                value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Permissão</label>
              <select 
                value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="employee">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-2 pt-2">
              <button 
                type="submit" 
                disabled={creating}
                className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Salvar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
              {user.role === 'admin' ? 'ADMIN' : 'STAFF'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};