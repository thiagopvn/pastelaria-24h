import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminLiveMonitor } from '../components/AdminLiveMonitor';
import { ProductManager } from '../components/ProductManager';
import { ShiftHistory } from '../components/ShiftHistory';
import { UserManager } from '../components/UserManager';
import { GlobalSettings } from '../components/GlobalSettings';
import { FinancialControl } from '../components/FinancialControl';
import { WeeklyReport } from '../components/WeeklyReport';
import { LayoutDashboard, LogOut, Package, History, BarChart3, Menu, Users, Settings, Wallet, FileText } from 'lucide-react';
import { auth } from '../lib/firebase';

type AdminView = 'monitor' | 'products' | 'history' | 'users' | 'settings' | 'financial' | 'reports';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AdminView>('monitor');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: AdminView, icon: any, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-all ${
        currentView === view 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 p-4 flex justify-between items-center border-b border-slate-800">
        <h1 className="font-bold text-white text-lg">Pastel24h <span className="text-emerald-500">Admin</span></h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform z-20 overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-emerald-500" />
            Pastel24h
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem view="monitor" icon={BarChart3} label="Monitoramento" />
          <NavItem view="financial" icon={Wallet} label="Controle Financeiro" />
          <NavItem view="reports" icon={FileText} label="Relatórios Semanais" />
          <NavItem view="history" icon={History} label="Histórico de Turnos" />
          <div className="pt-4 pb-2">
             <span className="px-4 text-xs font-bold text-slate-500 uppercase">Gestão</span>
          </div>
          <NavItem view="products" icon={Package} label="Produtos & Estoque" />
          <NavItem view="users" icon={Users} label="Colaboradores" />
          <NavItem view="settings" icon={Settings} label="Configurações" />
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-500">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            {currentView === 'monitor' && 'Visão Geral'}
            {currentView === 'products' && 'Gestão de Produtos'}
            {currentView === 'history' && 'Histórico Financeiro'}
            {currentView === 'users' && 'Equipe & Acessos'}
            {currentView === 'settings' && 'Configurações'}
            {currentView === 'financial' && 'Controle Financeiro'}
            {currentView === 'reports' && 'Relatórios Semanais'}
          </h2>
          <p className="text-slate-400">
            {currentView === 'monitor' && 'Acompanhe a operação em tempo real.'}
            {currentView === 'products' && 'Gerencie o cardápio e preços.'}
            {currentView === 'history' && 'Auditoria de fechamentos e correções.'}
            {currentView === 'users' && 'Gerencie quem pode acessar o sistema.'}
            {currentView === 'financial' && 'Fluxo de caixa, envelopes e pagamentos.'}
            {currentView === 'reports' && 'Folha de pagamento e consumo de equipe.'}
          </p>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
          {currentView === 'monitor' && <AdminLiveMonitor />}
          {currentView === 'products' && <ProductManager />}
          {currentView === 'history' && <ShiftHistory />}
          {currentView === 'users' && <UserManager />}
          {currentView === 'settings' && <GlobalSettings />}
          {currentView === 'financial' && <FinancialControl />}
          {currentView === 'reports' && <WeeklyReport />}
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
