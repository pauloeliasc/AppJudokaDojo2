import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, collectionGroup, orderBy } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Presence, Payment } from '../../types';
import { Users, Calendar, Trophy, Clock, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import MemberManagement from '../modules/MemberManagement';
import ClassManagement from '../modules/ClassManagement';
import GraduationView from './GraduationView';
import StudentAchievements from './StudentAchievements';
import PresenceReport from '../modules/PresenceReport';
import TodayClasses from '../modules/TodayClasses';
import AnalyticsDashboard from '../modules/AnalyticsDashboard';
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

  useEffect(() => {
    if (!user) return;
    
    const profileId = user.id || user.uid || '';
    if (!profileId || profileId === 'undefined') return;

    const unsubProfile = onSnapshot(doc(db, 'profiles', profileId), (doc) => {
      if (doc.exists()) setProfile({ id: doc.id, ...doc.data() } as Profile);
    });

    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      setProfiles(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession)));
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    });

    const unsubPresences = onSnapshot(
      collectionGroup(db, 'presences'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Presence));
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

  if (activeTab === 'home') return <ProfessorHome profiles={profiles} classes={classes} schedules={schedules} profile={profile} payments={payments} />;
  if (activeTab === 'members') return <MemberManagement profiles={profiles} payments={payments} />;
  if (activeTab === 'classes') return <ClassManagement classes={classes} profiles={profiles} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'ranking') return <StudentAchievements />;
  if (activeTab === 'reports') return <PresenceReport presences={allPresences} profiles={profiles} classes={classes} payments={payments} />;

  return <div>Em breve: {activeTab}</div>;
}

function ProfessorHome({ profiles, classes, schedules, profile, payments }: { profiles: Profile[], classes: ClassSession[], schedules: Schedule[], profile: Profile | null, payments: Payment[] }) {
  const totalStudents = profiles.filter(p => !p.role || p.role === UserRole.STUDENT).length;

  return (
    <div className="space-y-10">
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

      <TodayClasses profile={profile} classes={classes} schedules={schedules} />

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
             classes.slice(0, 3).map(c => (
              <div key={c.id} className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors group">
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
