import React, { useEffect, useState } from 'react';
import { db, auth, doc } from '../../lib/firebase';
import { updateEmail } from 'firebase/auth';
import { collection, query, onSnapshot, where, collectionGroup, orderBy } from 'firebase/firestore';
import { Profile, ClassSession, Payment, Settings, Schedule, ClassType, Presence } from '../../types';
import { Trophy, Wallet, UserCircle, Calendar, CheckCircle2, AlertCircle, Copy, Clock, Star, Activity, Loader2, Gift } from 'lucide-react';
import { cn, formatDate, getMonthName } from '../../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import GraduationView from './GraduationView';
import StudentAchievements from './StudentAchievements';
import FamilyManagement from './FamilyManagement';
import { useAuth } from '../../AuthContext';
import { profilesApi, classesApi, paymentsApi } from '../../services/firestoreService';
import { setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import TodayClasses from '../modules/TodayClasses';

export default function StudentView({ activeTab, setActiveTab, forcedProfile }: { activeTab: string, setActiveTab: (t: string) => void, forcedProfile?: Profile | null }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [userPresenceList, setUserPresenceList] = useState<Presence[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!auth.currentUser || (!user && !forcedProfile)) return;

    const profileId = forcedProfile?.id || user?.id || user?.uid || (auth.currentUser ? auth.currentUser.uid : '');
    if (!profileId || profileId === 'undefined') return;

    const unsubProfile = onSnapshot(doc(db, 'profiles', profileId), (doc) => {
      if (doc.exists()) setProfile({ id: doc.id, ...doc.data() } as Profile);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession)));
    });

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('memberId', '==', profileId)), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as Settings);
    });

    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    });

    const unsubAllProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      setAllProfiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile)));
    });

    // Fetch user presences
    const unsubPresences = onSnapshot(
      query(collectionGroup(db, 'presences'), where('memberId', '==', profileId)),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Presence));
        // Sort on client side to avoid index requirement
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setUserPresenceList(list);
      }
    );

    return () => {
      unsubProfile();
      unsubClasses();
      unsubPayments();
      unsubSettings();
      unsubSchedules();
      unsubAllProfiles();
      unsubPresences();
    };
  }, [user, forcedProfile?.id]);

  if (activeTab === 'home') return <StudentHome profile={profile} classes={classes} payments={payments} schedules={schedules} presences={userPresenceList} allProfiles={allProfiles} />;
  if (activeTab === 'profile') return <StudentProfile profile={profile} />;
  if (activeTab === 'graduation') return <GraduationView />;
  if (activeTab === 'payments') return <StudentPayments profile={profile} payments={payments} settings={settings} />;
  if (activeTab === 'ranking') return <StudentAchievements profileId={profile?.id} />;
  if (activeTab === 'history') return <FullPresenceHistory presences={userPresenceList} classes={classes} />;
  if (activeTab === 'family') return <FamilyManagement />;

  return <div>Em breve: {activeTab}</div>;
}

