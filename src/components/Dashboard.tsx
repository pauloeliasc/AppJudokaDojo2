import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import Sidebar from './Sidebar';
import AdminView from './views/AdminView';
import ProfessorView from './views/ProfessorView';
import StudentView from './views/StudentView';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Users, Calendar, Wallet, Trophy, UserCircle, GraduationCap, FileText, Clock, Menu, Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';

import ProfileView from './views/ProfileView';
import ResponsibleView from './views/ResponsibleView';
import PWAInstallPrompt from './modules/PWAInstallPrompt';
import EventsView from './views/EventsView';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  if (!user) return null;

  const items = [
    { id: 'home', icon: Home, label: 'Início', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'events', icon: Megaphone, label: 'Mural de Eventos', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'members', icon: Users, label: 'Alunos', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'finance', icon: Wallet, label: 'Financeiro', roles: [UserRole.ADMIN] },
    { id: 'classes', icon: Calendar, label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'reports', icon: FileText, label: 'Relatórios', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'profile', icon: UserCircle, label: 'Dados Pessoais', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'payments', icon: Wallet, label: 'Pagamentos', roles: [UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'history', icon: Clock, label: 'Histórico', roles: [UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'graduation', icon: GraduationCap, label: 'Exame de Faixa', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT, UserRole.RESPONSIBLE] },
    { id: 'ranking', icon: Trophy, label: 'Ranking', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT, UserRole.RESPONSIBLE] },
  ];

  const bottomNavItems = items.filter(item => item.roles.includes(user.role)).slice(0, 5);

  const renderView = () => {
    if (activeTab === 'profile') return <ProfileView />;
    if (activeTab === 'events') return <EventsView />;
    
    switch (user.role) {
      case UserRole.ADMIN:
        return <AdminView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.PROFESSOR:
        return <ProfessorView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.STUDENT:
        return <StudentView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.RESPONSIBLE:
        return <ResponsibleView activeTab={activeTab} setActiveTab={setActiveTab} />;
      default:
        return <div className="p-8">Acesso não autorizado.</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 md:pb-0">
      <Sidebar 
        role={user.role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        logout={logout}
        userName={user.name}
      />
      
      <main className="flex-1 md:ml-20 lg:ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-10">
          {activeTab === 'home' && <PWAInstallPrompt />}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 z-50 flex justify-around items-center safe-bottom shadow-2xl rounded-t-3xl">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all active:scale-90",
              activeTab === item.id ? "text-indigo-600" : "text-slate-400"
            )}
          >
            <item.icon className={cn("w-6 h-6", activeTab === item.id && "fill-indigo-600/10")} />
            <span className="text-[10px] font-bold tracking-tighter">{item.label}</span>
          </button>
        ))}
        {/* Full Menu Button for remaining items */}
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-90",
            activeTab === 'profile' ? "text-indigo-600" : "text-slate-400"
          )}
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-tighter">Mais</span>
        </button>
      </nav>
    </div>
  );
}
