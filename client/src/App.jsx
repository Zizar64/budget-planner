import React from 'react';
import { Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wallet, CreditCard, PiggyBank, Calendar, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { BudgetProvider } from './context/BudgetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

import TransactionManager from './components/Transactions/TransactionManager';
import BudgetPlanner from './components/Budget/BudgetPlanner';
import SavingsPlanner from './components/Savings/SavingsPlanner';
import MonthlyActivity from './components/Activity/MonthlyActivity';
import Settings from './components/Settings/Settings';

const NavItem = ({ to, icon: Icon, label }) => {
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
      {/* Sidebar */}
      <nav className="w-64 border-r border-[var(--border-color)] p-6 flex flex-col gap-8 bg-[var(--bg-secondary)]">
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
            onClick={logout}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
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
