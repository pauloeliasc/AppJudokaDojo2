import React from 'react';
import { UserRole } from '../types';
import { Home, Users, Calendar, Wallet, Trophy, UserCircle, LogOut, GraduationCap, FileText, Clock, Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logout: () => void;
  userName: string;
}

export default function Sidebar({ role, activeTab, setActiveTab, logout, userName }: SidebarProps) {
  const items = [
    { id: 'home', icon: Home, label: 'Início', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT] },
    { id: 'events', icon: Megaphone, label: 'Mural de Eventos', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT] },
    { id: 'members', icon: Users, label: 'Alunos', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'family', icon: Users, label: 'Minha Família', roles: [UserRole.STUDENT] },
    { id: 'finance', icon: Wallet, label: 'Financeiro', roles: [UserRole.ADMIN] },
    { id: 'classes', icon: Calendar, label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'reports', icon: FileText, label: 'Relatórios', roles: [UserRole.ADMIN, UserRole.PROFESSOR] },
    { id: 'profile', icon: UserCircle, label: 'Dados Pessoais', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT] },
    { id: 'payments', icon: Wallet, label: 'Pagamentos', roles: [UserRole.STUDENT] },
    { id: 'history', icon: Clock, label: 'Histórico', roles: [UserRole.STUDENT] },
    { id: 'graduation', icon: GraduationCap, label: 'Exame de Faixa', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT] },
    { id: 'ranking', icon: Trophy, label: 'Conquistas', roles: [UserRole.ADMIN, UserRole.PROFESSOR, UserRole.STUDENT] },
    { id: 'settings', icon: UserCircle, label: 'Configurações', roles: [UserRole.ADMIN] },
  ];

  const filteredItems = items.filter(item => item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 h-full hidden md:flex flex-col w-20 lg:w-64 bg-slate-900 text-white z-40 transition-all duration-300 shadow-xl">
      <div className="flex flex-col h-full safe-top safe-bottom py-6">
        <div className="px-4 lg:px-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-700/30 shrink-0 overflow-hidden">
              <img 
                src="./logo.png" 
                alt="Judoka Dojô" 
                className="w-9 h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-white hidden lg:block">Judoka Dojô</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 lg:px-4 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex lg:flex-row flex-col items-center gap-1 lg:gap-3 px-1 lg:px-4 py-3 rounded-lg font-medium transition-all group",
                activeTab === item.id 
                  ? "bg-white/10 text-white" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activeTab === item.id ? "text-indigo-400" : "group-hover:scale-110 transition-transform")} />
              <span className="text-[9px] lg:text-sm font-bold lg:font-medium whitespace-nowrap overflow-hidden text-center lg:text-left w-full lg:w-auto">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2 lg:px-6 pt-6 border-t border-white/5 space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col hidden lg:flex overflow-hidden">
              <span className="font-bold text-xs lg:text-sm text-white truncate">{userName}</span>
              <span className="text-[8px] lg:text-[10px] uppercase tracking-widest font-bold text-slate-500 truncate">{role}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex lg:flex-row flex-col items-center gap-1 lg:gap-3 px-1 lg:px-4 py-3 rounded-lg font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
            <span className="text-[9px] lg:text-sm">Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
