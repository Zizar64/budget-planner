import React from 'react';
import { Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, PiggyBank, Calendar, LogOut, Settings as SettingsIcon, LucideIcon } from 'lucide-react';
import { BudgetProvider } from './context/BudgetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

import TransactionManager from './components/Transactions/TransactionManager';
import BudgetPlanner from './components/Budget/BudgetPlanner';
import SavingsPlanner from './components/Savings/SavingsPlanner';
import MonthlyActivity from './components/Activity/MonthlyActivity';
import Settings from './components/Settings/Settings';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string | React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const ProtectedLayout = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 border-r border-[var(--border-color)] p-6 flex-col gap-8 bg-[var(--bg-secondary)] fixed h-full z-20">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="font-bold text-white">B</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Budget<span className="text-indigo-400">Planner</span></span>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <NavItem to="/" icon={LayoutDashboard} label="Tableau de bord" />
          <NavItem to="/activity" icon={Calendar} label="Activités" />
          <NavItem to="/transactions" icon={CreditCard} label="Transactions" />
          <NavItem to="/budget" icon={Wallet} label="Budget" />
          <NavItem to="/savings" icon={PiggyBank} label="Épargne" />
          <NavItem to="/settings" icon={SettingsIcon} label="Paramètres" />
        </div>

        <div className="pt-6 border-t border-[var(--border-color)]">
          <div className="px-2 mb-4 text-sm text-gray-500">
            Connecté en tant que <span className="text-indigo-400 font-medium">{user.username}</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full md:pl-64 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] px-4 py-2 flex justify-between items-center z-50 safe-area-bottom">
        <NavItem to="/" icon={LayoutDashboard} label="" />
        <NavItem to="/activity" icon={Calendar} label="" />
        <button onClick={() => window.location.href = '/transactions'} className="bg-indigo-600 p-3 rounded-full -mt-8 shadow-lg border-4 border-[var(--bg-primary)]">
          <CreditCard size={24} className="text-white" />
        </button>
        <NavItem to="/budget" icon={Wallet} label="" />
        <NavItem to="/settings" icon={SettingsIcon} label="" />
      </nav>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activity" element={<MonthlyActivity />} />
            <Route path="/transactions" element={<TransactionManager />} />
            <Route path="/budget" element={<BudgetPlanner />} />
            <Route path="/savings" element={<SavingsPlanner />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BudgetProvider>
    </AuthProvider>
  );
}

export default App;
