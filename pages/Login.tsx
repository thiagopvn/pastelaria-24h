import React, { useState } from 'react';
import { auth } from '../lib/firebase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      setError("Falha no login. Verifique suas credenciais.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Pastel24h</h1>
        <p className="text-slate-400 text-center mb-8">Acesse o sistema de gestão</p>
        
        {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input 
              type="email" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Senha</label>
            <input 
              type="password" 
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};