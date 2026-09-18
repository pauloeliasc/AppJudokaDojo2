import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import Sidebar from './Sidebar';
import AdminView from './views/AdminView';
import ProfessorView from './views/ProfessorView';
import StudentView from './views/StudentView';
import AssistantView from './views/AssistantView';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Users, Calendar, Wallet, Trophy, UserCircle, GraduationCap, 
  FileText, Clock, Menu, Megaphone, Settings as SettingsIcon, X, LogOut, ChevronRight 
} from 'lucide-react';
import { cn } from '../lib/utils';

import ProfileView from './views/ProfileView';
import PWAInstallPrompt from './modules/PWAInstallPrompt';
import EventsView from './views/EventsView';

export default function Dashboard() {
  const { user, logout, activeProfileId, setActiveProfileId, availableProfiles } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const items = [
    { id: 'home', icon: Home, label: 'Início', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'events', icon: Megaphone, label: 'Mural de Eventos', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'members', icon: Users, label: 'Alunos', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT] },
    { id: 'family', icon: Users, label: 'Minha Família', roles: [UserRole.STUDENT] },
    { id: 'finance', icon: Wallet, label: 'Financeiro', roles: [UserRole.ADMIN] },
    { id: 'classes', icon: Calendar, label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT] },
    { id: 'reports', icon: FileText, label: 'Relatórios', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'graduation', icon: GraduationCap, label: 'Exame de Faixa', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'ranking', icon: Trophy, label: 'Conquistas', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'history', icon: Clock, label: 'Histórico', roles: [UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'profile', icon: UserCircle, label: 'Dados Pessoais', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.ASSISTANT, UserRole.STUDENT] },
    { id: 'settings', icon: SettingsIcon, label: 'Configurações', roles: [UserRole.ADMIN] },
  ];

  const allowedItems = items.filter(item => item.roles.includes(user.role));

  // Determine the 4 primary tabs for the mobile bottom bar based on user role
  const getPrimaryBottomIds = (): string[] => {
    switch (user.role) {
      case UserRole.ADMIN:
        return ['home', 'members', 'finance', 'classes'];
      case UserRole.PROFESSOR:
        return ['home', 'members', 'classes', 'reports'];
      case UserRole.ASSISTANT:
        return ['home', 'members', 'classes', 'graduation'];
      case UserRole.STUDENT:
        return ['home', 'events', 'family', 'ranking'];
      default:
        return ['home', 'events', 'profile'];
    }
  };

  const primaryIds = getPrimaryBottomIds();
  const bottomNavItems = allowedItems.filter(item => primaryIds.includes(item.id));
  const isSecondaryTabActive = !primaryIds.includes(activeTab);
  const currentTabItem = items.find(item => item.id === activeTab);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Administrador';
      case UserRole.PROFESSOR: return 'Professor / Sensei';
      case UserRole.ASSISTANT: return '🥋 Ajudante';
      case UserRole.STUDENT: return 'Aluno';
      default: return 'Usuário';
    }
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderView = () => {
    if (activeTab === 'profile') return <ProfileView />;
    if (activeTab === 'events') return <EventsView />;
    
    switch (user.role) {
      case UserRole.ADMIN:
        return <AdminView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.PROFESSOR:
        return <ProfessorView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.ASSISTANT:
        return <AssistantView activeTab={activeTab} setActiveTab={setActiveTab} />;
      case UserRole.STUDENT:
        return <StudentView activeTab={activeTab} setActiveTab={setActiveTab} />;
      default:
        return <div className="p-8">Acesso não autorizado.</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 md:pb-0">
      <Sidebar 
        role={user.role} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        logout={logout}
        userName={user.name}
      />

      {/* Mobile Top Header Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/20">
            <img 
              src="./logo.png" 
              alt="Judoka Dojô" 
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">Judoka Dojô</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {currentTabItem?.label || 'Início'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
          aria-label="Menu de Navegação"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer / Menu Modal */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Drawer Sheet */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative bg-white rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 overflow-hidden"
            >
              {/* Drag Pill */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* User Profile Bar inside drawer */}
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{user.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Family Accounts Switcher inside drawer */}
              {availableProfiles.length > 1 && user.role === UserRole.STUDENT && (
                <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1.5">
                    Trocar Perfil da Família:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                    {availableProfiles.map((p, idx) => {
                      const isSelected = (activeProfileId || user.id) === p.id;
                      return (
                        <button
                          key={`${p.id}-${idx}`}
                          onClick={() => {
                            setActiveProfileId(p.id);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between",
                            isSelected 
                              ? "bg-indigo-600 text-white shadow-xs" 
                              : "bg-white text-slate-700 hover:bg-white/80 border border-indigo-100/50"
                          )}
                        >
                          <span>{p.fullName}</span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase",
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            Faixa {p.currentGrade || 'Branca'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Navigation Links */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Menu Completo</p>
                {allowedItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all",
                        isActive 
                          ? "bg-indigo-50 text-indigo-900 border border-indigo-200/60 font-black" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-300")} />
                    </button>
                  );
                })}
              </div>

              {/* Logout Button */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 safe-bottom">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Main Content Area with Mobile Top Padding */}
      <main className="flex-1 md:ml-20 lg:ml-64 min-h-screen pt-16 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-10">
          {/* Family Profiles Switcher widget for Desktop */}
          {availableProfiles.length > 1 && user.role === UserRole.STUDENT && (
            <div className="hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-indigo-50 to-indigo-50/50 border border-indigo-100 p-4 rounded-3xl mb-6 gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Contas da Família</span>
                  <p className="text-xs text-slate-600 font-medium">Você está visualizando o perfil de <span className="font-extrabold text-indigo-950">{user.name}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Alterar Perfil:</span>
                <select
                  value={activeProfileId || ''}
                  onChange={(e) => setActiveProfileId(e.target.value)}
                  className="w-full sm:w-auto bg-white border-2 border-indigo-100 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-950 outline-none transition-all shadow-sm cursor-pointer"
                >
                  {availableProfiles.map((p, idx) => (
                    <option key={`${p.id}-${idx}`} value={p.id}>
                      {p.fullName} (Faixa {p.currentGrade || 'Branca'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 z-40 flex justify-around items-center safe-bottom shadow-2xl rounded-t-3xl">
        {bottomNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all active:scale-90 min-w-[58px]",
                isActive ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 stroke-[2.5]")} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Full Menu Button ("Mais") */}
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all active:scale-90 relative min-w-[58px]",
            isSecondaryTabActive || mobileMenuOpen ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"
          )}
        >
          <div className="relative">
            <Menu className={cn("w-5 h-5 transition-transform", (isSecondaryTabActive || mobileMenuOpen) && "scale-110 stroke-[2.5]")} />
            {isSecondaryTabActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Mais</span>
        </button>
      </nav>
    </div>
  );
}

