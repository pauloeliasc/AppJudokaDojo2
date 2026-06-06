import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, where, collectionGroup, setDoc, deleteDoc } from 'firebase/firestore';
import { Profile, ClassSession, Schedule, Presence, UserRole } from '../../types';
import { Star, Clock, Activity, Loader2, AlertCircle, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { profilesApi, classesApi } from '../../services/firestoreService';

interface TodayClassesProps {
  profile: Profile | null;
  classes: ClassSession[];
  schedules: Schedule[];
}

export default function TodayClasses({ profile, classes, schedules }: TodayClassesProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [userPresences, setUserPresences] = useState<Record<string, boolean>>({});
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allTodayPresences, setAllTodayPresences] = useState<Presence[]>([]);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const isAdminOrProfessor = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROFESSOR;

  const today = new Date();
  const dayOfWeek = today.getDay();
  // Use local date string YYYY-MM-DD
  const dateStr = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');

  useEffect(() => {
    if (!profile) return;
    
    // Fetch all check-ins for this user today (across all classes)
    const q = query(
      collectionGroup(db, 'presences'),
      where('memberId', '==', profile.id),
      where('checkInDate', '==', dateStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const pMap: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        pMap[doc.data().classId] = true;
      });
      setUserPresences(pMap);
    }, (error) => {
      console.error("Presences snapshot error:", error);
    });

    return unsub;
  }, [profile, dateStr]);

  // Fetch all profiles for mapping names in check-in panel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      setAllProfiles(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer));
    });
    return unsub;
  }, []);

  // Fetch counts and full list for all classes today
  const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'presences'),
      where('checkInDate', '==', dateStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      const presences: Presence[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Presence;
        counts[data.classId] = (counts[data.classId] || 0) + 1;
        presences.push({ id: doc.id, ...data });
      });
      setPresenceCounts(counts);
      setAllTodayPresences(presences);
    }, (error) => {
      console.error("Presence counts error:", error);
    });

    return unsub;
  }, [dateStr]);

  // Classes for today based on schedule
  const todaySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
  
  // Special classes for today
  const specialClasses = classes.filter(c => c.isSpecial && c.date.startsWith(dateStr));

  const handleCheckIn = async (item: Schedule | ClassSession, isSpecial: boolean) => {
    if (!profile) {
      alert('Perfil não encontrado. Por favor, tente recarregar a página.');
      return;
    }
    const itemId = isSpecial ? (item as ClassSession).id : (item as Schedule).id;
    setLoading(itemId);
    
    try {
      let classSessionId: string;
      
      if (isSpecial) {
        classSessionId = (item as ClassSession).id;
      } else {
        const schedule = item as Schedule;
        // Check if session for this schedule + today exists
        const existingSession = classes.find(c => c.scheduleId === schedule.id && c.date.startsWith(dateStr));
        
        if (existingSession) {
          classSessionId = existingSession.id;
        } else {
          // Create new session for this schedule
          const newSession: Omit<ClassSession, 'id'> = {
            title: `Treino de ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][schedule.dayOfWeek]}`,
            date: dateStr,
            time: schedule.time,
            professorId: schedule.professorId || 'admin', // Fallback if missing
            type: schedule.type,
            scheduleId: schedule.id
          };
          classSessionId = await classesApi.create(newSession as any) || '';
          if (!classSessionId) throw new Error('Não foi possível criar a sessão de aula.');
        }
      }

      if (classSessionId && profile?.id && profile.id !== 'undefined') {
        // Add presence
        const presenceRef = doc(db, `classes/${classSessionId}/presences`, profile.id);
        await setDoc(presenceRef, {
          memberId: profile.id,
          classId: classSessionId,
          timestamp: new Date().toISOString(),
          checkInDate: dateStr,
          pointsAwarded: 10
        });
        
        // Add points
        await profilesApi.update(profile.id, { points: (profile.points || 0) + 10 });
      }
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao realizar check-in: ${e.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(null);
    }
  };

  const handleCancelCheckIn = async (item: Schedule | ClassSession, isSpecial: boolean) => {
    if (!profile) return;
    const id = isSpecial ? (item as ClassSession).id : (item as Schedule).id;
    const classSession = isSpecial ? (item as ClassSession) : classes.find(c => c.scheduleId === (item as Schedule).id && c.date.startsWith(dateStr));
    
    if (!classSession) return;
    
    if (confirmCancelId !== id) {
      setConfirmCancelId(id);
      return;
    }

    setLoading(id);
    try {
      if (classSession?.id && profile?.id && profile.id !== 'undefined') {
        const presenceRef = doc(db, `classes/${classSession.id}/presences`, profile.id);
        await deleteDoc(presenceRef);
        
        // Remove points
        await profilesApi.update(profile.id, { points: Math.max(0, (profile.points || 0) - 10) });
      }
      setConfirmCancelId(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao cancelar check-in. Por favor, tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const allItems = [
    ...specialClasses.map(c => ({ ...c, isClass: true as const })),
    ...todaySchedules.map(s => ({ ...s, isSchedule: true as const }))
  ];

  if (allItems.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-[#0a0a0a]/5 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-indigo-500" />
        <h3 className="font-bold text-xl uppercase tracking-tight">Treinos Disponíveis Hoje</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allItems.map((item, idx) => {
          const id = 'isClass' in item ? item.id : item.id;
          const classSession = 'isClass' in item ? item : classes.find(c => c.scheduleId === (item as Schedule).id && c.date.startsWith(dateStr));
          const hasCheckedIn = classSession ? userPresences[classSession.id] : false;
          const isLoading = loading === id;

          return (
            <div key={idx} className={cn(
              "p-6 rounded-2xl border transition-all flex flex-col justify-between",
              hasCheckedIn ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
            )}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-2 rounded-lg", 'isClass' in item ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600")}>
                    {'isClass' in item ? <Star className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{item.time}</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">
                  {'isClass' in item ? item.title : `Treino de ${item.type}`}
                </h4>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0a0a0a]/40">{item.type}</span>
                  {'isClass' in item && <span className="bg-amber-500 text-white text-[7px] font-black uppercase px-1.5 rounded">Especial</span>}
                </div>
                {classSession && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">
                      {presenceCounts[classSession.id] || 0} {(presenceCounts[classSession.id] || 0) === 1 ? 'aluno presente' : 'alunos presentes'}
                    </span>
                  </div>
                )}
              </div>

              {hasCheckedIn && confirmCancelId === id ? (
                <div className="mt-6 flex gap-2 w-full animate-fade-in/10">
                  <button
                    disabled={isLoading}
                    onClick={() => handleCancelCheckIn(item as any, 'isClass' in item)}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:bg-rose-700 shadow-md shadow-rose-500/15"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    Confirmar
                  </button>
                  <button
                    disabled={isLoading}
                    onClick={() => setConfirmCancelId(null)}
                    className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center transition-all hover:bg-slate-300"
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <button
                  disabled={isLoading}
                  onClick={() => hasCheckedIn ? handleCancelCheckIn(item as any, 'isClass' in item) : handleCheckIn(item as any, 'isClass' in item)}
                  className={cn(
                    "mt-6 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                    hasCheckedIn 
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600" 
                      : "bg-[#0a0a0a] text-white hover:scale-[1.02] shadow-lg"
                  )}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : hasCheckedIn ? <AlertCircle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                  {hasCheckedIn ? 'Cancelar Check-in' : 'Fazer Check-in'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {allTodayPresences.length > 0 && (
        <div className="mt-12 border-t border-slate-100 pt-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">Painel de Presenças</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Lista de alunos que treinaram hoje</p>
            </div>
            <div className="ml-auto bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {allTodayPresences.length} {allTodayPresences.length === 1 ? 'Check-in' : 'Check-ins'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allTodayPresences.map((p, idx) => {
              const studentProfile = allProfiles.find(prof => prof.id === p.memberId);
              const classData = classes.find(c => c.id === p.classId);
              
              return (
                <div key={`${p.id}-${p.classId || idx}`} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-emerald-200 hover:bg-white transition-all">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                    {studentProfile?.photoUrl ? (
                      <img src={studentProfile.photoUrl} alt={studentProfile.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      studentProfile?.fullName?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-sm truncate">{studentProfile?.fullName || 'Visitante'}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tight truncate">
                        {classData?.title || 'Aula'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold">at {classData?.time || '--:--'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
