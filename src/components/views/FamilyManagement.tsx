import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import { db, handleFirestoreError, OperationType, doc } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Profile, UserRole, Schedule, ClassSession, Presence, ClassType } from '../../types';
import { Plus, Edit2, Trash2, CheckCircle, Users, Sparkles, Calendar, CalendarCheck, Loader2, ArrowRight, UserPlus, HeartHandshake, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { classesApi } from '../../services/firestoreService';
import { deleteStudentAccount } from '../../services/adminService';

export default function FamilyManagement() {
  const { user } = useAuth();
  const currentUserEmail = user?.email || '';
  
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [presencesByClass, setPresencesByClass] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<Profile | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState('');

  // Custom dialogs/messages for iframe safe environments
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  const [showConfirmDeleteName, setShowConfirmDeleteName] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Initial state for add/edit form
  const defaultFormState = {
    fullName: '',
    birthDate: '',
    phoneNumber: '',
    address: '',
    currentGrade: 'Branca',
    medications: '',
    healthInsurance: '',
    bloodType: 'Não Informado',
    conditions: '',
  };
  
  const [formData, setFormData] = useState(defaultFormState);

  // 1. Load family members (same email) and today's configurations
  useEffect(() => {
    if (!currentUserEmail) return;

    const emailQuery = currentUserEmail.trim().toLowerCase();
    
    // Listen to profiles sharing the logged-in email
    const unsubProfiles = onSnapshot(
      query(collection(db, 'profiles'), where('email', '==', emailQuery)),
      (snapshot) => {
        const list = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Profile))
          .filter(p => !p.isPointer); // Filter out pointer profiles to prevent duplication
        setFamilyMembers(list);
      },
      (err) => {
        console.error("Error loading family profiles:", err);
      }
    );

    // Listen to schedule
    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    });

    // Listen to classes for today
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession)));
    });

    return () => {
      unsubProfiles();
      unsubSchedules();
      unsubClasses();
    };
  }, [currentUserEmail]);

  // Translate day number to string
  const getDayName = (dayIdx: number) => {
    return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIdx];
  };

  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateStr = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');

  // Filter today's possible classes
  const todaySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
  const todaySpecialClasses = classes.filter(c => c.isSpecial && c.date === dateStr);

  // Listen to presences in classes for all family members
  useEffect(() => {
    if (classes.length === 0 || familyMembers.length === 0) return;

    const unsubscribers = classes.map(cls => {
      return onSnapshot(collection(db, `classes/${cls.id}/presences`), (snapshot) => {
        const presMap: Record<string, boolean> = {};
        snapshot.docs.forEach(doc => {
          presMap[doc.id] = true;
        });

        setPresencesByClass(prev => ({
          ...prev,
          [cls.id]: presMap
        }));
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [classes, familyMembers]);

  // Handle checking in/out a family member
  const toggleAttendance = async (member: Profile, scheduleOrClass: Schedule | ClassSession, isSpecial: boolean) => {
    const key = isSpecial ? (scheduleOrClass as ClassSession).id : (scheduleOrClass as Schedule).id;
    const actionKey = `${member.id}-${key}`;
    setLoading(actionKey);

    try {
      let classSessionId = '';

      if (isSpecial) {
        classSessionId = (scheduleOrClass as ClassSession).id;
      } else {
        const sched = scheduleOrClass as Schedule;
        // Verify if active session exists
        const existing = classes.find(c => c.scheduleId === sched.id && c.date === dateStr);
        if (existing) {
          classSessionId = existing.id;
        } else {
          // Create new session
          const newSession = {
            title: `Treino de ${getDayName(sched.dayOfWeek)}`,
            date: dateStr,
            time: sched.time,
            professorId: sched.professorId || 'admin',
            type: sched.type,
            scheduleId: sched.id
          };
          classSessionId = await classesApi.create(newSession as any) || '';
        }
      }

      if (!classSessionId) throw new Error('Não foi possível identificar a sessão da aula.');

      const isCurrentlyPresent = presencesByClass[classSessionId]?.[member.id] || false;
      const presenceRef = doc(db, `classes/${classSessionId}/presences`, member.id);

      if (isCurrentlyPresent) {
        // Cancel Check-In
        await deleteDoc(presenceRef);
        // Reduce points
        await updateDoc(doc(db, 'profiles', member.id), {
          points: Math.max(0, (member.points || 0) - 10)
        });
      } else {
        // Complete Check-In
        await setDoc(presenceRef, {
          memberId: member.id,
          classId: classSessionId,
          timestamp: new Date().toISOString(),
          checkInDate: dateStr,
          pointsAwarded: 10
        });
        // Add points
        await updateDoc(doc(db, 'profiles', member.id), {
          points: (member.points || 0) + 10
        });
      }
    } catch (e: any) {
      console.error(e);
      setAlertMessage({ text: `Falha ao registrar check-in: ${e.message || 'Erro desconhecido'}`, type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  // Submit add or edit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.fullName.trim()) {
      setFormError('O nome completo é obrigatório.');
      return;
    }

    if (!isEditing && user?.role === UserRole.STUDENT) {
      setFormError('Alunos não têm permissão para adicionar novos membros.');
      return;
    }

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: currentUserEmail.trim().toLowerCase(),
        birthDate: formData.birthDate,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        currentGrade: formData.currentGrade,
        medications: formData.medications.trim(),
        healthInsurance: formData.healthInsurance.trim(),
        bloodType: formData.bloodType,
        conditions: formData.conditions.trim(),
        role: UserRole.STUDENT,
        status: 'active' as const,
        isApproved: true, // auto approve since it is linked of existing email
        points: isEditing ? (isEditing.points || 0) : 0,
        enrollmentDate: isEditing ? (isEditing.enrollmentDate || dateStr) : dateStr,
        lastPromotionDate: isEditing ? (isEditing.lastPromotionDate || '') : '',
      };

      if (isEditing) {
        await updateDoc(doc(db, 'profiles', isEditing.id), payload);
        setIsEditing(null);
      } else {
        await addDoc(collection(db, 'profiles'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setIsAdding(false);
      }
      setFormData(defaultFormState);
    } catch (err: any) {
      console.error(err);
      setFormError(`Erro ao salvar: ${err.message || 'Inconcluso'}`);
    }
  };

  // Populate form for editing
  const startEdit = (member: Profile) => {
    setIsEditing(member);
    setIsAdding(false);
    setFormData({
      fullName: member.fullName || '',
      birthDate: member.birthDate || '',
      phoneNumber: member.phoneNumber || '',
      address: member.address || '',
      currentGrade: member.currentGrade || 'Branca',
      medications: member.medications || '',
      healthInsurance: member.healthInsurance || '',
      bloodType: member.bloodType || 'Não Informado',
      conditions: member.conditions || '',
    });
  };

  // Handle removing a family member
  const handleRemoveReal = async (memberId: string) => {
    try {
      const member = familyMembers.find(m => m.id === memberId);
      if (member && member.email) {
        await deleteStudentAccount(member.email);
      }
      await deleteDoc(doc(db, 'profiles', memberId));
      setAlertMessage({ text: 'Membro removido com sucesso!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setAlertMessage({ text: 'Erro ao excluir permanentemente o membro da família.', type: 'error' });
    }
  };

  // Profile type badge definition based on student counts (>= 2 is 'Responsável/Família')
  const isFamilyAccount = familyMembers.length >= 2;

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Top Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 py-4 px-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
          <Users className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest text-indigo-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Virtual Table Helper (USEREMAIL)</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Gerenciamento Familiar</h2>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">
            Todos os alunos de karatê ou judô vinculados ao seu e-mail <strong className="text-white">{currentUserEmail}</strong> são listados e gerenciáveis abaixo.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
              <span className="text-2xl font-black text-white">{familyMembers.length}</span>
              <div className="text-[10px] font-bold text-slate-300 uppercase leading-none tracking-wider">
                Membros<br />Vinculados
              </div>
            </div>
            
            <div className={cn(
              "backdrop-blur-md px-4 py-2.5 rounded-2xl border flex items-center gap-3",
              isFamilyAccount 
                ? "bg-purple-500/25 border-purple-400/20 text-purple-200" 
                : "bg-slate-500/15 border-white/5 text-slate-300"
            )}>
              <HeartHandshake className="w-5 h-5 text-purple-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Status de Perfil</span>
                <span className="text-sm font-black whitespace-nowrap">
                  {isFamilyAccount ? 'Responsável / Família' : 'Aluno Individual'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: List of profiles and Form */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Lista de Alunos</span>
            </h3>
            {!isAdding && !isEditing && user?.role !== UserRole.STUDENT && (
              <button 
                onClick={() => {
                  setFormData(defaultFormState);
                  setIsAdding(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Adicionar Novo Aluno</span>
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Show Form if editing or adding */}
            {(isAdding || isEditing) ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="font-bold text-slate-800 text-lg">
                    {isEditing ? `Editar Dados de ${isEditing.fullName}` : 'Cadastrar Aluno da Família'}
                  </h4>
                  <button 
                    onClick={() => {
                      setIsEditing(null);
                      setIsAdding(false);
                      setFormData(defaultFormState);
                    }}
                    className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 py-1.5 px-3 rounded-lg border border-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-5">
                  {formError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl p-3">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Nome Completo</label>
                      <input 
                        type="text"
                        placeholder="Nome do integrante"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm font-semibold text-slate-900 transition-colors"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Nascimento (Birthdate)</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm font-semibold text-slate-900 transition-colors"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Graduação (Belt)</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm font-semibold text-slate-900 transition-colors"
                        value={formData.currentGrade}
                        onChange={e => setFormData({ ...formData, currentGrade: e.target.value })}
                      >
                        {['Branca', 'Cinza', 'Cinza ponta azul', 'Azul', 'Azul ponta amarela', 'Amarela', 'Amarela ponta laranja', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block font-mono">Telefone (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="(00) 00000-0000"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm font-semibold text-slate-900 transition-colors"
                        value={formData.phoneNumber}
                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Endereço Residencial (Address)</label>
                    <input 
                      type="text"
                      placeholder="Endereço da família"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm font-semibold text-slate-900 transition-colors"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-4">
                    <h5 className="font-bold text-xs text-indigo-950 uppercase tracking-widest flex items-center gap-1">Ficha Médica Básica</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Medicamentos de Uso Contínuo</label>
                        <input 
                          type="text"
                          placeholder="Ex: Nenhum"
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 outline-none text-xs text-slate-800"
                          value={formData.medications}
                          onChange={e => setFormData({ ...formData, medications: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Plano de Saúde</label>
                        <input 
                          type="text"
                          placeholder="Ex: SulAmerica"
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-2 px-3 outline-none text-xs text-slate-800"
                          value={formData.healthInsurance}
                          onChange={e => setFormData({ ...formData, healthInsurance: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3.5 text-sm font-bold shadow-md transition-all active:scale-[0.98]"
                  >
                    Salvar Alterações
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {familyMembers.map((member) => {
                  const birthDisplay = member.birthDate 
                    ? new Date(member.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')
                    : 'Não Cadastrada';

                  return (
                    <div 
                      key={member.id}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                              {member.fullName.split(' ').map(n=>n[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">{member.fullName}</h4>
                              <span className="text-[10px] text-slate-400 font-medium">Desde {member.enrollmentDate ? new Date(member.enrollmentDate + 'T00:00:00').getFullYear() : 'N/D'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => startEdit(member)}
                              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {familyMembers.length > 1 && user?.role !== UserRole.STUDENT && (
                              <button 
                                onClick={() => {
                                  setShowConfirmDeleteId(member.id);
                                  setShowConfirmDeleteName(member.fullName);
                                }}
                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Desvincular"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Graduação</span>
                            <span className="text-slate-800 font-bold uppercase">{member.currentGrade}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Nascimento</span>
                            <span className="text-slate-800 font-bold">{birthDisplay}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Pontos acumulados</span>
                            <span className="text-indigo-600 font-black">{member.points || 0} PTS</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[8px]">Situação</span>
                            <span className="text-emerald-600 font-bold uppercase">{member.status || 'Ativo'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right column: Daily Family Attendance Controller (Today's checkins) */}
        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <span>Frequência Rápida</span>
          </h3>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Aulas Disponíveis Hoje</span>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5">{getDayName(dayOfWeek)}, {new Date().toLocaleDateString('pt-BR')}</h4>
            </div>

            {todaySchedules.length === 0 && todaySpecialClasses.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">Nenhuma aula agendada para hoje.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Fixed schedules */}
                {todaySchedules.map((schedule) => {
                  const correspondingClass = classes.find(c => c.scheduleId === schedule.id && c.date === dateStr);
                  const activeClassId = correspondingClass?.id || '';

                  return (
                    <div key={schedule.id} className="space-y-4 p-4 border border-slate-150 rounded-2xl bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{schedule.type}</span>
                          <h5 className="font-black text-slate-800 text-xs mt-1">{schedule.time}</h5>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">Semanal</span>
                      </div>

                      <div className="space-y-2.5">
                        {familyMembers.map((member, idx) => {
                          const isPresent = activeClassId && presencesByClass[activeClassId]?.[member.id];
                          const actionKey = `${member.id}-${schedule.id}`;

                          return (
                            <div key={`${member.id}-${idx}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 text-xs">
                              <span className="font-bold text-slate-700 truncate max-w-[120px]">{member.fullName.split(' ')[0]}</span>
                              
                              <button
                                onClick={() => toggleAttendance(member, schedule, false)}
                                disabled={loading === actionKey}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all",
                                  isPresent 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                    : "bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-transparent"
                                )}
                              >
                                {loading === actionKey ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isPresent ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Presença</span>
                                  </>
                                ) : (
                                  <span>Fazer Check-In</span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Special/Created classes */}
                {todaySpecialClasses.map((sClass) => {
                  return (
                    <div key={sClass.id} className="space-y-4 p-4 border border-purple-150 bg-purple-50/10 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Especial</span>
                          <h5 className="font-black text-slate-800 text-xs mt-1">{sClass.title}</h5>
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold">{sClass.time}</span>
                      </div>

                      <div className="space-y-2.5">
                        {familyMembers.map((member, idx) => {
                          const isPresent = presencesByClass[sClass.id]?.[member.id];
                          const actionKey = `${member.id}-${sClass.id}`;

                          return (
                            <div key={`${member.id}-${idx}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 text-xs">
                              <span className="font-bold text-slate-700 truncate max-w-[120px]">{member.fullName.split(' ')[0]}</span>
                              
                              <button
                                onClick={() => toggleAttendance(member, sClass, true)}
                                disabled={loading === actionKey}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all",
                                  isPresent 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                    : "bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-500 border border-transparent"
                                )}
                              >
                                {loading === actionKey ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : isPresent ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Presença</span>
                                  </>
                                ) : (
                                  <span>Fazer Check-In</span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation and Alert overlay portals for iframe/safari compatibility */}
      {showConfirmDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">Excluir Membro da Família?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              ATENÇÃO: Deseja excluir permanentemente o cadastro de <strong>{showConfirmDeleteName}</strong> e seu acesso de login do Firebase? Esta ação removerá o perfil e liberará o e-mail para novos cadastros.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => {
                  setShowConfirmDeleteId(null);
                  setShowConfirmDeleteName(null);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const id = showConfirmDeleteId;
                  setShowConfirmDeleteId(null);
                  setShowConfirmDeleteName(null);
                  await handleRemoveReal(id);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            {alertMessage.type === 'success' ? (
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            )}
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">
              {alertMessage.type === 'success' ? 'Sucesso!' : 'Aviso / Erro'}
            </h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {alertMessage.text}
            </p>
            <button 
              type="button"
              onClick={() => setAlertMessage(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
