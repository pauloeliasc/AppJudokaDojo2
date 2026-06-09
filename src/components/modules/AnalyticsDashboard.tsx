import React, { useEffect, useState, useMemo } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, onSnapshot, collectionGroup } from 'firebase/firestore'; 
import { Profile, ClassSession, Presence, Payment, Settings, UserRole } from '../../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Activity, 
  ChevronRight, 
  DollarSign, 
  Award,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
  initialProfiles?: Profile[];
  initialClasses?: ClassSession[];
  initialPayments?: Payment[];
  initialSettings?: Settings | null;
}

export default function AnalyticsDashboard({ 
  initialProfiles, 
  initialClasses, 
  initialPayments, 
  initialSettings 
}: AnalyticsDashboardProps) {
  // State for metrics
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles || []);
  const [classes, setClasses] = useState<ClassSession[]>(initialClasses || []);
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state if initial props change
  useEffect(() => {
    if (initialProfiles) setProfiles(initialProfiles);
  }, [initialProfiles]);

  useEffect(() => {
    if (initialClasses) setClasses(initialClasses);
  }, [initialClasses]);

  useEffect(() => {
    if (initialPayments) setPayments(initialPayments);
  }, [initialPayments]);

  useEffect(() => {
    if (initialSettings) setSettings(initialSettings);
  }, [initialSettings]);

  // Load live data from Firebase (for real-time updates and fallback)
  useEffect(() => {
    const firestoreDb = db as any;
    
    // We fetch presences dynamically for real-time check-in mapping
    const unsubPresences = onSnapshot(
      collectionGroup(firestoreDb, 'presences'),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence));
        setPresences(list);
        setLoading(false);
      },
      (error) => {
        console.error("Presences snapshot in AnalyticsDashboard error:", error);
        setLoading(false);
      }
    );

    // Dynamic loads if props are missing
    let unsubProfiles = () => {};
    if (!initialProfiles) {
      unsubProfiles = onSnapshot(collection(firestoreDb, 'profiles'), (snapshot) => {
        setProfiles(snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
          .filter(p => !p.isPointer));
      });
    }

    let unsubClasses = () => {};
    if (!initialClasses) {
      unsubClasses = onSnapshot(collection(firestoreDb, 'classes'), (snapshot) => {
        setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSession)));
      });
    }

    let unsubPayments = () => {};
    if (!initialPayments) {
      unsubPayments = onSnapshot(collection(firestoreDb, 'payments'), (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      });
    }

    let unsubSettings = () => {};
    if (!initialSettings) {
      unsubSettings = onSnapshot(doc(firestoreDb, 'settings', 'global'), (document) => {
        if (document.exists()) setSettings(document.data() as Settings);
      });
    }

    return () => {
      unsubPresences();
      unsubProfiles();
      unsubClasses();
      unsubPayments();
      unsubSettings();
    };
  }, [initialProfiles, initialClasses, initialPayments, initialSettings]);

  // 1. CALCULATE ACTIVE MEMBERS METRICS
  const memberMetrics = useMemo(() => {
    const activeProfiles = profiles.filter(p => !p.status || p.status === 'active');
    const totalStudents = activeProfiles.filter(p => !p.role || p.role === UserRole.STUDENT).length;
    const totalProfessors = activeProfiles.filter(p => p.role === UserRole.PROFESSOR).length;
    const totalAdmins = activeProfiles.filter(p => p.role === UserRole.ADMIN).length;

    const roleChartData = [
      { name: 'Alunos', value: totalStudents, color: '#6366f1' },
      { name: 'Professores', value: totalProfessors, color: '#10b981' },
      { name: 'Admins', value: totalAdmins, color: '#f59e0b' },
    ].filter(r => r.value > 0);

    const statusChartData = [
      { name: 'Ativo', value: profiles.filter(p => !p.status || p.status === 'active').length, color: '#10b981' },
      { name: 'Pendente', value: profiles.filter(p => p.status === 'pending').length, color: '#f59e0b' },
      { name: 'Inativo/Bloqueado', value: profiles.filter(p => p.status === 'inactive' || p.status === 'blocked').length, color: '#f43f5e' },
    ].filter(s => s.value > 0);

    return {
      activeCount: activeProfiles.length,
      inactiveCount: profiles.filter(p => p.status === 'inactive' || p.status === 'blocked').length,
      pendingCount: profiles.filter(p => p.status === 'pending').length,
      roleChartData,
      statusChartData,
    };
  }, [profiles]);

  // 2. CALCULATE TRAINING FREQUENCY METRICS
  const trainingMetrics = useMemo(() => {
    // Generate last 7 days check-in frequency data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const localISO = d.toISOString().split('T')[0];
      
      const dayCheckins = presences.filter(p => {
        if (!p.timestamp) return false;
        const pDateStr = new Date(p.timestamp).toISOString().split('T')[0];
        return pDateStr === localISO || p.checkInDate === localISO;
      }).length;

      return {
        dia: formattedDate,
        'Check-ins': dayCheckins
      };
    });

    // Attendance by day of the week
    const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayCounts = Array(7).fill(0);
    
    presences.forEach(p => {
      if (p.timestamp) {
        const day = new Date(p.timestamp).getDay();
        weekdayCounts[day] += 1;
      }
    });

    const frequencyByDay = weekdayNames.map((name, idx) => ({
      name,
      'Check-ins': weekdayCounts[idx]
    })).filter((_, idx) => idx !== 0); // Exclude Sunday if rarely used

    // Find classes with counts
    const classAttendanceMap: Record<string, number> = {};
    presences.forEach(p => {
      classAttendanceMap[p.classId] = (classAttendanceMap[p.classId] || 0) + 1;
    });

    const popularClasses = Object.entries(classAttendanceMap)
      .map(([classId, count]) => {
        const cls = classes.find(c => c.id === classId);
        return {
          title: cls?.title || 'Treino Reg.',
          type: cls?.type || 'Judô',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      last7Days,
      frequencyByDay,
      popularClasses,
      totalPresences: presences.length,
    };
  }, [presences, classes]);

  // 3. CALCULATE MONTHLY FINANCIAL STATUS
  const financialMetrics = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyFee = settings?.monthlyValue || 150;

    const activeStudents = profiles.filter(p => (!p.role || p.role === UserRole.STUDENT) && (!p.status || p.status === 'active'));
    const totalStudentsCount = activeStudents.length;

    // Filter payments for this month
    const curMonthPayments = payments.filter(p => p.month === currentMonth && p.year === currentYear);
    const paidStudents = curMonthPayments.filter(p => p.status === 'paid').length;
    const pendingStudents = curMonthPayments.filter(p => p.status === 'pending').length;

    // Any active student structure who does not yet have a recorded payment has a pending estimate
    const unrecordedStudents = Math.max(0, totalStudentsCount - (paidStudents + pendingStudents));
    
    const paidValue = paidStudents * monthlyFee;
    const pendingValue = (pendingStudents + unrecordedStudents) * monthlyFee;
    const expectedValue = totalStudentsCount * monthlyFee;

    const financialDistribution = [
      { name: 'Recebido (Pago)', value: paidValue, color: '#10b981' },
      { name: 'A Receber (Pendente)', value: pendingValue, color: '#f59e0b' },
    ];

    return {
      paidValue,
      pendingValue,
      expectedValue,
      paidPercent: expectedValue > 0 ? Math.round((paidValue / expectedValue) * 100) : 0,
      financialDistribution,
      paidCount: paidStudents,
      pendingCount: pendingStudents + unrecordedStudents,
    };
  }, [payments, profiles, settings]);

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <div className="space-y-8">
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Active Members Mini Panel */}
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex items-center justify-between group hover:border-slate-350 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Alunos Ativos</span>
              <h4 className="text-2xl font-black text-slate-900 leading-none">{memberMetrics.activeCount}</h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                {memberMetrics.pendingCount} pendentes • {memberMetrics.inactiveCount} inativos
              </p>
            </div>
          </div>
          <div className="text-indigo-600 shrink-0">
            <TrendingUp className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        {/* Workout Freq Mini Panel */}
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex items-center justify-between group hover:border-slate-350 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Frequência Semanal</span>
              <h4 className="text-2xl font-black text-slate-900 leading-none">
                {trainingMetrics.last7Days.reduce((acc, curr) => acc + curr['Check-ins'], 0)}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                Check-ins nos últimos 7 dias
              </p>
            </div>
          </div>
          <div className="text-emerald-500 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Finance Mini Panel */}
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex items-center justify-between group hover:border-slate-350 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Status Financeiro ({monthName})</span>
              <h4 className="text-xl font-black text-slate-900 leading-none">
                R$ {financialMetrics.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                {financialMetrics.paidPercent}% recebidos de R$ {financialMetrics.expectedValue.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="text-amber-500 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Charts Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weekly Presence Chart - Interactive Area Chart */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="mb-5 flex justify-between items-start">
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Frequência nos Treinos</h4>
              <p className="text-xs text-slate-400 mt-0.5">Evolução de presenças (Check-ins diários na semana)</p>
            </div>
            <div className="bg-indigo-50 text-indigo-700 font-extrabold text-[9px] uppercase tracking-wide px-2 py-1 rounded-lg">
              Tempo Real
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trainingMetrics.last7Days} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="dia" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '11px', 
                    fontFamily: 'Inter, sans-serif', 
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="Check-ins" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCheckins)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around items-center pt-4 border-t border-slate-50 mt-4 text-[10px] font-bold text-slate-400">
            <div className="text-center">
              <span className="block text-slate-500 font-black text-sm">{trainingMetrics.totalPresences}</span>
              Total de Check-ins
            </div>
            <div className="w-px h-5 bg-slate-100" />
            <div className="text-center">
              <span className="block text-slate-500 font-black text-sm">
                {(trainingMetrics.totalPresences / Math.max(1, classes.length)).toFixed(1)}
              </span>
              Média por Treino
            </div>
          </div>
        </div>

        {/* Financial Distribution Chart - Interactive Donut Chart */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="mb-5 flex justify-between items-start">
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Cenário Financeiro do Mês</h4>
              <p className="text-xs text-slate-400 mt-0.5">Visão de recebíveis e faturamento em {monthName}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-lg">
              Mensal
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center relative">
            <div className="absolute flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Arrecadado</span>
              <span className="text-lg font-black text-slate-800 leading-none mt-0.5">
                {financialMetrics.paidPercent}%
              </span>
            </div>
            
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialMetrics.financialDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {financialMetrics.financialDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 mt-4 text-[10px] font-bold">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="text-slate-500">
                <span className="text-slate-800 font-black block">
                  R$ {financialMetrics.paidValue.toLocaleString('pt-BR')}
                </span>
                {financialMetrics.paidCount} Alunos Pagos
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div className="text-slate-500">
                <span className="text-slate-800 font-black block">
                  R$ {financialMetrics.pendingValue.toLocaleString('pt-BR')}
                </span>
                {financialMetrics.pendingCount} Alunos Pendentes
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Distribution of Members - Interactive Bar Chart */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">Distribuição do Corpo de Membros</h4>
            <p className="text-xs text-slate-400 mt-0.5">Divisão e status dos perfis registrados no Dojô</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 border border-slate-150 rounded-xl">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>{profiles.length} Membros Cadastrados</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Recharts Bar Chart of active roles */}
          <div className="h-60 w-full md:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberMetrics.roleChartData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                />
                <Bar dataKey="value" name="Total Ativos" radius={[8, 8, 0, 0]}>
                  {memberMetrics.roleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats breakdowns */}
          <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Detalhamento dos Perfis</h5>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold text-slate-700">Total de Alunos</span>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                {profiles.filter(p => !p.role || p.role === UserRole.STUDENT).length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Responsáveis Legais</span>
              </div>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                {profiles.filter(p => p.role === UserRole.STUDENT && p.responsibleName).length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-700">Equipe Técnica</span>
              </div>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                {profiles.filter(p => p.role === UserRole.PROFESSOR).length}
              </span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
