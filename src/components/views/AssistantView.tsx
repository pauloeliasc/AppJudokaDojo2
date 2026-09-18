import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, onSnapshot, collectionGroup, query, where } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Presence, Payment, Schedule } from '../../types';
import { Users, Calendar, Trophy, Clock, UserPlus, CheckCircle2, ShieldCheck, ArrowRight, GraduationCap } from 'lucide-react';
import MemberManagement from '../modules/MemberManagement';
import ClassManagement from '../modules/ClassManagement';
import GraduationView from './GraduationView';
import StudentAchievements from './StudentAchievements';
import TodayClasses from '../modules/TodayClasses';
import { FullPresenceHistory } from './StudentView';
import { useAuth } from '../../AuthContext';

export default function AssistantView({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [allPresences, setAllPresences] = useState<Presence[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const profileId = user.id || user.uid || '';
    if (!profileId || profileId === 'undefined') return;

    const unsubProfile = onSnapshot(doc(db, 'profiles', profileId), (docSnap) => {
      if (docSnap.exists()) setProfile({ ...docSnap.data(), id: docSnap.id } as Profile);
    });

    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const seen = new Set<string>();
      const list: Profile[] = [];
      for (const d of snapshot.docs) {
        const item = { ...d.data(), id: d.id } as Profile;
        if (!item.isPointer && !seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
      setProfiles(list);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payment)));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ClassSession)));
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Schedule)));
    });

    const unsubPresences = onSnapshot(
      collectionGroup(db, 'presences'),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Presence));
        list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setAllPresences(list);
      }
    );

    return () => {
      unsubProfile();
      unsubProfiles();
      unsubPayments();
      unsubClasses();
      unsubSchedules();
      unsubPresences();
    };
  }, [user]);

  if (activeTab === 'home') {
    return (
      <AssistantHome 
        profiles={profiles} 
        classes={classes} 
        schedules={schedules} 
        profile={profile} 
        presences={allPresences}
        setActiveTab={setActiveTab} 
      />
    );
  }
  if (activeTab === 'members') return <MemberManagement profiles={profiles} payments={payments} />;
  if (activeTab === 'classes') return <ClassManagement classes={classes} profiles={profiles} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'ranking') return <StudentAchievements profileId={profile?.id} />;
  if (activeTab === 'history') {
    const myPresences = allPresences.filter(p => p.memberId === profile?.id);
    return <FullPresenceHistory presences={myPresences} classes={classes} />;
  }

  return <div>Em breve: {activeTab}</div>;
}

function AssistantHome({ 
  profiles, 
  classes, 
  schedules, 
  profile, 
  presences,
  setActiveTab 
}: { 
  profiles: Profile[], 
  classes: ClassSession[], 
  schedules: Schedule[], 
  profile: Profile | null, 
  presences: Presence[],
  setActiveTab: (t: string) => void 
}) {
  const activeStudents = profiles.filter(p => (!p.role || p.role === UserRole.STUDENT) && p.status !== 'inactive' && p.status !== 'suspended').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPresences = presences.filter(p => p.timestamp && p.timestamp.startsWith(todayStr)).length;
  const myPresencesCount = profile ? presences.filter(p => p.memberId === profile.id).length : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
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
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Portal do Ajudante</h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-200">
                Ajudante Oficial
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Olá, {profile?.fullName?.split(' ')[0] || 'Ajudante'} • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200/80 text-sm font-bold text-amber-900 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Acesso de Gestão de Alunos & Presenças</span>
        </div>
      </header>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          onClick={() => setActiveTab('members')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">Cadastrar Alunos</h4>
              <p className="text-[11px] text-slate-400 font-medium">Adicione novos membros ao Dojô</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div 
          onClick={() => {
            const el = document.getElementById('today-classes-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">Chamada & Presenças</h4>
              <p className="text-[11px] text-slate-400 font-medium">Registrar alunos e retroativos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </div>

        <div 
          onClick={() => setActiveTab('classes')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">Grade de Horários</h4>
              <p className="text-[11px] text-slate-400 font-medium">Consultar agenda dos treinos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Alunos Ativos</span>
            <span className="text-2xl font-black text-slate-900">{activeStudents}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Presenças Hoje</span>
            <span className="text-2xl font-black text-slate-900">{todayPresences}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Minhas Presenças</span>
            <span className="text-2xl font-black text-slate-900">{myPresencesCount} treinos</span>
          </div>
        </div>
      </div>

      {/* Main Today Classes Module */}
      <div id="today-classes-section">
        <TodayClasses profile={profile} classes={classes} schedules={schedules} />
      </div>
    </div>
  );
}