function StudentHome({ profile, classes, payments, schedules, presences, allProfiles }: { profile: Profile | null, classes: ClassSession[], payments: Payment[], schedules: Schedule[], presences: Presence[], allProfiles: Profile[] }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const payment = payments.find(p => p.month === currentMonth && p.year === currentYear);
  const isPaid = payment?.status === 'paid';

  const totalCheckIns = presences.length;
  const uniqueDays = new Set(presences.map(p => p.checkInDate || p.timestamp.split('T')[0])).size;

  const birthdayPeople = (allProfiles || []).filter(p => {
    if (!p.birthDate || p.status === 'inactive' || p.status === 'blocked' || p.isPointer) return false;
    
    try {
      const parts = p.birthDate.split('-');
      if (parts.length !== 3) return false;
      const birthMonth = parseInt(parts[1], 10) - 1;
      const birthDay = parseInt(parts[2], 10);
      
      const today = new Date();
      // Start of current week (Sunday)
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      currentWeekStart.setHours(0,0,0,0);
      
      // End of current week (Saturday)
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      currentWeekEnd.setHours(23,59,59,999);
      
      const bdayThisYear = new Date(today.getFullYear(), birthMonth, birthDay);
      if (bdayThisYear >= currentWeekStart && bdayThisYear <= currentWeekEnd) return true;
      
      const bdayNextYear = new Date(today.getFullYear() + 1, birthMonth, birthDay);
      if (bdayNextYear >= currentWeekStart && bdayNextYear <= currentWeekEnd) return true;
      
      const bdayPrevYear = new Date(today.getFullYear() - 1, birthMonth, birthDay);
      if (bdayPrevYear >= currentWeekStart && bdayPrevYear <= currentWeekEnd) return true;
    } catch (e) {
      console.warn("Date parse error for birthday check:", e);
    }
    return false;
  });

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
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Olá, {profile?.fullName.split(' ')[0]}</h2>
            <p className="text-slate-500 text-sm mt-1">Bem-vindo de volta ao dojo. Bons treinos!</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
             <div className="flex flex-col items-center border-r border-slate-100 pr-3">
               <span className="text-lg font-black text-indigo-600 leading-none">{totalCheckIns}</span>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Check-ins</span>
             </div>
             <div className="flex flex-col items-center border-r border-slate-100 pr-3">
               <span className="text-lg font-black text-emerald-600 leading-none">{uniqueDays}</span>
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Dias</span>
             </div>
             <div className="flex items-center gap-2 pl-1">
               <Trophy className="w-5 h-5 text-amber-500" />
               <div className="flex flex-col">
                 <span className="text-lg font-bold text-slate-900 leading-none">{profile?.points || 0}</span>
                 <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Pontos</span>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* Check-in Section */}
      <TodayClasses profile={profile} classes={classes} schedules={schedules} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={cn(
          "p-8 rounded-2xl border flex flex-col justify-between transition-all shadow-sm group hover:shadow-md",
          isPaid ? "bg-emerald-50 border-emerald-100" : "bg-indigo-50 border-indigo-100"
        )}>
          <div>
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm", isPaid ? "bg-white text-emerald-600" : "bg-white text-indigo-600")}>
              <Wallet className="w-8 h-8" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensalidade de {getMonthName(currentMonth)}</p>
            <p className={cn("text-3xl font-bold mt-1", isPaid ? "text-emerald-900" : "text-indigo-900")}>
              {isPaid ? 'Mensalidade em Dia' : 'Pagamento Pendente'}
            </p>
          </div>
          {!isPaid && (
            <button className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all">
              Ver Chave PIX
            </button>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-indigo-500" />
              <h3 className="font-bold text-slate-900">Meu Histórico</h3>
            </div>
            <button 
              onClick={() => {
                const element = document.querySelector('[data-tab="history"]');
                if (element) (element as HTMLElement).click();
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
            >
              Ver Tudo
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[200px] scrollbar-hide">
            {presences.length > 0 ? (
              presences.slice(0, 10).map((p, idx) => {
                const classData = classes.find(c => c.id === p.classId);
                return (
                  <div key={`${p.id}-${p.classId || idx}-${idx}`} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-sm">{classData?.title || 'Treino Geral'}</span>
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{classData?.type || 'Treino'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg uppercase tracking-wider group-hover:text-indigo-600">
                      {formatDate(p.timestamp)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-sm italic">Nenhuma presença registrada ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Secção de Aniversariantes da Semana */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 leading-tight">Aniversariantes da Semana 🎉🎂</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Parabenize seus colegas de tatame nesta semana!</p>
          </div>
        </div>

        {birthdayPeople.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {birthdayPeople.map((bMember) => {
              let birthdayDateStr = '';
              try {
                const parts = bMember.birthDate.split('-');
                if (parts.length === 3) {
                  birthdayDateStr = `${parts[2]}/${parts[1]}`;
                }
              } catch (e) {}

              return (
                <div key={bMember.id} className="flex items-center gap-4 p-4 bg-violet-50/40 border border-violet-100 rounded-2xl group hover:border-violet-200 transition-all">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden border-2 border-white shadow-sm shrink-0">
                    {bMember.photoUrl ? (
                      <img src={bMember.photoUrl} alt={bMember.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      bMember.fullName?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-sm truncate">{bMember.fullName}</span>
                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mt-1">
                      Dia: {birthdayDateStr} 🥳
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <p className="text-slate-400 text-xs italic">Nenhum aniversário de aluno nesta semana. Foco nos treinos!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FullPresenceHistory({ presences, classes }: { presences: Presence[], classes: ClassSession[] }) {
  const [filterType, setFilterType] = useState<string>('all');
  
  const filtered = presences
    .filter(p => {
      const c = classes.find(cl => cl.id === p.classId);
      if (!c) return true;
      return true;
    })
    .filter(p => {
      if (filterType === 'all') return true;
      const c = classes.find(cl => cl.id === p.classId);
      return c?.type === filterType;
    });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 italic">Meu Caminho no Tatame</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-black opacity-30">Histórico Completo de Treinos</p>
        </div>
        <div className="flex gap-2">
          {['all', ClassType.JUDO, ClassType.KATA, ClassType.NE_WAZA].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filterType === type ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
              )}
            >
              {type === 'all' ? 'Todos' : type === ClassType.JUDO ? 'Judô' : type === ClassType.KATA ? 'Kata' : 'Ne-Waza'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Treino</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Modalidade</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p, idx) => {
                const c = classes.find(cl => cl.id === p.classId);
                return (
                  <tr key={`${p.id}-${p.classId || idx}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{formatDate(p.timestamp)}</span>
                        <span className="text-[10px] text-slate-400">{new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-sm">{c?.title || 'Treino Regular'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                        c?.type === ClassType.JUDO ? "bg-indigo-50 text-indigo-600" :
                        c?.type === ClassType.KATA ? "bg-amber-50 text-amber-600" :
                        c?.type === ClassType.NE_WAZA ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {c?.type || 'Outro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-emerald-600">+{p.pointsAwarded || 10}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registro encontrado. Continue focado nos treinos!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentProfile({ profile }: { profile: Profile | null }) {
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setSaveMessage('');
    try {
      const normalizedEmail = formData.email ? formData.email.trim().toLowerCase() : '';
      
      // Update Firebase Auth email if user is editing themselves and the email changed
      const currentUser = auth.currentUser;
      let emailUpdateWarning = '';

      if (currentUser && currentUser.email && normalizedEmail && normalizedEmail !== currentUser.email.toLowerCase()) {
        try {
          await updateEmail(currentUser, normalizedEmail);
        } catch (authError: any) {
          console.warn('Failed to update login email via updateEmail directly in StudentView:', authError);
          if (authError.code === 'auth/requires-recent-login') {
            emailUpdateWarning = 'Seu e-mail foi atualizado no cadastro, mas para atualizar seu e-mail de login com segurança, o Firebase exige que você realize login recentemente. Por favor, faça logout e login novamente para aplicar a alteração de login.';
          } else {
            emailUpdateWarning = `Seu e-mail foi atualizado no cadastro, mas não conseguimos atualizar seu login do Firebase automaticamente: ${authError.message || 'Erro desconhecido'}`;
          }
        }
      }

      await profilesApi.update(profile.id, {
        ...formData,
        email: normalizedEmail || undefined
      });

      if (emailUpdateWarning) {
        setSaveMessage(emailUpdateWarning);
      } else {
        setSaveMessage('Dados atualizados com sucesso!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setSaveMessage('Erro ao atualizar: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <UserCircle className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Dados Pessoais</h2>
          <p className="text-sm text-slate-500">Mantenha seus dados sempre atualizados.</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Nome Completo</label>
            <input 
              required
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all text-slate-800"
              value={formData.fullName || ''}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">E-mail</label>
            <input 
              required
              type="email"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all text-slate-800"
              value={formData.email || ''}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Celular / WhatsApp</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
              placeholder="(00) 00000-0000"
              value={formData.phoneNumber || ''}
              onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Tipo Sanguíneo</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
              placeholder="Ex: O+"
              value={formData.bloodType || ''}
              onChange={e => setFormData({...formData, bloodType: e.target.value})}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Contato de Emergência</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
              placeholder="Nome e Telefone"
              value={formData.emergencyContact || ''}
              onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Endereço</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
              placeholder="Rua, Número, Bairro, Cidade"
              value={formData.address || ''}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-700">Informações de Saúde</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Plano de Saúde</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                  value={formData.healthInsurance || ''}
                  onChange={e => setFormData({...formData, healthInsurance: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Medicamentos de uso contínuo</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base min-h-[80px] transition-all resize-none"
                  value={formData.medications || ''}
                  onChange={e => setFormData({...formData, medications: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block ml-1">Condições Médicas / Alergias</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base min-h-[80px] transition-all resize-none"
                  value={formData.conditions || ''}
                  onChange={e => setFormData({...formData, conditions: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {saveMessage && (
          <div className={cn(
            "p-4 rounded-xl text-xs font-bold text-center border",
            saveMessage.includes('sucesso') ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
          )}>
            {saveMessage}
          </div>
        )}

        <button 
          disabled={loading} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}

function StudentPayments({ profile, payments, settings }: { profile: Profile | null, payments: Payment[], settings: Settings | null }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const payment = payments.find(p => p.month === currentMonth && p.year === currentYear);
  const isPaid = payment?.status === 'paid';
  const [loading, setLoading] = useState(false);

  const handleSettlePayment = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const paymentId = payment?.id || `${profile.id}_${currentYear}_${currentMonth}`;
      await paymentsApi.updateStatus(
        paymentId,
        isPaid ? 'pending' : 'paid',
        new Date().toISOString(),
        profile.id,
        currentMonth,
        currentYear
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao processar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase tracking-tight">Finanças</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={cn(
             "p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between min-h-[250px]",
             isPaid ? "bg-green-50/50 border-green-100" : "bg-white border-[#0a0a0a]/5"
          )}>
            <div>
              <h3 className="font-bold text-xl mb-1">Mês de {getMonthName(currentMonth)}</h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6">Status do pagamento para o Tatame</p>
              
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#0a0a0a]/5">
                {isPaid ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <AlertCircle className="w-8 h-8 text-orange-500" />}
                <div>
                  <p className="font-black text-lg">{isPaid ? 'MENSALIDADE PAGA' : 'AGUARDANDO PAGAMENTO'}</p>
                  <p className="text-xs opacity-50 uppercase font-bold tracking-widest italic">{isPaid ? 'Sinalizado pelo usuário / confirmado' : `Vencimento: ${settings?.defaultDueDate || 'Dia 10'}`}</p>
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={handleSettlePayment}
              className={cn(
                "w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 border-2",
                isPaid
                  ? "bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "bg-emerald-600 border-transparent text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPaid ? (
                'Desmarcar Pagamento (Definir como Pendente)'
              ) : (
                'Acertar / Registrar Mensalidade como Paga'
              )}
            </button>
          </div>

          {!isPaid && (
            <div className="bg-[#0a0a0a] text-white p-8 rounded-[2.5rem] shadow-2xl">
              <h4 className="text-xl font-black mb-4">Pagamento via PIX</h4>
              <p className="text-sm opacity-60 mb-8 font-medium">Escaneie o QR Code ou copie a chave abaixo para realizar o pagamento. Após o envio, o administrador confirmará sua adimplência no sistema.</p>
              
              <div className="bg-white p-4 rounded-3xl flex justify-center mb-6">
                <QRCodeSVG value={settings?.pixKey || 'JUDOKA_DOJO'} size={200} />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Chave PIX</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/10 rounded-xl p-3 text-xs font-mono truncate">{settings?.pixKey || 'Não configurada'}</div>
                  <button onClick={() => navigator.clipboard.writeText(settings?.pixKey || '')} className="bg-white text-[#0a0a0a] p-3 rounded-xl"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg px-2">Histórico de Pagamentos</h3>
          {payments.sort((a,b) => (b.year*100 + b.month) - (a.year*100 + a.month)).map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-[#0a0a0a]/5 flex justify-between items-center">
              <span className="font-bold">{getMonthName(p.month)} / {p.year}</span>
              <span className="text-xs font-bold uppercase text-green-600 bg-green-50 px-2 py-1 rounded">Pago</span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-[#0a0a0a]/40 italic px-2">Nenhum registro anterior.</p>}
        </div>
      </div>
    </div>
  );
}
