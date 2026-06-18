import React, { useEffect, useState } from 'react';
import { Profile, Presence, Payment, ClassSession, UserRole } from '../../types';
import { 
  presencesApi, 
  paymentsApi, 
  classesApi,
  profilesApi
} from '../../services/firestoreService';
import { useAuth } from '../../AuthContext';
import { calculateBadges, getBadgeIcon } from '../../services/badgeService';
import { db, doc } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  X, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Award, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight,
  Phone,
  MapPin,
  Users,
  Edit2,
  Trash2,
  Plus,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, getMonthName } from '../../lib/utils';

interface MemberDetailsModalProps {
  profile: Profile;
  onClose: () => void;
}

export default function MemberDetailsModal({ profile, onClose }: MemberDetailsModalProps) {
  const { user: currentUser } = useAuth();
  const isAdminOrProfessor = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PROFESSOR;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [presences, setPresences] = useState<Presence[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allClasses, setAllClasses] = useState<ClassSession[]>([]);
  const [allGlobalPresences, setAllGlobalPresences] = useState<Presence[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    fullName: '',
    birthDate: '',
    phoneNumber: profile.phoneNumber || '',
    address: profile.address || '',
    currentGrade: 'Branca',
    medications: '',
    conditions: ''
  });

  // Query and listen for other profiles linked by the same email
  useEffect(() => {
    if (!profile.email) {
      setFamilyMembers([]);
      return;
    }
    const q = query(
      collection(db, 'profiles'),
      where('email', '==', profile.email.toLowerCase().trim())
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Profile))
        .filter(p => p.id !== profile.id && !p.isPointer);
      setFamilyMembers(list);
    }, (err) => {
      console.error("Error loading family members in details modal:", err);
    });
    return () => unsub();
  }, [profile.id, profile.email]);

  const handleSaveFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.email) return;

    try {
      const payload = {
        fullName: memberFormData.fullName.trim(),
        email: profile.email.toLowerCase().trim(),
        birthDate: memberFormData.birthDate,
        phoneNumber: memberFormData.phoneNumber.trim(),
        address: memberFormData.address.trim(),
        currentGrade: memberFormData.currentGrade,
        medications: memberFormData.medications.trim(),
        healthInsurance: '',
        bloodType: '',
        conditions: memberFormData.conditions.trim(),
        role: UserRole.STUDENT,
        status: 'active' as const,
        isApproved: true,
        points: editingMember ? (editingMember.points || 0) : 0,
        enrollmentDate: editingMember ? (editingMember.enrollmentDate || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        lastPromotionDate: editingMember ? (editingMember.lastPromotionDate || '') : '',
      };

      if (editingMember) {
        await updateDoc(doc(db, 'profiles', editingMember.id), payload);
        setEditingMember(null);
      } else {
        await addDoc(collection(db, 'profiles'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setIsAddingMember(false);
      }
      
      // Reset form
      setMemberFormData({
        fullName: '',
        birthDate: '',
        phoneNumber: profile.phoneNumber || '',
        address: profile.address || '',
        currentGrade: 'Branca',
        medications: '',
        conditions: ''
      });
    } catch (err: any) {
      console.error("Error saving family member:", err);
      alert(`Erro ao salvar membro da família: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleStartEditMember = (member: Profile) => {
    setEditingMember(member);
    setIsAddingMember(false);
    setMemberFormData({
      fullName: member.fullName || '',
      birthDate: member.birthDate || '',
      phoneNumber: member.phoneNumber || '',
      address: member.address || '',
      currentGrade: member.currentGrade || 'Branca',
      medications: member.medications || '',
      conditions: member.conditions || ''
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Deseja realmente remover este membro da família?")) return;
    try {
      await deleteDoc(doc(db, 'profiles', memberId));
    } catch (err: any) {
      console.error("Error deleting family member:", err);
      alert(`Erro ao remover membro da família: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const cancelMemberForm = () => {
    setIsAddingMember(false);
    setEditingMember(null);
    setMemberFormData({
      fullName: '',
      birthDate: '',
      phoneNumber: profile.phoneNumber || '',
      address: profile.address || '',
      currentGrade: 'Branca',
      medications: '',
      conditions: ''
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          memberPresences, 
          memberPayments, 
          classes, 
          globalPresences,
          pfs
        ] = await Promise.all([
          presencesApi.getByMember(profile.id),
          paymentsApi.getByUser(profile.id),
          classesApi.getAll(),
          presencesApi.getAllGlobal(),
          profilesApi.getAll()
        ]);

        setPresences(memberPresences);
        setPayments(memberPayments);
        setAllClasses(classes);
        setAllGlobalPresences(globalPresences);
        setAllProfiles(pfs);
      } catch (error) {
        console.error("Error fetching member details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile.id]);

  const badges = calculateBadges(profile.id, presences, allGlobalPresences, payments, allProfiles);

  // Statistics
  const mostFrequentedClassType = presences.reduce((acc, p) => {
    const session = allClasses.find(c => c.id === p.classId);
    if (session) {
      acc[session.type] = (acc[session.type] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topClassType = Object.entries(mostFrequentedClassType).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleTogglePayment = async (month: number) => {
    if (!isAdmin) return;
    
    try {
      const payment = payments.find(p => p.month === month && p.year === currentYear);
      if (payment) {
        const newStatus = payment.status === 'paid' ? 'pending' : 'paid';
        await paymentsApi.updateStatus(payment.id, newStatus as any);
        setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus as any } : p));
      } else {
        const newPayment: Omit<Payment, 'id'> = {
          memberId: profile.id,
          month,
          year: currentYear,
          status: 'paid',
          dueDate: new Date(currentYear, month, 5).toISOString().split('T')[0]
        };
        await paymentsApi.create(newPayment);
        // Refresh local state
        const updatedPayments = await paymentsApi.getByUser(profile.id);
        setPayments(updatedPayments);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar pagamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-50 w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border border-white/20"
      >
        {/* Header */}
        <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
              {profile.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{profile.fullName}</h2>
                {profile.callNumber && (
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-200">
                    Chamada: #{profile.callNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Última Graduação: {profile.currentGrade || 'Não Graduado'} 
                {profile.lastPromotionDate && ` (${new Date(profile.lastPromotionDate + 'T00:00:00').toLocaleDateString('pt-BR')})`} 
                • Membro desde {new Date(profile.enrollmentDate + 'T00:00:00').getFullYear()}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500 font-medium">
                {profile.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-500" />
                    {profile.phoneNumber}
                  </span>
                )}
                {profile.email && (
                  <span className="text-slate-400">
                    • {profile.email}
                  </span>
                )}
                {profile.address && (
                  <span className="flex items-center gap-1 w-full sm:w-auto mt-0.5 sm:mt-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-xs sm:max-w-md md:max-w-lg">{profile.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando painel...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            {/* Top Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Presenças</p>
                  <p className="text-3xl font-black text-slate-900">{presences.length}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                  <TrendingUp className="w-3 h-3" />
                  Consistente
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aula mais Frequentada</p>
                <p className="text-xl font-black text-slate-900 mt-1">{topClassType ? topClassType[0] : 'Nenhum treino'}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">{topClassType ? `${topClassType[1]} presenças` : '-'}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Financeiro</p>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {payments.some(p => p.month === new Date().getMonth() + 1 && p.year === new Date().getFullYear() && p.status === 'paid') ? 'Em dia' : 'Pendente'}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">Mês: {getMonthName(new Date().getMonth() + 1)}</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Insignias Conquistadas</p>
                <p className="text-3xl font-black text-slate-900">{badges.length}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Nível: Expert</p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Financial History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Histórico de Pagamentos (Ano Corrente)
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {months.map(m => {
                      const p = payments.find(pay => pay.month === m && pay.year === currentYear);
                      const isPaid = p?.status === 'paid';
                      return (
                        <div 
                          key={m} 
                          onClick={() => handleTogglePayment(m)}
                          className={cn(
                            "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border border-dashed transition-all",
                            isPaid ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-300",
                            isAdmin && "cursor-pointer hover:scale-105 active:scale-95"
                          )}
                        >
                          <span className="text-[9px] font-black uppercase tracking-tighter">{getMonthName(m).slice(0,3)}</span>
                          {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Pago
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <div className="w-2.5 h-2.5 bg-slate-200 rounded-full" /> Pendente
                    </div>
                  </div>
                </div>
              </div>

              {/* Family Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" /> Membros da Família
                  </h3>
                  {isAdminOrProfessor && profile.email && !isAddingMember && !editingMember && (
                    <button
                      onClick={() => {
                        setMemberFormData({
                          fullName: '',
                          birthDate: '',
                          phoneNumber: profile.phoneNumber || '',
                          address: profile.address || '',
                          currentGrade: 'Branca',
                          medications: '',
                          conditions: ''
                        });
                        setIsAddingMember(true);
                      }}
                      className="text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Familiar
                    </button>
                  )}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative min-h-[170px] flex flex-col justify-between">
                  {isAddingMember || editingMember ? (
                    /* Form to Add or Edit */
                    <form onSubmit={handleSaveFamilyMember} className="space-y-4 w-full">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                        {editingMember ? 'Editar Familiar' : 'Novo Familiar'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-800 font-medium"
                            value={memberFormData.fullName}
                            onChange={(e) => setMemberFormData({ ...memberFormData, fullName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Data de Nascimento *</label>
                          <input
                            type="date"
                            required
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-800 font-medium"
                            value={memberFormData.birthDate}
                            onChange={(e) => setMemberFormData({ ...memberFormData, birthDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Telefone</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-800 font-medium"
                            value={memberFormData.phoneNumber}
                            onChange={(e) => setMemberFormData({ ...memberFormData, phoneNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Faixa / Graduação</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-850 font-bold"
                            value={memberFormData.currentGrade}
                            onChange={(e) => setMemberFormData({ ...memberFormData, currentGrade: e.target.value })}
                          >
                            <option value="Branca">Branca</option>
                            <option value="Cinza">Cinza</option>
                            <option value="Azul">Azul</option>
                            <option value="Amarela">Amarela</option>
                            <option value="Laranja">Laranja</option>
                            <option value="Verde">Verde</option>
                            <option value="Roxa">Roxa</option>
                            <option value="Marrom">Marrom</option>
                            <option value="Preta">Preta</option>
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Endereço</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-800 font-medium"
                            value={memberFormData.address}
                            onChange={(e) => setMemberFormData({ ...memberFormData, address: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Medicamentos de Uso Contínuo</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-850 font-medium"
                            value={memberFormData.medications}
                            onChange={(e) => setMemberFormData({ ...memberFormData, medications: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Limitações / Condições de Saúde</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs outline-none transition-all text-slate-850 font-medium"
                            value={memberFormData.conditions}
                            onChange={(e) => setMemberFormData({ ...memberFormData, conditions: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={cancelMemberForm}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Normal View List of Family Members */
                    <div className="space-y-4 w-full">
                      {!profile.email ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                          <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sem e-mail cadastrado</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">
                            Edite o cadastro do aluno para incluir uma conta de e-mail antes de gerenciar a família.
                          </p>
                        </div>
                      ) : familyMembers.length > 0 ? (
                        <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                          {familyMembers.map((member) => (
                            <div 
                              key={member.id}
                              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-indigo-50/10"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {member.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-slate-800 truncate" title={member.fullName}>{member.fullName}</h5>
                                  <p className="text-[9px] text-slate-400 font-medium">
                                    Faixa {member.currentGrade || 'Branca'} • {member.birthDate ? `${new Date().getFullYear() - new Date(member.birthDate).getFullYear()} anos` : 'S/D'}
                                  </p>
                                </div>
                              </div>
                              {isAdminOrProfessor && (
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                  <button
                                    onClick={() => handleStartEditMember(member)}
                                    className="p-1.5 bg-white border border-slate-200 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all"
                                    title="Editar familiar"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-1.5 bg-white border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer shadow-sm active:scale-95 transition-all"
                                    title="Excluir familiar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                          <Users className="w-10 h-10 text-slate-200 mb-2" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Apenas este aluno</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">
                            Nenhum outro aluno está utilizando o e-mail compartilhado <span className="font-semibold text-slate-500">{profile.email}</span>.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Insignias / Badges */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4" /> Galeria de Conquistas
                </h3>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  {badges.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {badges.map(badge => {
                        const Icon = getBadgeIcon(badge.icon);
                        return (
                          <div 
                            key={badge.id}
                            className={cn(
                              "p-4 rounded-3xl border transition-all hover:scale-[1.02] cursor-default group",
                              badge.type === 'attendance' ? "bg-indigo-50/30 border-indigo-100" : "bg-amber-50/30 border-amber-100"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm",
                              badge.type === 'attendance' ? "bg-indigo-500 text-white" : "bg-amber-500 text-white"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mb-1">{badge.title}</h4>
                            <p className="text-[9px] text-slate-500 font-medium leading-tight">{badge.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                        <Award className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma conquista ainda</p>
                      <p className="text-[10px] text-slate-400">Continue treinando e mantendo os pagamentos em dia!</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Detailed Presence History */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Registro de Presenças Recentes
                </h3>
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white border-b border-slate-50 z-10">
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Data</th>
                          <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Treino</th>
                          <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">Pontos</th>
                          <th className="px-6 py-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {presences.length > 0 ? (
                          presences.slice(0, 10).map((p, idx) => {
                            const session = allClasses.find(c => c.id === p.classId);
                            return (
                              <tr key={`${p.id}-${p.classId || idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                  {new Date(p.timestamp).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">{session?.title || 'Treino Removido'}</span>
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 tracking-tighter">
                                      {session?.type || 'Outro'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-black text-indigo-600">+{p.pointsAwarded}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <ChevronRight className="w-4 h-4 text-slate-300 inline" />
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhuma presença registrada</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white px-8 py-6 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm tracking-tight hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
