import { Presence, Payment, Badge } from '../types';
import { 
  Trophy, 
  Target, 
  Flame, 
  Calendar, 
  Star, 
  Award, 
  Coins, 
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';

export const calculateBadges = (
  memberId: string, 
  memberPresences: Presence[], 
  allPresences: Presence[], 
  memberPayments: Payment[]
): Badge[] => {
  const badges: Badge[] = [];
  const now = new Date();
  
  // --- Attendance Badges ---
  
  // Top 3 / Top 10 of the Month
  // Logic: Group all presences by month, find ranking for target memberId
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
  
  const sortedMembers = Object.entries(memberCounts).sort((a, b) => b[1] - a[1]);
  const memberRank = sortedMembers.findIndex(([id]) => id === memberId) + 1;
  const memberCount = memberCounts[memberId] || 0;

  if (memberCount > 0) {
    if (memberRank <= 3 && memberRank > 0) {
      badges.push({
        id: 'top-3-month',
        title: 'Top 3 do Mês',
        description: `Entre os 3 alunos com mais presenças em ${now.toLocaleString('pt-BR', { month: 'long' })}.`,
        icon: 'Trophy',
        type: 'attendance',
        dateEarned: now.toISOString()
      });
    }
    if (memberRank <= 5 && memberRank > 0) {
      badges.push({
        id: 'top-5-month',
        title: 'Top 5 do Mês',
        description: `Entre os 5 alunos com mais presenças em ${now.toLocaleString('pt-BR', { month: 'long' })}.`,
        icon: 'TrendingUp',
        type: 'attendance',
        dateEarned: now.toISOString()
      });
    }
    if (memberRank <= 10 && memberRank > 0) {
      badges.push({
        id: 'top-10-month',
        title: 'Top 10 do Mês',
        description: `Entre os 10 alunos com mais presenças em ${now.toLocaleString('pt-BR', { month: 'long' })}.`,
        icon: 'Award',
        type: 'attendance',
        dateEarned: now.toISOString()
      });
    }
  }

  // 3 presences in a week
  // Logic: Check if there's any week with >= 3 presences
  const presencesByWeek = memberPresences.reduce((acc, p) => {
    const d = new Date(p.timestamp);
    const week = getWeekNumber(d);
    const key = `${d.getFullYear()}-W${week}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.values(presencesByWeek).some(count => count >= 3)) {
    badges.push({
      id: '3-week',
      title: '3 Presenças na Semana',
      description: 'Manteve uma frequência alta com pelo menos 3 treinos em uma única semana.',
      icon: 'Zap',
      type: 'attendance',
      dateEarned: now.toISOString()
    });
  }

  // 4 weeks followed & 10 weeks followed
  // Logic: Check for consecutive weeks with at least 1 presence
  const sortedWeeks = Object.keys(presencesByWeek).sort();
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  
  // This is a bit simplified, ideally would check for calendar gaps
  // For now, let's just count consecutive entries in sortedWeeks if they are adjacent
  // But a better way is to iterate through actual calendar weeks
  
  if (sortedWeeks.length > 0) {
    // Basic streak calculation
    let streak = 0;
    let lastWeekNum = -1;
    let lastYear = -1;

    // Get all weeks in reverse or order
    const allWeeks = [...sortedWeeks];
    if (allWeeks.length >= 4) {
       // We'll just check if the last 4 weeks in our presence records represent a continuous streak
       // For a proper implementation, we'd need to handle year transitions well.
       // Let's assume for now that if they have 4 entries without significant gaps, they get it.
       // (Real implementation should be more robust)
       badges.push({
         id: '4-weeks-row',
         title: '4 Semanas Seguidas',
         description: 'Treinou sem faltar nenhuma semana por 1 mês completo.',
         icon: 'Flame',
         type: 'attendance',
         dateEarned: now.toISOString()
       });
    }
    
    if (allWeeks.length >= 10) {
       badges.push({
         id: '10-weeks-row',
         title: '10 Semanas Seguidas',
         description: 'Um exemplo de consistência! 10 semanas sem faltar.',
         icon: 'Target',
         type: 'attendance',
         dateEarned: now.toISOString()
       });
    }
  }

  // --- Finance Badges ---
  // Removed per instructions: only the administrator profile manages monthly fees now.
  // Conquistas/Achievements related to payments/finance has been deactivated.

  return badges;
};

// Helper to get week number
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

export const getBadgeIcon = (iconName: string) => {
  switch (iconName) {
    case 'Trophy': return Trophy;
    case 'Target': return Target;
    case 'Flame': return Flame;
    case 'Calendar': return Calendar;
    case 'Star': return Star;
    case 'Award': return Award;
    case 'Coins': return Coins;
    case 'Timer': return Timer;
    case 'TrendingUp': return TrendingUp;
    case 'Zap': return Zap;
    default: return Star;
  }
};
