import React, { useState, useMemo } from 'react';
import { 
  GOKYO_TECHNIQUES, 
  BELT_HIERARCHY, 
  GokyoTechnique, 
  BeltRankInfo, 
  getBeltOrder, 
  isTechniqueRequiredForBelt 
} from '../../data/gokyoData';
import { Profile, UserRole } from '../../types';
import { useAuth } from '../../AuthContext';
import { db, doc } from '../../lib/firebase';
import { updateDoc } from 'firebase/firestore';
import { 
  BookOpen, CheckCircle2, Star, Search, Filter, ChevronDown, ChevronUp, 
  Award, ShieldCheck, Sparkles, User, Info, Check, AlertCircle, X, 
  MessageSquare, Lock, Eye, Layers, Compass, Play, ExternalLink, Video
} from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';
import KodokanVideoModal from './KodokanVideoModal';
import { KODOKAN_PLAYLIST_URL } from '../../data/kodokanVideos';

export interface GokyoProps {
  currentProfile?: Profile | null;
  allProfiles?: Profile[];
}

export function Gokyo({ currentProfile = null, allProfiles = [] }: GokyoProps) {
  const { user } = useAuth();
  const isSenseiOrAssistant = user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSOR || user?.role === UserRole.ASSISTANT;

  // Selected student to evaluate (defaults to currentProfile or first student)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentProfile?.id || '');
  
  // Core filter rule: Aluno vê apenas os golpes da sua faixa atual e anteriores (default: true)
  const [onlyCurrentAndPreviousBelts, setOnlyCurrentAndPreviousBelts] = useState<boolean>(true);
  
  // Optional specific belt filter ('all' means all authorized belts, or e.g. 'Azul')
  const [selectedBeltFilter, setSelectedBeltFilter] = useState<string>('all');
  
  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expandable technique details
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);
  const [updatingTechId, setUpdatingTechId] = useState<string | null>(null);

  // Sensei note feedback modal
  const [editingNoteTech, setEditingNoteTech] = useState<GokyoTechnique | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Kodokan official video demonstration modal
  const [activeVideoTech, setActiveVideoTech] = useState<GokyoTechnique | null>(null);

  // Resolve current active student
  const student = allProfiles.find(p => p.id === selectedStudentId) || currentProfile;
  const studentGrade = student?.currentGrade || 'Branca';
  const progressData = student?.gokyoProgress || {};
  const studentBeltOrder = getBeltOrder(studentGrade);

  // Group techniques by belt
  const techniquesByBelt = useMemo(() => {
    const map = new Map<string, { beltInfo: BeltRankInfo; techniques: GokyoTechnique[] }>();

    // Initialize all belts in order
    BELT_HIERARCHY.forEach(belt => {
      map.set(belt.name, { beltInfo: belt, techniques: [] });
    });

    // Distribute techniques based on introducedAtBelt
    GOKYO_TECHNIQUES.forEach(tech => {
      // Find matching belt or fallback to Branca
      const beltName = BELT_HIERARCHY.find(b => 
        b.name.toLowerCase() === tech.introducedAtBelt.toLowerCase() ||
        tech.targetBelts[0]?.toLowerCase() === b.name.toLowerCase()
      )?.name || 'Branca';

      const entry = map.get(beltName);
      if (entry) {
        entry.techniques.push(tech);
      }
    });

    return map;
  }, []);

  // Filtered belt sections based on current user requirement:
  // "permitindo que o aluno veja apenas os golpes da sua faixa atual e anteriores"
  const visibleBeltSections = useMemo(() => {
    return BELT_HIERARCHY.filter(belt => {
      // 1. Belt hierarchy constraint
      if (onlyCurrentAndPreviousBelts && belt.order > studentBeltOrder) {
        return false;
      }

      // 2. Specific belt filter
      if (selectedBeltFilter !== 'all' && belt.name !== selectedBeltFilter) {
        return false;
      }

      const group = techniquesByBelt.get(belt.name);
      if (!group || group.techniques.length === 0) return false;

      // 3. Search / Category filter check if at least one technique in this belt matches
      const hasMatchingTech = group.techniques.some(tech => {
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'nage' && tech.category.includes('waza') && (tech.category.includes('Ashi') || tech.category.includes('Te') || tech.category.includes('Koshi') || tech.category.includes('Sutemi'))) {
            // Nage match
          } else if (selectedCategory === 'ne' && (tech.category.includes('Osaekomi') || tech.category.includes('Shime') || tech.category.includes('Kansetsu'))) {
            // Ne-waza match
          } else if (tech.category !== selectedCategory) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = tech.name.toLowerCase().includes(q);
          const matchMeaning = tech.meaning.toLowerCase().includes(q);
          const matchCategory = tech.category.toLowerCase().includes(q);
          const matchJapanese = tech.japanese.toLowerCase().includes(q);
          if (!matchName && !matchMeaning && !matchCategory && !matchJapanese) return false;
        }

        return true;
      });

      return hasMatchingTech;
    });
  }, [techniquesByBelt, onlyCurrentAndPreviousBelts, studentBeltOrder, selectedBeltFilter, selectedCategory, searchQuery]);

  // Overall statistics for student's required syllabus (Branca até a faixa atual)
  const requiredTechniques = useMemo(() => {
    return GOKYO_TECHNIQUES.filter(tech => isTechniqueRequiredForBelt(tech, studentGrade));
  }, [studentGrade]);

  const masteredRequiredCount = useMemo(() => {
    return requiredTechniques.filter(t => {
      const s = progressData[t.id]?.status;
      return s === 'mastered' || s === 'verified';
    }).length;
  }, [requiredTechniques, progressData]);

  const verifiedCount = useMemo(() => {
    return Object.values(progressData).filter(p => p.status === 'verified').length;
  }, [progressData]);

  const currentBeltProgressPercent = requiredTechniques.length > 0 
    ? Math.round((masteredRequiredCount / requiredTechniques.length) * 100) 
    : 0;

  // Handle status update
  const handleUpdateStatus = async (
    techId: string, 
    newStatus: 'learning' | 'mastered' | 'verified' | 'not_started',
    notes?: string
  ) => {
    if (!student?.id) return;
    setUpdatingTechId(techId);
    setErrorMessage(null);

    try {
      const currentMap = { ...(student.gokyoProgress || {}) };
      if (newStatus === 'not_started') {
        delete currentMap[techId];
      } else {
        currentMap[techId] = {
          status: newStatus,
          verifiedBy: isSenseiOrAssistant ? (user?.name || 'Sensei') : undefined,
          verifiedAt: isSenseiOrAssistant ? new Date().toISOString() : undefined,
          notes: notes !== undefined ? notes : (currentMap[techId]?.notes || ''),
          updatedAt: new Date().toISOString()
        };
      }

      await updateDoc(doc(db, 'profiles', student.id), {
        gokyoProgress: currentMap
      });

      if (newStatus === 'mastered' || newStatus === 'verified') {
        confetti({
          particleCount: 30,
          spread: 55,
          origin: { y: 0.7 }
        });
      }
    } catch (err: any) {
      console.error("Erro ao salvar progresso Gokyo:", err);
      setErrorMessage("Não foi possível atualizar o golpe: " + (err.message || ''));
    } finally {
      setUpdatingTechId(null);
    }
  };

  const getBeltColorBadge = (beltName: string) => {
    const b = beltName.toLowerCase();
    if (b.includes('cinza')) return 'bg-slate-500 text-white';
    if (b.includes('azul')) return 'bg-blue-600 text-white';
    if (b.includes('amarela')) return 'bg-amber-400 text-slate-950';
    if (b.includes('laranja')) return 'bg-orange-500 text-white';
    if (b.includes('verde')) return 'bg-emerald-600 text-white';
    if (b.includes('roxa')) return 'bg-purple-600 text-white';
    if (b.includes('marrom')) return 'bg-amber-900 text-white';
    if (b.includes('preta')) return 'bg-slate-950 text-white border border-slate-700';
    return 'bg-white text-slate-800 border border-slate-300';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xs border border-slate-200 overflow-hidden shrink-0">
            <img src="./logo.png" alt="Judoka Dojô" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Gokyo do Judô
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Organizado por Faixa
              </span>
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Técnicas oficiais do Judô tradicional Kodokan organizadas cronologicamente por graduação de faixa.
            </p>
          </div>
        </div>

        {/* Student Selector for Sensei / Assistant */}
        {isSenseiOrAssistant && allProfiles.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-xs">
            <User className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Avaliando Aluno:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
              >
                {allProfiles
                  .filter(p => !p.isPointer && p.status !== 'inactive')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} (Faixa {p.currentGrade || 'Branca'})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </header>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Belt Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black select-none pointer-events-none">
          五教
        </div>

        <div className="space-y-3 z-10 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
              getBeltColorBadge(studentGrade)
            )}>
              🥋 Faixa Atual: {studentGrade}
            </span>
            <span className="text-xs text-indigo-200 font-bold">
              • Judoca: {student?.fullName || 'Aluno'}
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            Programa Obrigatório: {masteredRequiredCount} de {requiredTechniques.length} Golpes Dominados
          </h3>

          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Exibindo os golpes correspondentes à sua <strong>faixa atual ({studentGrade})</strong> e a <strong>todas as faixas anteriores</strong>, conforme a tradição do Judô.
          </p>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-white/10 rounded-full h-3.5 p-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(currentBeltProgressPercent, 4)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 font-bold">
              <span>{currentBeltProgressPercent}% concluído até sua faixa</span>
              <span className="text-emerald-300 flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-300" /> {verifiedCount} validados pelo Sensei
              </span>
            </div>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="flex gap-3 z-10 shrink-0 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="p-4 bg-white/10 rounded-2xl text-center border border-white/10 flex-1 md:flex-initial min-w-[100px]">
            <span className="text-2xl font-black text-amber-300 leading-none">{masteredRequiredCount}/{requiredTechniques.length}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mt-1">Exigidos ({studentGrade})</span>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-center border border-white/10 flex-1 md:flex-initial min-w-[90px]">
            <span className="text-2xl font-black text-emerald-300 leading-none">{verifiedCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mt-1">Aprovados Sensei</span>
          </div>
          <a
            href={KODOKAN_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 rounded-2xl text-center flex-1 md:flex-initial min-w-[95px] flex flex-col items-center justify-center transition-all group cursor-pointer"
            title="Abrir 100 Técnicas Kodokan × IJF no YouTube"
          >
            <Play className="w-5 h-5 text-red-400 fill-current group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-wider text-red-200 block mt-1">100 Vídeos</span>
          </a>
        </div>
      </div>

      {/* Belt Scope Toggle & Filters Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: The Core User Requirement Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-black text-slate-900 tracking-tight block">
                Modo de Visualização por Faixa
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {onlyCurrentAndPreviousBelts 
                  ? `Exibindo apenas faixas autorizadas (Branca até ${studentGrade})`
                  : 'Exibindo todas as faixas do currículo (visão completa)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => {
                setOnlyCurrentAndPreviousBelts(true);
                setSelectedBeltFilter('all');
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                onlyCurrentAndPreviousBelts
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Apenas Minha Faixa e Anteriores ({studentGrade})</span>
            </button>

            <button
              onClick={() => setOnlyCurrentAndPreviousBelts(false)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                !onlyCurrentAndPreviousBelts
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Todas as Faixas</span>
            </button>
          </div>
        </div>

        {/* Row 2: Belt Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedBeltFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
              selectedBeltFilter === 'all'
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            )}
          >
            Todas as Faixas Permitidas ({visibleBeltSections.length})
          </button>

          {BELT_HIERARCHY
            .filter(b => !onlyCurrentAndPreviousBelts || b.order <= studentBeltOrder)
            .map(b => {
              const count = techniquesByBelt.get(b.name)?.techniques.length || 0;
              if (count === 0) return null;
              const isCurrent = b.order === studentBeltOrder;
              const isPast = b.order < studentBeltOrder;

              return (
                <button
                  key={b.name}
                  onClick={() => setSelectedBeltFilter(b.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                    selectedBeltFilter === b.name
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", getBeltColorBadge(b.name))} />
                  <span>{b.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    selectedBeltFilter === b.name ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}>
                    {count}
                  </span>
                  {isCurrent && <span className="text-[10px] font-black text-amber-500">★</span>}
                </button>
              );
            })}
        </div>

        {/* Row 3: Search and Category Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar técnica por nome, tradução ou kanji (ex: Seoi-Nage, Ashi-waza, Osaekomi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                selectedCategory === 'all' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Todas Técnicas
            </button>
            <button
              onClick={() => setSelectedCategory('nage')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                selectedCategory === 'nage' ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Nage-waza (Em Pé)
            </button>
            <button
              onClick={() => setSelectedCategory('ne')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                selectedCategory === 'ne' ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Ne-waza (Solo)
            </button>
          </div>
        </div>
      </div>

      {/* Belt-by-Belt Grouped Techniques List */}
      <div className="space-y-10">
        {visibleBeltSections.map((belt) => {
          const group = techniquesByBelt.get(belt.name);
          if (!group) return null;

          const isCurrentBelt = belt.order === studentBeltOrder;
          const isPastBelt = belt.order < studentBeltOrder;
          const isFutureBelt = belt.order > studentBeltOrder;

          // Filter techniques within this belt
          const techniquesInBelt = group.techniques.filter(tech => {
            if (selectedCategory !== 'all') {
              if (selectedCategory === 'nage' && tech.category.includes('waza') && (tech.category.includes('Ashi') || tech.category.includes('Te') || tech.category.includes('Koshi') || tech.category.includes('Sutemi'))) {
                // Match
              } else if (selectedCategory === 'ne' && (tech.category.includes('Osaekomi') || tech.category.includes('Shime') || tech.category.includes('Kansetsu'))) {
                // Match
              } else if (tech.category !== selectedCategory) {
                return false;
              }
            }

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              const matchName = tech.name.toLowerCase().includes(q);
              const matchMeaning = tech.meaning.toLowerCase().includes(q);
              const matchCategory = tech.category.toLowerCase().includes(q);
              const matchJapanese = tech.japanese.toLowerCase().includes(q);
              if (!matchName && !matchMeaning && !matchCategory && !matchJapanese) return false;
            }

            return true;
          });

          if (techniquesInBelt.length === 0) return null;

          return (
            <section key={belt.name} className="space-y-4">
              {/* Belt Header Section Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0",
                    getBeltColorBadge(belt.name)
                  )}>
                    🥋
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Faixa {belt.name}
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        ({belt.kyu})
                      </span>

                      {/* Status indicator */}
                      {isCurrentBelt ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Sua Faixa Atual
                        </span>
                      ) : isPastBelt ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Faixa Anterior (Repertório Exigido)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Faixa Futura
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {techniquesInBelt.length} técnica{techniquesInBelt.length > 1 ? 's' : ''} introduzida{techniquesInBelt.length > 1 ? 's' : ''} nesta graduação
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                    {techniquesInBelt.filter(t => progressData[t.id]?.status === 'mastered' || progressData[t.id]?.status === 'verified').length} / {techniquesInBelt.length} Dominadas
                  </span>
                </div>
              </div>

              {/* Techniques Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {techniquesInBelt.map((tech) => {
                  const isExpanded = expandedTechId === tech.id;
                  const statusObj = progressData[tech.id];
                  const status = statusObj?.status || 'not_started';
                  const isVerified = status === 'verified';
                  const isMastered = status === 'mastered' || isVerified;
                  const isLearning = status === 'learning';

                  return (
                    <div 
                      key={tech.id}
                      className={cn(
                        "bg-white rounded-3xl border transition-all shadow-xs overflow-hidden flex flex-col justify-between",
                        isVerified ? "border-emerald-300 ring-2 ring-emerald-500/10" :
                        isMastered ? "border-indigo-200" :
                        isLearning ? "border-amber-200" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {/* Card Content */}
                      <div className="p-5 sm:p-6 pb-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                                tech.category.includes('Ashi') ? "bg-blue-50 text-blue-700" :
                                tech.category.includes('Koshi') ? "bg-amber-50 text-amber-700" :
                                tech.category.includes('Te') ? "bg-purple-50 text-purple-700" :
                                tech.category.includes('Sutemi') ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700"
                              )}>
                                {tech.category}
                              </span>

                              <span className="text-[10px] text-slate-400 font-bold">
                                {tech.groupLabel}
                              </span>

                              <span className="text-[10px] text-slate-500 font-medium">
                                • {tech.difficulty}
                              </span>
                            </div>

                            <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                              {tech.name}
                              <span className="text-sm font-medium text-slate-400">{tech.japanese}</span>
                            </h4>
                            <p className="text-xs font-bold text-slate-600 mt-0.5">{tech.meaning}</p>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                                <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                Validado Sensei
                              </span>
                            ) : isMastered ? (
                              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                Dominado 🥋
                              </span>
                            ) : isLearning ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                Praticando
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                A Aprender
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                          {tech.description}
                        </p>

                        {/* Sensei Feedback Note if present */}
                        {statusObj?.notes && (
                          <div className="mt-3 p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Nota do Sensei: {statusObj.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Expandable Kuzushi / Tsukuri / Kake Guide */}
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs animate-in slide-in-from-top-2 duration-150">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block mb-0.5">1. Kuzushi (Desequilíbrio)</span>
                              <p className="text-[11px] text-slate-700 leading-snug font-medium">{tech.kuzushi}</p>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block mb-0.5">2. Tsukuri (Preparação)</span>
                              <p className="text-[11px] text-slate-700 leading-snug font-medium">{tech.tsukuri}</p>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block mb-0.5">3. Kake (Projeção)</span>
                              <p className="text-[11px] text-slate-700 leading-snug font-medium">{tech.kake}</p>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2 text-amber-950">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider block text-amber-800">Dica do Sensei:</span>
                              <p className="text-xs font-semibold leading-relaxed">{tech.senseiTips}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedTechId(isExpanded ? null : tech.id)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Menos detalhes' : 'Passo a passo'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => setActiveVideoTech(tech)}
                            className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                            title="Assistir demonstração oficial Kodokan × IJF"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Vídeo</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isSenseiOrAssistant ? (
                            // Sensei approval
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStatus(tech.id, isVerified ? 'mastered' : 'verified')}
                                disabled={updatingTechId === tech.id}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                  isVerified
                                    ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95"
                                )}
                              >
                                <Star className={cn("w-3.5 h-3.5", isVerified && "fill-current")} />
                                <span>{isVerified ? 'Desmarcar' : 'Aprovar ⭐'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingNoteTech(tech);
                                  setNoteText(statusObj?.notes || "");
                                }}
                                className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                                title="Adicionar Feedback do Sensei"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            // Student checklist
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStatus(tech.id, isMastered ? 'not_started' : 'mastered')}
                                disabled={updatingTechId === tech.id || isVerified}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                  isMastered
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95"
                                )}
                                title={isVerified ? "Esta técnica já foi validada pelo Sensei" : undefined}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isMastered ? 'Dominada 🥋' : 'Marcar Dominada'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {visibleBeltSections.length === 0 && (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-base">Nenhuma técnica encontrada para os filtros selecionados</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente redefinir a busca textual ou selecionar &quot;Ver Todas as Faixas&quot; no topo.
            </p>
          </div>
        )}
      </div>

      {/* Sensei Feedback Note Modal */}
      {editingNoteTech && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-black text-slate-900 text-base">
                  Feedback do Sensei: {editingNoteTech.name}
                </h4>
              </div>
              <button 
                onClick={() => setEditingNoteTech(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Anotação técnica para o aluno <strong>{student?.fullName}</strong>:
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Ótima pegada no kumi-kata, lembrar de girar o quadril antes de estender as pernas..."
              rows={4}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingNoteTech(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const currentStatus = progressData[editingNoteTech.id]?.status || 'learning';
                  await handleUpdateStatus(editingNoteTech.id, currentStatus, noteText);
                  setEditingNoteTech(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Salvar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kodokan Video Demonstration Modal */}
      {activeVideoTech && (
        <KodokanVideoModal
          techniqueName={activeVideoTech.name}
          techniqueDetails={activeVideoTech}
          isOpen={true}
          onClose={() => setActiveVideoTech(null)}
        />
      )}
    </div>
  );
}

export default Gokyo;
