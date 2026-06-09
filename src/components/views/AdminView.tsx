import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs, setDoc, updateDoc, deleteDoc, collectionGroup, orderBy } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Payment, Settings, Schedule, Presence } from '../../types';
import { Users, Calendar, Wallet, Plus, Trash2, CheckCircle, Clock, GraduationCap, Activity } from 'lucide-react';
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
      if (doc.exists()) setProfile({ id: doc.id, ...doc.data() } as Profile);
    });
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      setProfiles(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer));
    }, (error) => {
      console.error("Profiles snapshot error:", error);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession)));
    }, (error) => {
      console.error("Classes snapshot error:", error);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    }, (error) => {
      console.error("Settings snapshot error:", error);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (error) => {
      console.error("Payments snapshot error:", error);
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    });

    const unsubPresences = onSnapshot(
      query(collectionGroup(db, 'presences'), orderBy('timestamp', 'desc')),
      (snapshot) => {
        setAllPresences(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Presence)));
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

  if (activeTab === 'home') return <AdminHome profiles={profiles} classes={classes} payments={payments} schedules={schedules} profile={profile} settings={settings} />;
  if (activeTab === 'members') return <MemberManagement profiles={profiles} payments={payments} />;
  if (activeTab === 'finance') return <FinanceManagement profiles={profiles} payments={payments} settings={settings} />;
  if (activeTab === 'classes') return <ClassManagement classes={classes} profiles={profiles} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'ranking') return <StudentAchievements />;
  if (activeTab === 'reports') return <PresenceReport presences={allPresences} profiles={profiles} classes={classes} payments={payments} settings={settings} />;
  if (activeTab === 'settings') return <SettingsPanel settings={settings} />;

  return <div>Em breve: {activeTab}</div>;
}

function AdminHome({ profiles, classes, payments, schedules, profile, settings }: { profiles: Profile[], classes: ClassSession[], payments: Payment[], schedules: Schedule[], profile: Profile | null, settings: Settings | null }) {
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  
  const activeProfiles = profiles.filter(p => !p.status || p.status === 'active');
  const totalStudents = activeProfiles.filter(p => !p.role || p.role === UserRole.STUDENT).length;
  const totalProfessors = activeProfiles.filter(p => p.role === UserRole.PROFESSOR).length;
  const totalAdmins = activeProfiles.filter(p => p.role === UserRole.ADMIN).length;

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
