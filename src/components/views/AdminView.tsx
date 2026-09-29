import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, collectionGroup, orderBy } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Payment, Settings, Schedule, Presence } from '../../types';
import { Users, Calendar, Wallet, Plus, Trash2, CheckCircle, Clock, GraduationCap, Activity, Megaphone, Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import MemberManagement from '../modules/MemberManagement';
import FinanceManagement from '../modules/FinanceManagement';
import ClassManagement from '../modules/ClassManagement';
import SettingsPanel from '../modules/SettingsPanel';
import GraduationView from './GraduationView';
import StudentAchievements from './StudentAchievements';
import TodayClasses from '../modules/TodayClasses';
import AnalyticsDashboard from '../modules/AnalyticsDashboard';
import PresenceReport from '../modules/PresenceReport';
import BirthdaysBoard from '../modules/BirthdaysBoard';
import FamilyManagement from './FamilyManagement';
import { FullPresenceHistory } from './StudentView';
import { useAuth } from '../../AuthContext';

export default function AdminView({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allPresences, setAllPresences] = useState<Presence[]>([]);

  useEffect(() => {
    if (!user) return;

    const profileId = user.id || user.uid || '';
    if (!profileId || profileId === 'undefined') return;

    const unsubProfile = onSnapshot(doc(db, 'profiles', profileId), (doc) => {
      if (doc.exists()) setProfile({ ...doc.data(), id: doc.id } as Profile);
    });
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const seen = new Set<string>();
      const list: Profile[] = [];
      for (const doc of snapshot.docs) {
        const item = { ...doc.data(), id: doc.id } as Profile;
        if (!item.isPointer && !seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
      setProfiles(list);
    }, (error) => {
      console.error("Profiles snapshot error:", error);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ClassSession)));
    }, (error) => {
      console.error("Classes snapshot error:", error);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    }, (error) => {
      console.error("Settings snapshot error:", error);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment)));
    }, (error) => {
      console.error("Payments snapshot error:", error);
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Schedule)));
    });

    const unsubPresences = onSnapshot(
      collectionGroup(db, 'presences'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Presence));
        list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setAllPresences(list);
      }
    );

    return () => {
      unsubProfile();
      unsubProfiles();
      unsubClasses();
      unsubSettings();
      unsubPayments();
      unsubSchedules();
      unsubPresences();
    };
  }, [user]);

  if (activeTab === 'home') return <AdminHome profiles={profiles} classes={classes} payments={payments} schedules={schedules} profile={profile} settings={settings} allPresences={allPresences} setActiveTab={setActiveTab} />;
  if (activeTab === 'members') return <MemberManagement profiles={profiles} payments={payments} />;
  if (activeTab === 'finance') return <FinanceManagement profiles={profiles} payments={payments} settings={settings} />;
  if (activeTab === 'classes') return <ClassManagement classes={classes} profiles={profiles} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'ranking') return <StudentAchievements />;
  if (activeTab === 'reports') return <PresenceReport presences={allPresences} profiles={profiles} classes={classes} payments={payments} settings={settings} />;
  if (activeTab === 'settings') return <SettingsPanel settings={settings} />;
  if (activeTab === 'history') return <FullPresenceHistory presences={allPresences} classes={classes} />;
  if (activeTab === 'family') return <FamilyManagement />;

  return <div>Em breve: {activeTab}</div>;
}

