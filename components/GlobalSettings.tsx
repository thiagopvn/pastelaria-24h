import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { Save, Settings } from 'lucide-react';

export const GlobalSettings: React.FC = () => {
  const [config, setConfig] = useState({
    stoneRate: '',
    pagbankRate: '',
    salesTarget: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = db.collection('configurations').doc('global')
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          setConfig({
            stoneRate: data?.stoneRate || '',
            pagbankRate: data?.pagbankRate || '',
            salesTarget: data?.salesTarget || ''
          });
        }
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await db.collection('configurations').doc('global').set(config, { merge: true });
      alert("Configurações salvas!");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="max-w-2xl">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          Configurações do Sistema
        </h3>

        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-wider border-b border-slate-700 pb-2">Financeiro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Taxa Stone (%)</label>
                <input 
                  type="number" step="0.01"
                  value={config.stoneRate} onChange={e => setConfig({...config, stoneRate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Ex: 1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Taxa PagBank (%)</label>
                <input 
                  type="number" step="0.01"
                  value={config.pagbankRate} onChange={e => setConfig({...config, pagbankRate: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Ex: 2.0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider border-b border-slate-700 pb-2">Metas</h4>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Meta Diária de Vendas (R$)</label>
              <input 
                type="number" step="100"
                value={config.salesTarget} onChange={e => setConfig({...config, salesTarget: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                placeholder="Ex: 5000"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
