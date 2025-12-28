import React, { useState } from 'react';
import { PlayCircle, DollarSign, X } from 'lucide-react';

interface OpenShiftModalProps {
  onConfirm: (initialCash: number) => void;
  onCancel: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({ onConfirm, onCancel }) => {
  const [cash, setCash] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cash);
    if (!isNaN(val)) {
      onConfirm(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden transform scale-100 transition-all">
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-500" />
            Iniciar Turno
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-700">
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Por favor, conte o dinheiro físico na gaveta antes de iniciar as operações.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fundo de Caixa (Troco Inicial)</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                autoFocus
                required
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xl text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-600"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            Confirmar e Abrir
          </button>
        </form>
      </div>
    </div>
  );
};