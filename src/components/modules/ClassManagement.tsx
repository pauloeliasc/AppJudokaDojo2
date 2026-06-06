import React, { useState, useEffect } from 'react';
import { ClassSession, Profile, UserRole, ClassType, Schedule } from '../../types';
import { db, doc } from '../../lib/firebase';
import { collection, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Calendar, Plus, Users, Trash2, CheckCircle2, Clock, CalendarDays, Star, Layers, Activity, Pencil } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { classesApi, profilesApi, scheduleApi } from '../../services/firestoreService';

export default function ClassManagement({ classes, profiles }: { classes: ClassSession[], profiles: Profile[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'agenda' | 'history'>('agenda');
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Safe iframe confirm states
  const [confirmDeleteScheduleId, setConfirmDeleteScheduleId] = useState<string | null>(null);
  const [confirmDeleteSpecial, setConfirmDeleteSpecial] = useState<{ id: string, title: string } | null>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<{ id: string, title: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    });
    return unsub;
  }, []);

  const activeClass = classes.find(c => c.id === selectedClassId);

  const handleCreateSessionFromSchedule = async (schedule: Schedule) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const newSession: Omit<ClassSession, 'id'> = {
        title: `Treino de ${DAYS[schedule.dayOfWeek]}`,
        date: todayStr,
        time: schedule.time,
        professorId: schedule.professorId,
        type: schedule.type,
        scheduleId: schedule.id
      };
      const newId = await classesApi.create(newSession as any);
      if (newId) setSelectedClassId(newId);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar sessão de aula.');
    }
  };

  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const getIconForType = (type: ClassType) => {
    switch (type) {
      case ClassType.KATA: return <Layers className="w-4 h-4" />;
      case ClassType.NE_WAZA: return <Activity className="w-4 h-4" />;
      case ClassType.JUDO: return <Clock className="w-4 h-4" />;
      case ClassType.SPECIAL: return <Star className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Agenda & Treinos</h2>
          <div className="flex gap-2 mt-5">
            <button 
              onClick={() => setActiveView('agenda')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm",
                activeView === 'agenda' ? "bg-slate-900 text-white" : "bg-white text-slate-400 hover:text-slate-600 border border-slate-100"
              )}
            >
              Agenda Semanal
            </button>
            <button 
              onClick={() => setActiveView('history')}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm",
                activeView === 'history' ? "bg-slate-900 text-white" : "bg-white text-slate-400 hover:text-slate-600 border border-slate-100"
              )}
            >
              Histórico de Aulas
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddingSchedule(true)}
            className="bg-white border border-slate-200 text-slate-900 px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            <span>Grade Semanal</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
          >
            <Star className="w-5 h-5 text-amber-400" />
            <span>Aula Especial</span>
          </button>
        </div>
      </div>

      {activeView === 'agenda' ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
              const daySchedules = schedules.filter(s => s.dayOfWeek === dayIdx).sort((a,b) => a.time.localeCompare(b.time));
              const isToday = new Date().getDay() === dayIdx;
              
              return (
                <div key={dayIdx} className={cn(
                  "flex flex-col gap-3 p-2 rounded-[2rem] min-h-[200px] border transition-all",
                  isToday ? "bg-indigo-50/30 border-indigo-100 ring-1 ring-indigo-100" : "bg-slate-50/50 border-slate-100"
                )}>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isToday ? "text-indigo-600" : "text-slate-400"
                    )}>
                      {DAYS[dayIdx]}
                    </span>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                  </div>
                  
                  <div className="space-y-2">
                    {daySchedules.map(s => (
                      <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black text-slate-900">{s.time}</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                // Find or create session for this schedule + today
                                const todayStr = new Date().toISOString().split('T')[0];
                                const existingSession = classes.find(c => c.scheduleId === s.id && c.date.startsWith(todayStr));
                                if (existingSession) {
                                  setSelectedClassId(existingSession.id);
                                } else {
                                  // Auto-create session if it's today's day
                                  if (new Date().getDay() === s.dayOfWeek) {
                                    handleCreateSessionFromSchedule(s);
                                  } else {
                                    alert('Você só pode abrir a chamada de treinos da grade semanal no dia correspondente.');
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Fazer Chamada"
                            >
                              <Users className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setEditingSchedule(s)}
                              className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                              title="Editar Horário"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteScheduleId(s.id)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                              title="Excluir Horário"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tight mb-1">{s.type}</p>
                        <p className="text-[8px] font-medium text-slate-400 truncate">
                          Prof: {profiles.find(p=>p.id===s.professorId)?.fullName.split(' ')[0] || '---'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Aulas Especiais do Mês</h3>
                <p className="text-xs text-slate-400 font-medium">Eventos agendados para das específicas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.filter(c => c.isSpecial).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(c => (
                <div key={c.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-amber-500">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <button 
                        onClick={() => setConfirmDeleteSpecial({ id: c.id, title: c.title })}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                        title="Excluir aula especial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{c.title}</h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(c.date).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedClassId(c.id)}
                    className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  >
                    <Users className="w-4 h-4" /> Ver Chamada
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
            <div key={c.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col group hover:border-indigo-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  c.isSpecial ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
                )}>
                  {getIconForType(c.type || ClassType.JUDO)}
                </div>
                <button 
                  onClick={() => setConfirmDeleteClass({ id: c.id, title: c.title })}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Excluir aula"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-lg text-slate-900">{c.title}</h4>
                {c.isSpecial && <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Especial</span>}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                <Clock className="w-3.5 h-3.5" />
                {new Date(c.date).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>

              <div className="mt-auto space-y-3">
                <div className="flex gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {c.type}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedClassId(c.id)}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  <Users className="w-4 h-4" /> Chamada
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <AddClassModal profiles={profiles} onClose={() => setIsAdding(false)} />
        )}
        {isAddingSchedule && (
          <AddScheduleModal profiles={profiles} onClose={() => setIsAddingSchedule(false)} />
        )}
        {editingSchedule && (
          <EditScheduleModal schedule={editingSchedule} profiles={profiles} onClose={() => setEditingSchedule(null)} />
        )}
        {selectedClassId && activeClass && (
          <PresenceModal session={activeClass} profiles={profiles} onClose={() => setSelectedClassId(null)} />
        )}
      </AnimatePresence>

      {/* Safe dialog overlay for delete schedule */}
      {confirmDeleteScheduleId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">Excluir Horário Semanal?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Deseja realmente remover este horário da grade semanal?
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setConfirmDeleteScheduleId(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const id = confirmDeleteScheduleId;
                  setConfirmDeleteScheduleId(null);
                  try {
                    await scheduleApi.delete(id);
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao excluir horário.');
                  }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe dialog overlay for delete special class */}
      {confirmDeleteSpecial && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white font-sans">Excluir Aula Especial?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Deseja excluir a aula <strong>"{confirmDeleteSpecial.title}"</strong> e todos os registros de presença associados? Esta ação é permanente e irreversível.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setConfirmDeleteSpecial(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const target = confirmDeleteSpecial;
                  setConfirmDeleteSpecial(null);
                  try {
                    await deleteDoc(doc(db, 'classes', target.id));
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao excluir aula.');
                  }
                }}
                className="flex-1 bg-rose-50 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe dialog overlay for history class delete */}
      {confirmDeleteClass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white font-sans">Excluir Aula?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Deseja excluir permanentemente o registro de <strong>"{confirmDeleteClass.title}"</strong> e as presenças dos alunos?
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setConfirmDeleteClass(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const target = confirmDeleteClass;
                  setConfirmDeleteClass(null);
                  try {
                    await deleteDoc(doc(db, 'classes', target.id));
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao excluir aula.');
                  }
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddClassModal({ profiles, onClose }: { profiles: Profile[], onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      title: 'Aula Especial',
      date: localIso,
      professorId: profiles.find(p => p.role === UserRole.PROFESSOR)?.id || profiles.find(p => p.role === UserRole.ADMIN)?.id || '',
      type: ClassType.SPECIAL,
      isSpecial: true,
      description: ''
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const success = await classesApi.create(formData as any);
      if (success) onClose();
      else alert('Erro ao salvar aula. Verifique os dados.');
    } catch (e) {
      console.error(e);
      alert('Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8 my-8 border border-slate-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Nova Aula Especial</h3>
            <p className="text-xs text-slate-400 font-medium">Estas aulas ocorrem em datas e horários fixos.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Título do Evento</label>
            <input 
              required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium text-slate-900"
              placeholder="Ex: Seminário de Judô"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Tipo</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ClassType})}
              >
                <option value={ClassType.JUDO}>{ClassType.JUDO} (Regular)</option>
                <option value={ClassType.KATA}>{ClassType.KATA}</option>
                <option value={ClassType.NE_WAZA}>{ClassType.NE_WAZA}</option>
                <option value={ClassType.SPECIAL}>{ClassType.SPECIAL}</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus className="w-4 h-4 rotate-0" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Data e Hora</label>
            <input 
              type="datetime-local" 
              required 
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium text-slate-900"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Professor Responsável</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.professorId}
                onChange={e => setFormData({...formData, professorId: e.target.value})}
              >
                <option value="">Selecione um Professor</option>
                {profiles.filter(p => p.role === UserRole.PROFESSOR || p.role === UserRole.ADMIN).map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                loading ? "opacity-50 cursor-not-allowed" : "shadow-slate-900/20 hover:bg-slate-800"
              )}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AddScheduleModal({ profiles, onClose }: { profiles: Profile[], onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    time: '18:00',
    type: ClassType.JUDO,
    professorId: profiles.find(p => p.role === UserRole.PROFESSOR)?.id || profiles.find(p => p.role === UserRole.ADMIN)?.id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const success = await scheduleApi.create(formData);
      if (success) onClose();
      else alert('Erro ao salvar grade. Verifique os dados.');
    } catch (e) {
      console.error(e);
      alert('Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8 my-8 border border-slate-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Nova Grade Semanal</h3>
            <p className="text-xs text-slate-400 font-medium">Crie treinos que se repetem toda semana.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Dia da Semana</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.dayOfWeek}
                onChange={e => setFormData({...formData, dayOfWeek: parseInt(e.target.value)})}
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Horário de Início</label>
            <input 
              type="time" required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium text-slate-900"
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Tipo de Treino</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ClassType})}
              >
                {Object.values(ClassType).filter(t => t !== ClassType.SPECIAL).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Professor</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.professorId}
                onChange={e => setFormData({...formData, professorId: e.target.value})}
              >
                <option value="">Selecione um Professor</option>
                {profiles.filter(p => p.role === UserRole.PROFESSOR || p.role === UserRole.ADMIN).map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                loading ? "opacity-50 cursor-not-allowed" : "shadow-slate-900/20 hover:bg-slate-800"
              )}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar Grade'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditScheduleModal({ schedule, profiles, onClose }: { schedule: Schedule, profiles: Profile[], onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: schedule.dayOfWeek,
    time: schedule.time,
    type: schedule.type,
    professorId: schedule.professorId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await scheduleApi.update(schedule.id, formData);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar grade semanal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-8 my-8 border border-slate-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Editar Grade Semanal</h3>
            <p className="text-xs text-slate-400 font-medium">Atualize os detalhes do treino regular semanal.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Dia da Semana</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.dayOfWeek}
                onChange={e => setFormData({...formData, dayOfWeek: parseInt(e.target.value)})}
              >
                <option value={1}>Segunda-feira</option>
                <option value={2}>Terça-feira</option>
                <option value={3}>Quarta-feira</option>
                <option value={4}>Quinta-feira</option>
                <option value={5}>Sexta-feira</option>
                <option value={6}>Sábado</option>
                <option value={0}>Domingo</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Horário de Início</label>
            <input 
              type="time" required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium text-slate-900"
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Tipo de Treino</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ClassType})}
              >
                {Object.values(ClassType).filter(t => t !== ClassType.SPECIAL).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block ml-1">Professor</label>
            <div className="relative">
              <select 
                required className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 px-5 outline-none transition-all font-medium appearance-none text-slate-900"
                value={formData.professorId}
                onChange={e => setFormData({...formData, professorId: e.target.value})}
              >
                <option value="">Selecione um Professor</option>
                {profiles.filter(p => p.role === UserRole.PROFESSOR || p.role === UserRole.ADMIN).map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                loading ? "opacity-50 cursor-not-allowed" : "shadow-slate-900/20 hover:bg-slate-800"
              )}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PresenceModal({ session, profiles, onClose }: { session: ClassSession, profiles: Profile[], onClose: () => void }) {
  const [presences, setPresences] = useState<Record<string, boolean>>({});
  const students = profiles
    .filter(p => !p.role || p.role === UserRole.STUDENT)
    .sort((a, b) => {
      const parseNum = (val?: string | number) => {
        if (val === undefined || val === null || val === '') return Infinity;
        const parsed = parseInt(val.toString().replace(/\D/g, ''), 10);
        return isNaN(parsed) ? Infinity : parsed;
      };
      const numA = parseNum(a.callNumber);
      const numB = parseNum(b.callNumber);
      if (numA !== numB) return numA - numB;
      return a.fullName.localeCompare(b.fullName);
    });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `classes/${session.id}/presences`), (snapshot) => {
      const pMap: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        pMap[doc.data().memberId] = true;
      });
      setPresences(pMap);
    });
    return unsub;
  }, [session.id]);

  const togglePresence = async (studentId: string) => {
    const isPresent = presences[studentId];
    try {
      const presenceId = studentId; // Unique per student in a class
      const presenceRef = doc(db, `classes/${session.id}/presences`, presenceId);
      
      if (isPresent) {
        await deleteDoc(presenceRef);
        // Remove points
        const currentStudent = profiles.find(p => p.id === studentId);
        if (currentStudent) {
          await profilesApi.update(studentId, { points: Math.max(0, (currentStudent.points || 0) - 10) });
        }
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        await setDoc(presenceRef, {
          memberId: studentId,
          classId: session.id,
          timestamp: new Date().toISOString(),
          checkInDate: todayStr,
          pointsAwarded: 10
        });
        // Add points for attending
        const currentStudent = profiles.find(p => p.id === studentId);
        if (currentStudent) {
          await profilesApi.update(studentId, { points: (currentStudent.points || 0) + 10 });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col my-8 border border-slate-100 max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Lista de Presença</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{session.title} • {session.time}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {students.length > 0 ? (
            students.map(s => (
              <button 
                key={s.id}
                onClick={() => togglePresence(s.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 active:scale-[0.98]",
                  presences[s.id] 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                    : "bg-white border-slate-50 hover:border-slate-100 hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner", 
                    presences[s.id] ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                  )}>
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold block text-sm flex items-center gap-1.5">
                      {s.callNumber && (
                        <span className="bg-slate-100 text-slate-600 font-black text-[9px] px-1 py-0.5 rounded border border-slate-200/50">
                          Nº {s.callNumber}
                        </span>
                      )}
                      {s.fullName}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-tighter">{s.currentGrade}</span>
                  </div>
                </div>
                {presences[s.id] && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              </button>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-slate-400 font-medium">Nenhum aluno cadastrado.</p>
            </div>
          )}
        </div>
        
        <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 text-indigo-600 justify-center">
            <Star className="w-5 h-5 fill-indigo-600" />
            <p className="text-[10px] font-black uppercase tracking-widest text-center">Presenças confirmadas ganham 10 pontos de recompensa.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
