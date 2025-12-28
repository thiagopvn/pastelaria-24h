import React, { useState, useEffect } from 'react';
import { functions } from '../lib/firebase';
import { AlertTriangle, Calculator, CheckCircle, Info, Save } from 'lucide-react';

interface CashRegisterProps {
  shiftId: string;
  initialCash: number;
  currentSalesCash: number;
  currentWithdrawals: number;
  onCloseSuccess: () => void;
}

export const CashRegister: React.FC<CashRegisterProps> = ({
  shiftId,
  initialCash,
  currentSalesCash,
  currentWithdrawals,
  onCloseSuccess
}) => {
  const [formData, setFormData] = useState({
    finalCashCount: '',
    pix: '',
    stone_cumulative: '',
    pagbank_cumulative: '',
    divergenceReason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [divergence, setDivergence] = useState(0);

  // Real-time Divergence Calculation
  // Expected = Initial + Sales(Cash) - Withdrawals
  // Divergence = Counted - Expected
  useEffect(() => {
    const cashCount = parseFloat(formData.finalCashCount) || 0;
    const expected = initialCash + currentSalesCash - currentWithdrawals;
    setDivergence(cashCount - expected);
  }, [formData.finalCashCount, initialCash, currentSalesCash, currentWithdrawals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate divergence justification
    const isCritical = Math.abs(divergence) > 1.00;
    if (isCritical && !formData.divergenceReason.trim()) {
      alert("Divergencia maior que R$ 1.00 requer justificativa!");
      return;
    }

    setIsSubmitting(true);

    try {
      const closeShiftFn = functions.httpsCallable('closeShift');
      await closeShiftFn({
        shiftId,
        finalCashCount: parseFloat(formData.finalCashCount) || 0,
        divergenceReason: formData.divergenceReason,
        payments: {
          cash: currentSalesCash,
          pix: parseFloat(formData.pix) || 0,
          stone_cumulative: parseFloat(formData.stone_cumulative) || 0,
          pagbank_cumulative: parseFloat(formData.pagbank_cumulative) || 0
        }
      });
      onCloseSuccess();
    } catch (error) {
      alert("Erro ao fechar turno: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCriticalDivergence = Math.abs(divergence) > 1.00;
  const expectedCash = initialCash + currentSalesCash - currentWithdrawals;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl max-w-lg w-full mx-auto">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Calculator className="w-6 h-6 text-emerald-400" />
        Fechamento de Caixa
      </h2>

      {/* Summary Info */}
      <div className="bg-slate-900 rounded-lg p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Fundo Inicial</span>
          <span className="text-white">R$ {initialCash.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Vendas (Dinheiro)</span>
          <span className="text-emerald-400">+ R$ {currentSalesCash.toFixed(2)}</span>
        </div>
        {currentWithdrawals > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Sangrias Registradas</span>
            <span className="text-amber-400">- R$ {currentWithdrawals.toFixed(2)}</span>
          </div>
        )}
        <div className="h-px bg-slate-700 my-2" />
        <div className="flex justify-between font-bold">
          <span className="text-slate-300">Esperado na Gaveta</span>
          <span className="text-white">R$ {expectedCash.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cash Section */}
        <div className="space-y-4 border-b border-slate-700 pb-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Contagem de Dinheiro</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Valor Total Contado na Gaveta</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
              <input
                type="number"
                step="0.01"
                name="finalCashCount"
                required
                value={formData.finalCashCount}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-lg"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Divergence Alert */}
          <div className={`p-3 rounded-lg flex items-center gap-3 ${
            isCriticalDivergence
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : divergence === 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {isCriticalDivergence ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : divergence === 0 ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className="text-sm font-medium">
                {divergence === 0 ? 'Caixa Batendo!' : 'Divergencia'}
              </span>
              <div className="text-lg font-bold">
                {divergence >= 0 ? '+' : ''} R$ {divergence.toFixed(2)}
              </div>
            </div>
          </div>

          {isCriticalDivergence && (
            <div>
              <label className="block text-xs text-red-400 mb-1 font-bold">
                Justificativa da Divergencia (Obrigatorio)
              </label>
              <textarea
                name="divergenceReason"
                required
                value={formData.divergenceReason}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-red-500/50 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-red-500 outline-none min-h-[80px]"
                placeholder="Explique o motivo da sobra ou falta..."
              />
            </div>
          )}
        </div>

        {/* Cards Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
            Maquininhas de Cartao
            <span className="text-xs normal-case text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
              Valor do VISOR
            </span>
          </h3>

          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Digite o valor <strong>ACUMULADO</strong> que aparece no visor da maquininha. O sistema calculara automaticamente o valor real deste turno.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stone (Acumulado do Dia)</label>
              <input
                type="number"
                step="0.01"
                name="stone_cumulative"
                required
                value={formData.stone_cumulative}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: 1540.50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">PagBank (Acumulado do Dia)</label>
              <input
                type="number"
                step="0.01"
                name="pagbank_cumulative"
                required
                value={formData.pagbank_cumulative}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: 890.20"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">PIX (Total deste Turno)</label>
              <input
                type="number"
                step="0.01"
                name="pix"
                required
                value={formData.pix}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            "Processando..."
          ) : (
            <>
              <Save className="w-5 h-5" />
              Fechar Turno
            </>
          )}
        </button>
      </form>
    </div>
  );
};
