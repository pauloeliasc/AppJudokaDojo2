import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, where, collectionGroup, setDoc, deleteDoc } from 'firebase/firestore';
import { Profile, ClassSession, Schedule, Presence, UserRole } from '../../types';
import { Star, Clock, Activity, Loader2, AlertCircle, Users, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { profilesApi, classesApi } from '../../services/firestoreService';

interface TodayClassesProps {
  profile: Profile | null;
  classes: ClassSession[];
  schedules: Schedule[];
}

export default function TodayClasses({ profile, classes, schedules }: TodayClassesProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allTodayPresences, setAllTodayPresences] = useState<Presence[]>([]);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const today = new Date();
  const dayOfWeek = today.getDay();
  // Use local date string YYYY-MM-DD
  const dateStr = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');

  const [panelDate, setPanelDate] = useState<string>(dateStr);
  const [panelClassId, setPanelClassId] = useState<string>('');
  const [panelPresences, setPanelPresences] = useState<Presence[]>([]);

  const isAdminOrProfessor = profile?.role === UserRole.ADMIN || profile?.role === UserRole.PROFESSOR;

  // Subscribe in real-time to check-ins matching target date and target physical classes
  useEffect(() => {
    const targetDateClasses = classes.filter(c => c.date === panelDate);
    
    if (targetDateClasses.length === 0) {
      setPanelPresences([]);
      return;
    }

    const presencesByClass: Record<string, Presence[]> = {};
    
    const unsubs = targetDateClasses.map(c => {
      const presenceCol = collection(db, `classes/${c.id}/presences`);
      return onSnapshot(presenceCol, (snapshot) => {
        const classPres = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
        presencesByClass[c.id] = classPres;
        
        // Flatten and update state reactively
        const flattened = Object.values(presencesByClass).flat();
        setPanelPresences(flattened);
      }, (error) => {
        console.error(`Error loading custom panel presences for class ${c.id}:`, error);
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [classes, panelDate]);

  // Load allTodayPresences by registering subcollection listeners on today's classes
  useEffect(() => {
    // Get all class sessions for today
    const todaySessions = classes.filter(c => c.date === dateStr);
    
    if (todaySessions.length === 0) {
      setAllTodayPresences([]);
      return;
    }

    // Keep track of presences by classId to combine them
    const presencesByClass: Record<string, Presence[]> = {};

    const unsubs = todaySessions.map(c => {
      const presenceCol = collection(db, `classes/${c.id}/presences`);
      return onSnapshot(presenceCol, (snapshot) => {
        const classPres = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
        presencesByClass[c.id] = classPres;
        
        // Flatten all presences across today's classes
        const flattened = Object.values(presencesByClass).flat();
        setAllTodayPresences(flattened);
      }, (error) => {
        console.error(`Error loading presences for class ${c.id}:`, error);
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [classes, dateStr]);

  // Derive userPresences dynamically from allTodayPresences
  const userPresences = React.useMemo(() => {
    const pMap: Record<string, boolean> = {};
    if (profile) {
      allTodayPresences.forEach(p => {
        if (p.memberId === profile.id) {
          pMap[p.classId] = true;
        }
      });
    }
    return pMap;
  }, [allTodayPresences, profile]);

  // Derive presenceCounts dynamically from allTodayPresences
  const presenceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allTodayPresences.forEach(p => {
      counts[p.classId] = (counts[p.classId] || 0) + 1;
    });
    return counts;
  }, [allTodayPresences]);

  // Fetch all profiles for mapping names in check-in panel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      setAllProfiles(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer));
    });
    return unsub;
  }, []);

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
          const classPresences = classSession ? allTodayPresences.filter(p => p.classId === classSession.id) : [];

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

                {classSession && classPresences.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>No treino agora ({classPresences.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto pr-1">
                      {classPresences.map((p, pIdx) => {
                        const studentProfile = allProfiles.find(prof => prof.id === p.memberId);
                        const isMe = profile && p.memberId === profile.id;
                        const isPrivate = studentProfile?.isPrivateProfile;

                        const displayName = isMe
                          ? (isPrivate ? "Você (Privado)" : "Você")
                          : (isPrivate ? "Colega Oculto" : (studentProfile?.fullName?.split(' ')[0] || 'Aluno'));

                        const showPhoto = !isPrivate || isMe;

                        return (
                          <div
                            key={`${p.id || pIdx}-${pIdx}`}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold select-none border transition-all",
                              isMe 
                                ? "bg-emerald-100/85 border-emerald-200/70 text-emerald-800" 
                                : isPrivate 
                                  ? "bg-slate-100 border-slate-200 text-slate-400" 
                                  : "bg-white border-slate-100 hover:border-slate-300 text-slate-600"
                            )}
                            title={isPrivate ? "Este colega optou por ocultar a presença" : (studentProfile?.fullName || 'Aluno')}
                          >
                            <div className="w-4 h-4 rounded-full flex items-center justify-center font-black text-[8px] overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                              {showPhoto && studentProfile?.photoUrl ? (
                                <img
                                  src={studentProfile.photoUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : isPrivate ? (
                                <Lock className="w-2 h-2 text-slate-400" />
                              ) : (
                                displayName.slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <span className="truncate max-w-[70px]">{displayName}</span>
                          </div>
                        );
                      })}
                    </div>
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

      <div className="mt-12 border-t border-slate-100 pt-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight flex items-center gap-2">
                Presenças em Tempo Real
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Veja quem treinou ou está treinando hoje ou em outra data</p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Date filter select */}
            <div className="flex flex-col min-w-[120px]">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 ml-0.5">Filtrar por Data</label>
              <input 
                type="date"
                value={panelDate}
                onChange={(e) => {
                  setPanelDate(e.target.value);
                  setPanelClassId(''); // Reset selected class on date swap
                }}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
              />
            </div>

            {/* Class/Turma filter select */}
            <div className="flex flex-col min-w-[170px] flex-1">
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 ml-0.5">Filtrar por Turma/Treino</label>
              <select
                value={panelClassId}
                onChange={(e) => setPanelClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
              >
                <option value="">Todos os Treinos</option>
                {classes
                  .filter(c => c.date === panelDate)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.time} - {c.title || `Treino (${c.type})`}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Display filtered results */}
        {panelPresences.length === 0 ? (
          <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
            <h5 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Sem registro de presença</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">Nenhum aluno realizou check-in para sessões de treino na data selecionada ({panelDate}).</p>
          </div>
        ) : (
          (() => {
            const finalFiltered = panelClassId 
              ? panelPresences.filter(p => p.classId === panelClassId)
              : panelPresences;

            if (finalFiltered.length === 0) {
              return (
                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
                  <h5 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Nenhuma presença nesta turma</h5>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">Nesta turma específica ainda não constam presenças gravadas para o dia selecionado.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {finalFiltered.map((p, idx) => {
                  const studentProfile = allProfiles.find(prof => prof.id === p.memberId);
                  const classData = classes.find(c => c.id === p.classId);
                  const isMe = profile && p.memberId === profile.id;
                  const isPrivate = studentProfile?.isPrivateProfile;

                  const displayName = isMe
                    ? (isPrivate ? "Você (Oculto para colegas)" : "Você")
                    : (isPrivate ? "Colega Oculto" : (studentProfile?.fullName || 'Visitante'));

                  const showPhoto = !isPrivate || isMe;
                  const checkInTime = p.timestamp ? new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div 
                      key={`${p.id}-${p.classId || idx}-${idx}`} 
                      className={cn(
                        "flex items-center gap-4 p-4 border rounded-2xl group hover:shadow-md transition-all",
                        isMe 
                          ? "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200" 
                          : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold overflow-hidden border border-slate-150 shadow-sm shrink-0">
                        {showPhoto && studentProfile?.photoUrl ? (
                          <img 
                            src={studentProfile.photoUrl} 
                            alt={displayName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : isPrivate ? (
                          <Lock className="w-4 h-4 text-slate-400" />
                        ) : (
                          displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "font-bold text-slate-800 text-sm truncate",
                          isPrivate && !isMe && "text-slate-400 italic"
                        )}>
                          {displayName}
                        </span>
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tight truncate leading-none">
                            {classData?.title || 'Aula/' + (classData?.type || 'Treino')}
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium mt-0.5">
                            Check-in às {checkInTime || classData?.time || '--:--'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
