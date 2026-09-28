import React, { useState, useMemo } from 'react';
import { Profile, UserRole } from '../../types';
import { 
  Cake, 
  Gift, 
  PartyPopper, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  MessageCircle, 
  Sparkles, 
  Share2, 
  Check, 
  Users, 
  Clock, 
  HeartHandshake,
  Award
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

interface BirthdaysBoardProps {
  profiles: Profile[];
  title?: string;
  defaultPeriod?: 'month' | 'week';
  className?: string;
}

interface ParsedBirthday {
  profile: Profile;
  day: number;
  month: number;
  year?: number;
  turningAge?: number;
  isToday: boolean;
  isThisWeek: boolean;
  daysUntil: number;
  weekdayName: string;
}

export default function BirthdaysBoard({
  profiles,
  title = "Quadro de Aniversariantes",
  defaultPeriod = 'month',
  className
}: BirthdaysBoardProps) {
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  const [period, setPeriod] = useState<'month' | 'week'>(defaultPeriod);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'staff'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute start and end of current week
  const { weekStart, weekEnd } = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay(), 0, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { weekStart: start, weekEnd: end };
  }, [today]);

  // Parse all profiles into parsed birthdays
  const allParsed = useMemo(() => {
    const list: ParsedBirthday[] = [];

    (profiles || []).forEach(p => {
      // Ignore invalid, inactive, or pointer profiles
      if (!p.birthDate || p.status === 'inactive' || p.status === 'blocked' || p.status === 'suspended' || p.isPointer) {
        return;
      }

      const str = p.birthDate.trim();
      let day: number | null = null;
      let month: number | null = null;
      let year: number | null = null;

      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      } else if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          }
        }
      }

      if (!day || !month || isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1 || day > 31) {
        return;
      }

      const validYear = year && !isNaN(year) && year > 1920 && year <= currentYear ? year : undefined;
      const isToday = month === currentMonth && day === currentDay;

      // Check if birthday falls in current week
      const bdayDateThisYear = new Date(currentYear, month - 1, day, 12, 0, 0);
      const bdayDateNextYear = new Date(currentYear + 1, month - 1, day, 12, 0, 0);
      const bdayDatePrevYear = new Date(currentYear - 1, month - 1, day, 12, 0, 0);

      const isThisWeek = (
        (bdayDateThisYear >= weekStart && bdayDateThisYear <= weekEnd) ||
        (bdayDateNextYear >= weekStart && bdayDateNextYear <= weekEnd) ||
        (bdayDatePrevYear >= weekStart && bdayDatePrevYear <= weekEnd)
      );

      // Days until next birthday
      let nextBday = new Date(currentYear, month - 1, day, 0, 0, 0);
      const todayMidnight = new Date(currentYear, today.getMonth(), today.getDate(), 0, 0, 0);
      if (nextBday < todayMidnight) {
        nextBday = new Date(currentYear + 1, month - 1, day, 0, 0, 0);
      }
      const daysUntil = Math.round((nextBday.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

      // Turning age this year
      let turningAge: number | undefined;
      if (validYear) {
        turningAge = currentYear - validYear;
      }

      // Weekday name for this year's birthday
      const weekdayName = WEEKDAY_NAMES[bdayDateThisYear.getDay()];

      list.push({
        profile: p,
        day,
        month,
        year: validYear,
        turningAge,
        isToday,
        isThisWeek,
        daysUntil,
        weekdayName
      });
    });

    return list;
  }, [profiles, currentMonth, currentDay, currentYear, weekStart, weekEnd, today]);

  // Total counts for summary indicators
  const totalInCurrentMonth = useMemo(() => {
    return allParsed.filter(b => b.month === currentMonth).length;
  }, [allParsed, currentMonth]);

  const totalInCurrentWeek = useMemo(() => {
    return allParsed.filter(b => b.isThisWeek).length;
  }, [allParsed]);

  const totalToday = useMemo(() => {
    return allParsed.filter(b => b.isToday).length;
  }, [allParsed]);

  // Filter according to period, selected month, and filters
  const displayedBirthdays = useMemo(() => {
    let list = allParsed;

    if (period === 'month') {
      list = list.filter(b => b.month === selectedMonth);
      // Sort chronologically by day of month (1 to 31)
      list.sort((a, b) => a.day - b.day || a.profile.fullName.localeCompare(b.profile.fullName));
    } else {
      // Period === 'week'
      list = list.filter(b => b.isThisWeek);
      // Sort: Today first, then ascending by day of week
      list.sort((a, b) => {
        if (a.isToday && !b.isToday) return -1;
        if (!a.isToday && b.isToday) return 1;
        return a.day - b.day || a.profile.fullName.localeCompare(b.profile.fullName);
      });
    }

    // Role filter
    if (roleFilter === 'students') {
      list = list.filter(b => !b.profile.role || b.profile.role === UserRole.STUDENT);
    } else if (roleFilter === 'staff') {
      list = list.filter(b => b.profile.role === UserRole.PROFESSOR || b.profile.role === UserRole.ADMIN || b.profile.role === UserRole.ASSISTANT);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b => 
        (b.profile.fullName || '').toLowerCase().includes(q) ||
        (b.profile.currentGrade || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [allParsed, period, selectedMonth, roleFilter, searchTerm]);

  // WhatsApp and Congratulations Message
  const getWhatsAppMessage = (name: string, isSensei: boolean) => {
    const greeting = isSensei ? `Oss, Sensei ${name}!` : `Olá ${name}!`;
    return encodeURIComponent(
      `${greeting} Parabéns pelo seu aniversário! 🎉🎂 Toda a família Judoka Dojô lhe deseja muita saúde, paz, alegria e muitas vitórias no tatame e na vida! Oss! 🥋`
    );
  };

  const handleCopyMessage = (b: ParsedBirthday) => {
    const isSensei = b.profile.role === UserRole.PROFESSOR;
    const msg = isSensei 
      ? `Oss, Sensei ${b.profile.fullName}! Parabéns pelo seu aniversário! 🎉🎂 Toda a família Judoka Dojô lhe deseja muita saúde, paz e muitas vitórias no tatame! Oss! 🥋`
      : `Parabéns ${b.profile.fullName}! 🎉🎂 Toda a equipe do Judoka Dojô lhe deseja um feliz aniversário com muita saúde e conquistas! Oss! 🥋`;
    
    navigator.clipboard.writeText(msg);
    setCopiedId(b.profile.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const cleanPhone = (phone?: string) => {
    if (!phone) return null;
    const d = phone.replace(/\D/g, '');
    if (!d) return null;
    return d.length === 10 || d.length === 11 ? `55${d}` : d;
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { label: 'Admin', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case UserRole.PROFESSOR:
        return { label: 'Sensei 🥋', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case UserRole.ASSISTANT:
        return { label: 'Ajudante', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return null;
    }
  };

  const getBeltColorStyle = (grade?: string) => {
    const g = (grade || '').toLowerCase();
    if (g.includes('preta')) return 'bg-slate-900 text-white border-slate-700';
    if (g.includes('marrom')) return 'bg-amber-900 text-amber-100 border-amber-800';
    if (g.includes('roxa')) return 'bg-purple-700 text-white border-purple-600';
    if (g.includes('verde')) return 'bg-emerald-600 text-white border-emerald-500';
    if (g.includes('laranja')) return 'bg-orange-500 text-white border-orange-400';
    if (g.includes('amarela')) return 'bg-yellow-400 text-yellow-950 border-yellow-500 font-extrabold';
    if (g.includes('cinza')) return 'bg-slate-400 text-white border-slate-300';
    if (g.includes('azul')) return 'bg-blue-600 text-white border-blue-500';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className={cn("bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200/90 shadow-sm p-5 sm:p-8 flex flex-col space-y-6 transition-all", className)}>
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
            <Cake className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight">
                {title}
              </h3>
              {totalToday > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-xs animate-bounce">
                  <Sparkles className="w-3 h-3" />
                  {totalToday} {totalToday === 1 ? 'Aniversariante Hoje!' : 'Aniversariantes Hoje!'}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Celebre os aniversários dos nossos judocas e senseis do Dojô! 🎉
            </p>
          </div>
        </div>

        {/* Period Switcher: Month vs Week */}
        <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl self-start md:self-auto border border-slate-200/70 shadow-xs">
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all touch-manipulation select-none cursor-pointer",
              period === 'month'
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Calendar className="w-4 h-4 pointer-events-none" />
            <span className="pointer-events-none">Aniversariantes do Mês</span>
            <span className={cn(
              "px-2 py-0.5 text-[10px] rounded-full font-extrabold pointer-events-none",
              period === 'month' ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 text-slate-600"
            )}>
              {selectedMonth === currentMonth ? totalInCurrentMonth : allParsed.filter(b => b.month === selectedMonth).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all touch-manipulation select-none cursor-pointer",
              period === 'week'
                ? "bg-white text-pink-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Gift className="w-4 h-4 pointer-events-none" />
            <span className="pointer-events-none">Da Semana</span>
            <span className={cn(
              "px-2 py-0.5 text-[10px] rounded-full font-extrabold pointer-events-none",
              period === 'week' ? "bg-pink-50 text-pink-700" : "bg-slate-200 text-slate-600"
            )}>
              {totalInCurrentWeek}
            </span>
          </button>
        </div>
      </div>

      {/* Control Bar: Month Navigation (if Month) & Search / Role Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
        {period === 'month' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4 pointer-events-none" />
              </button>
              <div className="px-3 py-1.5 flex items-center gap-1.5 select-none">
                <span className="font-extrabold text-xs text-slate-800">
                  {MONTH_NAMES[selectedMonth - 1]}
                </span>
                {selectedMonth === currentMonth && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200/60">
                    Atual
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4 pointer-events-none" />
              </button>
            </div>

            {selectedMonth !== currentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonth)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 active:bg-indigo-50 bg-white border border-indigo-200 px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors touch-manipulation select-none cursor-pointer"
              >
                Mês Atual
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            <span>Semana de {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar aniversariante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs shrink-0 select-none">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors touch-manipulation cursor-pointer",
                roleFilter === 'all' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('students')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors touch-manipulation cursor-pointer",
                roleFilter === 'students' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Alunos
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('staff')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors touch-manipulation cursor-pointer",
                roleFilter === 'staff' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Senseis
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Birthdays */}
      {displayedBirthdays.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {displayedBirthdays.map((b) => {
              const roleBadge = getRoleBadge(b.profile.role);
              const phone = cleanPhone(b.profile.phoneNumber || b.profile.responsiblePhone);
              const isToday = b.isToday;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  key={b.profile.id}
                  className={cn(
                    "relative p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group",
                    isToday
                      ? "bg-gradient-to-br from-rose-50/90 via-pink-50/70 to-amber-50/60 border-rose-300 shadow-md ring-2 ring-rose-400/30"
                      : "bg-white hover:bg-slate-50/60 border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-indigo-200"
                  )}
                >
                  {/* Top Bar with Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-xs border-2",
                        isToday ? "border-rose-400 bg-rose-100 text-rose-800" : "border-white bg-slate-100 text-slate-700"
                      )}>
                        {b.profile.photoUrl ? (
                          <img
                            src={b.profile.photoUrl}
                            alt={b.profile.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{b.profile.fullName?.charAt(0)?.toUpperCase() || '?'}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm truncate leading-snug">
                          {b.profile.fullName}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {b.profile.currentGrade && (
                            <span className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                              getBeltColorStyle(b.profile.currentGrade)
                            )}>
                              {b.profile.currentGrade}
                            </span>
                          )}
                          {roleBadge && (
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wide",
                              roleBadge.bg
                            )}>
                              {roleBadge.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Content: Birthday date and relative time */}
                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        Dia {String(b.day).padStart(2, '0')} de {MONTH_NAMES[b.month - 1]}
                      </span>

                      {isToday ? (
                        <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                          🎉 HOJE!
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          {b.weekdayName.split('-')[0]}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      {b.turningAge ? (
                        <span className="font-semibold text-slate-600">
                          {isToday || b.daysUntil === 0 
                            ? `Completando ${b.turningAge} anos 🎂` 
                            : `${b.turningAge} anos`}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Aniversariante</span>
                      )}

                      {!isToday && (
                        <span className={cn(
                          "text-[10px] font-bold",
                          b.daysUntil > 0 && b.daysUntil <= 7 ? "text-amber-600" : "text-slate-400"
                        )}>
                          {b.daysUntil === 1 
                            ? 'Amanhã! 🎁' 
                            : b.daysUntil > 0 && b.daysUntil <= 31 
                              ? `Em ${b.daysUntil} dias` 
                              : `Dia ${b.day}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Bar: WhatsApp or Copy Message */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {phone ? (
                      <a
                        href={`https://wa.me/${phone}?text=${getWhatsAppMessage(b.profile.fullName, b.profile.role === UserRole.PROFESSOR)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <div className="flex-1 text-[10px] text-slate-400 font-medium italic flex items-center gap-1 pl-1">
                        <span>Sem telefone</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleCopyMessage(b)}
                      title="Copiar mensagem de parabéns"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      {copiedId === b.profile.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-8 sm:p-12 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <Cake className="w-7 h-7 text-slate-300" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">
            {period === 'month' 
              ? `Nenhum aniversariante encontrado em ${MONTH_NAMES[selectedMonth - 1]}`
              : "Nenhum aniversariante nesta semana"
            }
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchTerm 
              ? "Tente alterar os termos da busca ou os filtros aplicados."
              : period === 'month'
                ? "Navegue para outros meses no topo para planejar e comemorar os próximos aniversários do Dojô!"
                : "Foco nos treinos de Judô! Você pode também clicar em 'Aniversariantes do Mês' para ver todos do mês."
            }
          </p>

          {period === 'week' && totalInCurrentMonth > 0 && (
            <button
              onClick={() => setPeriod('month')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              Ver Aniversariantes de {MONTH_NAMES[currentMonth - 1]} ({totalInCurrentMonth})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