function AdminHome({ 
  profiles, 
  classes, 
  payments, 
  schedules, 
  profile, 
  settings,
  allPresences,
  setActiveTab
}: { 
  profiles: Profile[], 
  classes: ClassSession[], 
  payments: Payment[], 
  schedules: Schedule[], 
  profile: Profile | null, 
  settings: Settings | null,
  allPresences: Presence[],
  setActiveTab: (t: string) => void
}) {
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  
  const activeProfiles = profiles.filter(p => !p.status || p.status === 'active');
  const totalStudents = activeProfiles.filter(p => !p.role || p.role === UserRole.STUDENT).length;
  const totalProfessors = activeProfiles.filter(p => p.role === UserRole.PROFESSOR).length;
  const totalAdmins = activeProfiles.filter(p => p.role === UserRole.ADMIN).length;

  const todayDateStr = new Date().getFullYear() + '-' + 
    String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
    String(new Date().getDate()).padStart(2, '0');

  const totalAllCheckIns = allPresences.length;
  const todayCheckIns = allPresences.filter(p => 
    (p.checkInDate && p.checkInDate === todayDateStr) || 
    (p.timestamp && p.timestamp.startsWith(todayDateStr))
  ).length;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 overflow-hidden shrink-0">
            <img 
              src="./logo.png" 
              alt="Judoka Dojô" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Painel Geral</h2>
            <p className="text-slate-500 text-sm mt-1">Bem-vindo ao Judoka Dojô • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm text-sm font-medium">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             Sistema Online
          </div>
        </div>
      </header>

      {/* Prominent Attendance & Dojo Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('reports')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Check-ins</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-600 leading-none">{totalAllCheckIns}</span>
              <span className="text-xs font-bold text-slate-500">presenças</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Todos os check-ins dos usuários
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Presenças Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-600 leading-none">{todayCheckIns}</span>
              <span className="text-xs font-bold text-slate-500">hoje</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Alunos presentes no tatame
            </p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('members')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Alunos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-blue-600 leading-none">{totalStudents}</span>
              <span className="text-xs font-bold text-slate-500">ativos</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {totalProfessors} professores • {totalAdmins} admin
            </p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('finance')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mensalidades</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-600 leading-none">{pendingPayments}</span>
              <span className="text-xs font-bold text-slate-500">pendentes</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Acompanhamento financeiro
            </p>
          </div>
        </div>
      </div>

      {/* Immediate Check-in & Classes of Today */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              Aulas & Controle de Presença de Hoje
            </h3>
          </div>
          <span className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer" onClick={() => setActiveTab('classes')}>
            Ver grade completa →
          </span>
        </div>
        <TodayClasses profile={profile} classes={classes} schedules={schedules} />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-indigo-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 pointer-events-none">
            <Users className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-indigo-600 transition-colors pointer-events-none">Alunos</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Gerenciar</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-emerald-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 pointer-events-none">
            <Wallet className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-emerald-600 transition-colors pointer-events-none">Financeiro</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Mensalidades</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-blue-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 pointer-events-none">
            <Calendar className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-blue-600 transition-colors pointer-events-none">Agenda</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Aulas & Treinos</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-violet-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2 pointer-events-none">
            <Activity className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-violet-600 transition-colors pointer-events-none">Relatórios</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Presenças & PDF</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('graduation')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-amber-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 pointer-events-none">
            <GraduationCap className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-amber-600 transition-colors pointer-events-none">Graduação</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Exame Faixa</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-pink-50/50 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-2 pointer-events-none">
            <Megaphone className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-pink-600 transition-colors pointer-events-none">Eventos</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Mural do Dojô</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-slate-100 transition-colors text-left flex flex-col justify-between group touch-manipulation select-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2 pointer-events-none">
            <SettingsIcon className="w-4 h-4 pointer-events-none" />
          </div>
          <div className="pointer-events-none">
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-slate-900 transition-colors pointer-events-none">Ajustes</span>
            <span className="text-[10px] text-slate-400 font-medium pointer-events-none">Configurações</span>
          </div>
        </button>
      </div>

      <BirthdaysBoard profiles={profiles} />

      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Indicadores & Analytics</h3>
        </div>
        <AnalyticsDashboard 
          initialProfiles={profiles}
          initialClasses={classes}
          initialPayments={payments}
          initialSettings={settings}
        />
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900">
           Atividades Recentes
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
             <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                <Clock className="w-5 h-5 text-slate-400" />
             </div>
             <div>
                <p className="text-sm font-medium text-slate-600 italic">O sistema está pronto para uso. Oss!</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number | string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm hover:shadow-md transition-all group">
      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
