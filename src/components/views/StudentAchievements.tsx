import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, where, onSnapshot, collectionGroup } from 'firebase/firestore';
import { Profile, Presence, Payment, Badge } from '../../types';
import { calculateBadges, getBadgeIcon } from '../../services/badgeService';
import { useAuth } from '../../AuthContext';
import { Trophy, Target, Clock, Star, Activity, Loader2, ChevronRight, Award, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StudentAchievements({ profileId: forcedProfileId }: { profileId?: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberPresences, setMemberPresences] = useState<Presence[]>([]);
  const [allPresences, setAllPresences] = useState<Presence[]>([]);
  const [memberPayments, setMemberPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !forcedProfileId) return;

    const profileId = forcedProfileId || user?.id || user?.uid || '';
    if (!profileId || profileId === 'undefined') {
      setLoading(false);
      return;
    }
    
    const unsubProfile = onSnapshot(doc(db, 'profiles', profileId), (doc) => {
      if (doc.exists()) setProfile({ id: doc.id, ...doc.data() } as Profile);
    });

    const unsubMemberPresences = onSnapshot(
      query(collectionGroup(db, 'presences'), where('memberId', '==', profileId)),
      (snapshot) => {
        setMemberPresences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence)));
      }
    );

    const unsubAllPresences = onSnapshot(collectionGroup(db, 'presences'), (snapshot) => {
      setAllPresences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presence)));
    });

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('memberId', '==', profileId)),
      (snapshot) => {
        setMemberPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      }
    );

    setLoading(false);

    return () => {
      unsubProfile();
      unsubMemberPresences();
      unsubAllPresences();
      unsubPayments();
    };
  }, [user, forcedProfileId]);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Carregando suas conquistas...</p>
      </div>
    );
  }

  const earnedBadges = calculateBadges(profile.id, memberPresences, allPresences, memberPayments);
  const earnedIds = new Set(earnedBadges.map(b => b.id));

  // Define potential badges and their progress criteria
  const potentialBadges = [
    {
      id: 'top-3-month',
      title: 'Top 3 do Mês',
      description: 'Fique entre os 3 alunos com mais presenças no mês atual.',
      icon: 'Trophy',
      check: () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthPresences = allPresences.filter(p => {
          const d = new Date(p.timestamp);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const memberCounts = currentMonthPresences.reduce((acc, p) => {
          acc[p.memberId] = (acc[p.memberId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const sortedMembers = (Object.entries(memberCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);
        const memberIdx = sortedMembers.findIndex(([id]) => id === (profile as Profile).id);
        const memberCount = memberCounts[(profile as Profile).id] || 0;
        
        if (memberIdx !== -1 && memberIdx < 3) return { status: 'earned', progress: 100 };
        
        const thirdPlaceCount = sortedMembers.length >= 3 ? sortedMembers[2][1] : 1;
        const progress = Math.min(99, Math.round((memberCount / (thirdPlaceCount + 1)) * 100));
        return { 
          status: 'pending', 
          progress, 
          message: `${memberCount} presenças. Precisa superar o 3º lugar (${thirdPlaceCount}).`
        };
      }
    },
    {
      id: 'top-5-month',
      title: 'Top 5 do Mês',
      description: 'Fique entre os 5 alunos com mais presenças no mês atual.',
      icon: 'TrendingUp',
      check: () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthPresences = allPresences.filter(p => {
          const d = new Date(p.timestamp);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const memberCounts = currentMonthPresences.reduce((acc, p) => {
          acc[p.memberId] = (acc[p.memberId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const sortedMembers = (Object.entries(memberCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);
        const memberIdx = sortedMembers.findIndex(([id]) => id === (profile as Profile).id);
        const memberCount = memberCounts[(profile as Profile).id] || 0;
        
        if (memberIdx !== -1 && memberIdx < 5) return { status: 'earned', progress: 100 };
        
        const fifthPlaceCount = sortedMembers.length >= 5 ? sortedMembers[4][1] : 1;
        const progress = Math.min(99, Math.round((memberCount / (fifthPlaceCount + 1)) * 100));
        return { 
          status: 'pending', 
          progress, 
          message: `${memberCount} presenças. Precisa superar o 5º lugar (${fifthPlaceCount}).`
        };
      }
    },
    {
      id: 'top-10-month',
      title: 'Top 10 do Mês',
      description: 'Fique entre os 10 alunos com mais presenças no mês atual.',
      icon: 'Award',
      check: () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthPresences = allPresences.filter(p => {
          const d = new Date(p.timestamp);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const memberCounts = currentMonthPresences.reduce((acc, p) => {
          acc[p.memberId] = (acc[p.memberId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const sortedMembers = (Object.entries(memberCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);
        const memberIdx = sortedMembers.findIndex(([id]) => id === (profile as Profile).id);
        const memberCount = memberCounts[(profile as Profile).id] || 0;
        
        if (memberIdx !== -1 && memberIdx < 10) return { status: 'earned', progress: 100 };
        
        const tenthPlaceCount = sortedMembers.length >= 10 ? sortedMembers[9][1] : 1;
        const progress = Math.min(99, Math.round((memberCount / (tenthPlaceCount + 1)) * 100));
        return { 
          status: 'pending', 
          progress, 
          message: `${memberCount} presenças. Precisa superar o 10º lugar (${tenthPlaceCount}).`
        };
      }
    },
    {
      id: '3-week',
      title: 'Fôlego de Atleta',
      description: 'Realize 3 check-ins em uma única semana.',
      icon: 'Zap',
      check: () => {
        const presencesByWeek = memberPresences.reduce((acc, p) => {
          const d = new Date(p.timestamp);
          const week = getWeekNumber(d);
          const key = `${d.getFullYear()}-W${week}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const maxInWeek = Math.max(0, ...(Object.values(presencesByWeek) as number[]));
        if (maxInWeek >= 3) return { status: 'earned', progress: 100 };
        return { status: 'pending', progress: Math.round((maxInWeek / 3) * 100), message: `${maxInWeek}/3 presenças em uma semana.` };
      }
    },
    {
      id: '4-weeks-row',
      title: 'Consistência Mensal',
      description: 'Treine sem faltar nenhuma semana por 4 semanas seguidas.',
      icon: 'Flame',
      check: () => {
        // Simplified streak check for UI progress
        const count = memberPresences.length;
        if (earnedIds.has('4-weeks-row')) return { status: 'earned', progress: 100 };
        return { status: 'pending', progress: Math.min(90, count * 10), message: 'Mantenha a frequência semanal.' };
      }
    },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center gap-5">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Trophy className="text-white w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Suas Conquistas</h2>
          <p className="text-slate-500 text-sm font-medium">Acompanhe sua evolução e desbloqueie novos marcos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {potentialBadges.map((badge) => {
          const { status, progress, message } = badge.check();
          const Icon = getBadgeIcon(badge.icon);
          const isEarned = status === 'earned';

          return (
            <div 
              key={badge.id}
              className={cn(
                "p-6 rounded-3xl border transition-all relative overflow-hidden group",
                isEarned 
                  ? "bg-white border-emerald-100 shadow-md shadow-emerald-500/5" 
                  : "bg-slate-50/50 border-slate-200 grayscale"
              )}
            >
              {isEarned && (
                <div className="absolute top-0 right-0 p-3">
                  <div className="bg-emerald-500 text-white p-1 rounded-full animate-bounce">
                    <Star className="w-3 h-3 fill-white" />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  isEarned ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className={cn("font-bold text-lg leading-tight", isEarned ? "text-slate-900" : "text-slate-400")}>
                    {badge.title}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                    {isEarned ? 'Desbloqueado' : 'Em Progresso'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                {badge.description}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{message}</span>
                  <span className={cn("text-xs font-black", isEarned ? "text-emerald-600" : "text-indigo-600")}>
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isEarned ? "bg-emerald-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50" />
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/20 shadow-2xl shrink-0">
            <Star className="w-16 h-16 md:w-20 md:h-20 text-amber-400 fill-amber-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-4">Mestre da Perseverança</h3>
            <p className="text-indigo-100 text-sm md:text-base font-medium leading-relaxed max-w-xl opacity-80">
              Cada gota de suor no tatame é um passo em direção à sua melhor versão. Suas conquistas não são apenas medalhas virtuais, são o reflexo da sua alma de guerreiro. Mantenha o foco!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
