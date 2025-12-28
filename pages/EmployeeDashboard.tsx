import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import firebase from 'firebase/compat/app';
import { CashRegister } from '../components/CashRegister';
import { TeamManager } from '../components/TeamManager';
import { OpenShiftModal } from '../components/OpenShiftModal';
import {
  LogOut, ShoppingBag, Coffee, UtensilsCrossed, Tag, Users,
  ArrowDownCircle, X, AlertTriangle, Wallet
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  reason: string;
  timestamp: any;
}

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Product & Sales State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Withdrawals State (Real-time)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');

  // View State
  const [activeTab, setActiveTab] = useState<'sales' | 'team'>('sales');

  // Listen for user's active shift
  useEffect(() => {
    if (!user) return;
    const unsubscribe = db.collection('shifts')
      .where('userId', '==', user.uid)
      .where('status', '==', 'open')
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setActiveShift({ id: docData.id, ...docData.data() });
        } else {
          setActiveShift(null);
        }
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  // Listen for withdrawals (real-time)
  useEffect(() => {
    if (!activeShift?.id) {
      setWithdrawals([]);
      return;
    }

    const unsubscribe = db.collection('shifts')
      .doc(activeShift.id)
      .collection('withdrawals')
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Withdrawal[];
        setWithdrawals(items);
      });

    return () => unsubscribe();
  }, [activeShift?.id]);

  // Fetch Products
  useEffect(() => {
    const unsubscribe = db.collection('products').onSnapshot((snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

  // Calculate total withdrawals
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  // Calculate drawer total (initial + sales - withdrawals)
  const drawerTotal = activeShift
    ? activeShift.initialCash + activeShift.salesCash - totalWithdrawals
    : 0;

  const handleStartShift = async (initialCash: number) => {
    if (!user) return;
    try {
      await db.collection('shifts').add({
        userId: user.uid,
        userName: user.displayName || user.email,
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'open',
        initialCash: initialCash,
        salesCash: 0,
        totalWithdrawals: 0,
        financialConfirmed: false,
      });
      setShowOpenModal(false);
    } catch (e) {
      alert("Erro ao abrir turno");
    }
  };

  const handleProductClick = async (product: Product) => {
    if (!activeShift) return;
    const confirmSale = window.confirm(`Registrar venda de 1x ${product.name} (R$ ${product.price.toFixed(2)}) em DINHEIRO?`);
    if (!confirmSale) return;

    try {
      await db.collection('shifts').doc(activeShift.id).collection('records').add({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        priceAtSale: product.price,
        total: product.price,
        type: 'sale',
        paymentMethod: 'cash',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao registrar venda");
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Digite um valor valido");
      return;
    }
    if (!withdrawalReason.trim()) {
      alert("Informe o motivo da sangria");
      return;
    }
    if (amount > drawerTotal) {
      alert("Valor da sangria maior que o disponivel na gaveta");
      return;
    }

    try {
      await db.collection('shifts').doc(activeShift.id).collection('withdrawals').add({
        amount: amount,
        reason: withdrawalReason.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        registeredBy: user?.uid
      });

      // Update total withdrawals on shift document for easy querying
      await db.collection('shifts').doc(activeShift.id).update({
        totalWithdrawals: firebase.firestore.FieldValue.increment(amount)
      });

      setWithdrawalAmount('');
      setWithdrawalReason('');
      setShowWithdrawalModal(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao registrar sangria");
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-full" />
          <span className="text-slate-400">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 p-4 flex justify-between items-center shadow-md sticky top-0 z-10 border-b border-slate-800">
        <h1 className="font-bold text-white text-lg">Pastel24h <span className="text-emerald-500">PDV</span></h1>
        <div className="flex items-center gap-4">
          {activeShift && (
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Gaveta</p>
                <p className="font-bold text-emerald-400">R$ {drawerTotal.toFixed(2)}</p>
              </div>
              {totalWithdrawals > 0 && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Sangrias</p>
                  <p className="font-bold text-amber-400">- R$ {totalWithdrawals.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
          <button onClick={() => auth.signOut()} className="p-2 text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 w-full max-w-5xl mx-auto flex flex-col gap-6">
        {/* No Active Shift */}
        {!activeShift ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <ShoppingBag className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-xl font-medium text-white">Turno Fechado</h2>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
            >
              Iniciar Operacao
            </button>
            {showOpenModal && (
              <OpenShiftModal
                onConfirm={handleStartShift}
                onCancel={() => setShowOpenModal(false)}
              />
            )}
          </div>
        ) : showCloseModal ? (
          /* Cash Register View */
          <div>
            <button
              onClick={() => setShowCloseModal(false)}
              className="mb-4 text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              &larr; Voltar para Vendas
            </button>
            <CashRegister
              shiftId={activeShift.id}
              initialCash={activeShift.initialCash}
              currentSalesCash={activeShift.salesCash}
              currentWithdrawals={totalWithdrawals}
              onCloseSuccess={() => setShowCloseModal(false)}
            />
          </div>
        ) : (
          /* Main Sales View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">

            {/* Left Col: Main Content (Sales or Team) */}
            <div className="md:col-span-2 space-y-4">

              {/* Tabs */}
              <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'sales' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Tag className="w-4 h-4" /> Vendas
                </button>
                <button
                  onClick={() => setActiveTab('team')}
                  className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Users className="w-4 h-4" /> Equipe & Consumo
                </button>
              </div>

              {activeTab === 'sales' ? (
                <>
                  {/* Category Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {cat === 'all' ? 'Todos' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Product Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4 rounded-xl flex flex-col items-start gap-2 transition-all active:scale-95 text-left"
                      >
                        <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 mb-1">
                          {product.category === 'bebidas' ? <Coffee className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-200 line-clamp-1">{product.name}</h3>
                          <p className="text-emerald-400 font-bold">R$ {product.price.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full text-center py-12 text-slate-500">
                        Nenhum produto nesta categoria
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <TeamManager shiftId={activeShift.id} products={products} />
              )}
            </div>

            {/* Right Col: Shift Summary */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg sticky top-24">
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Resumo do Turno
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Fundo de Caixa</span>
                    <span>R$ {activeShift.initialCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>Vendas (Dinheiro)</span>
                    <span>+ R$ {activeShift.salesCash.toFixed(2)}</span>
                  </div>
                  {totalWithdrawals > 0 && (
                    <div className="flex justify-between items-center text-amber-400 font-bold">
                      <span>Sangrias ({withdrawals.length})</span>
                      <span>- R$ {totalWithdrawals.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-700 my-2" />
                  <div className="flex justify-between items-center text-white font-bold text-xl">
                    <span>Total Gaveta</span>
                    <span>R$ {drawerTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Withdrawal History (collapsed) */}
                {withdrawals.length > 0 && (
                  <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Sangrias do Turno</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {withdrawals.map(w => (
                        <div key={w.id} className="flex justify-between text-xs">
                          <span className="text-slate-400 truncate max-w-[60%]">{w.reason}</span>
                          <span className="text-amber-400 font-bold">- R$ {w.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowDownCircle className="w-5 h-5" />
                    Registrar Sangria
                  </button>
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Fechar Caixa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-amber-500" />
                Registrar Sangria
              </h3>
              <button onClick={() => setShowWithdrawalModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-bold">Sangria = Retirada de dinheiro</p>
                  <p className="text-amber-300/70">Use para pagamentos, trocos, etc. Sera descontado do caixa.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Valor da Retirada</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={withdrawalAmount}
                    onChange={e => setWithdrawalAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Disponivel na gaveta: R$ {drawerTotal.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Motivo da Sangria</label>
                <input
                  type="text"
                  value={withdrawalReason}
                  onChange={e => setWithdrawalReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Pagamento fornecedor, Troco..."
                />
              </div>

              <button
                onClick={handleWithdrawal}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Confirmar Sangria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
