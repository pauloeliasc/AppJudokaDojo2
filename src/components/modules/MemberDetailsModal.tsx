import React, { useEffect, useState } from 'react';
import { Profile, Presence, Payment, ClassSession, UserRole } from '../../types';
import { 
  presencesApi, 
  paymentsApi, 
  classesApi 
} from '../../services/firestoreService';
import { useAuth } from '../../AuthContext';
import { calculateBadges, getBadgeIcon } from '../../services/badgeService';
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
  MapPin
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

  const [presences, setPresences] = useState<Presence[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allClasses, setAllClasses] = useState<ClassSession[]>([]);
  const [allGlobalPresences, setAllGlobalPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          memberPresences, 
          memberPayments, 
          classes, 
          globalPresences
        ] = await Promise.all([
          presencesApi.getByMember(profile.id),
          paymentsApi.getByUser(profile.id),
          classesApi.getAll(),
          presencesApi.getAllGlobal()
        ]);

        setPresences(memberPresences);
        setPayments(memberPayments);
        setAllClasses(classes);
        setAllGlobalPresences(globalPresences);
      } catch (error) {
        console.error("Error fetching member details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile.id]);

  const badges = calculateBadges(profile.id, presences, allGlobalPresences, payments);

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
    if (!isAdminOrProfessor) return;
    
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
                            isAdminOrProfessor && "cursor-pointer hover:scale-105 active:scale-95"
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
