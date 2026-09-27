import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, collectionGroup, orderBy } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Presence, Payment, Settings } from '../../types';
import { Users, Calendar, Trophy, Clock, FileText, GraduationCap, Megaphone, Activity, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import MemberManagement from '../modules/MemberManagement';
import ClassManagement from '../modules/ClassManagement';
import FinanceManagement from '../modules/FinanceManagement';
import GraduationView from './GraduationView';
import StudentAchievements from './StudentAchievements';
import PresenceReport from '../modules/PresenceReport';
import TodayClasses from '../modules/TodayClasses';
import AnalyticsDashboard from '../modules/AnalyticsDashboard';
import BirthdaysBoard from '../modules/BirthdaysBoard';
import FamilyManagement from './FamilyManagement';
import { FullPresenceHistory } from './StudentView';
import { useAuth } from '../../AuthContext';
import { Schedule } from '../../types';

export default function ProfessorView({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [allPresences, setAllPresences] = useState<Presence[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

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
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment)));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ClassSession)));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    }, (error) => {
      console.error("Settings snapshot error:", error);
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
      unsubPayments();
      unsubClasses();
      unsubSettings();
      unsubSchedules();
      unsubPresences();
    };
  }, [user]);

  if (activeTab === 'home') return <ProfessorHome profiles={profiles} classes={classes} schedules={schedules} profile={profile} payments={payments} setActiveTab={setActiveTab} />;
  if (activeTab === 'members') return <MemberManagement profiles={profiles} payments={payments} />;
  if (activeTab === 'classes') return <ClassManagement classes={classes} profiles={profiles} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'ranking') return <StudentAchievements />;
  if (activeTab === 'reports') return <PresenceReport presences={allPresences} profiles={profiles} classes={classes} payments={payments} />;
  if (activeTab === 'finance') return <FinanceManagement profiles={profiles} payments={payments} settings={settings} />;
  if (activeTab === 'history') return <FullPresenceHistory presences={allPresences} classes={classes} />;
  if (activeTab === 'family') return <FamilyManagement />;

  return <div>Em breve: {activeTab}</div>;
}

function ProfessorHome({ 
  profiles, 
  classes, 
  schedules, 
  profile, 
  payments,
  setActiveTab
}: { 
  profiles: Profile[], 
  classes: ClassSession[], 
  schedules: Schedule[], 
  profile: Profile | null, 
  payments: Payment[],
  setActiveTab: (t: string) => void
}) {
  const totalStudents = profiles.filter(p => !p.role || p.role === UserRole.STUDENT).length;

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
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Portal do Professor</h2>
            <p className="text-slate-500 text-sm mt-1">Bem-vindo, Sensei • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-sm font-semibold text-indigo-700">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
             Sensei Online
          </div>
        </div>
      </header>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('members')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-indigo-600 transition-colors">Alunos</span>
            <span className="text-[10px] text-slate-400 font-medium">Gestão & fichas</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-blue-600 transition-colors">Agenda</span>
            <span className="text-[10px] text-slate-400 font-medium">Grade & treinos</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-violet-600 transition-colors">Relatórios</span>
            <span className="text-[10px] text-slate-400 font-medium">Presença & PDF</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('graduation')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-amber-600 transition-colors">Graduação</span>
            <span className="text-[10px] text-slate-400 font-medium">Exames de faixa</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-pink-600 transition-colors">Eventos</span>
            <span className="text-[10px] text-slate-400 font-medium">Mural do Dojô</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-slate-900 block group-hover:text-rose-600 transition-colors">Conquistas</span>
            <span className="text-[10px] text-slate-400 font-medium">Ranking geral</span>
          </div>
        </button>
      </div>

      <TodayClasses profile={profile} classes={classes} schedules={schedules} />

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
        />
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-900">
          Próximos Treinos
        </h3>
        <div className="space-y-4">
           {classes.length > 0 ? (
             classes.slice(0, 3).map((c, idx) => (
              <div key={`${c.id}-${idx}`} className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors group">
                <div>
                  <p className="font-bold text-slate-800">{c.title || 'Treino Geral'}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">{new Date(c.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-colors shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            ))
           ) : (
             <p className="text-slate-400 text-sm italic">Nenhum treino agendado para o momento.</p>
           )}
        </div>
      </div>
    </div>
  );
}
