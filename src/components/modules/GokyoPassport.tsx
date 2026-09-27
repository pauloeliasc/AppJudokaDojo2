import React, { useState } from 'react';
import { GOKYO_TECHNIQUES, GOKYO_GROUPS, GokyoTechnique, isTechniqueRequiredForBelt, getBeltOrder } from '../../data/gokyoData';
import { Profile, UserRole } from '../../types';
import { useAuth } from '../../AuthContext';
import { db, doc } from '../../lib/firebase';
import { updateDoc } from 'firebase/firestore';
import { 
  BookOpen, CheckCircle2, Star, Search, Filter, ChevronDown, ChevronUp, 
  Award, ShieldCheck, Sparkles, User, Info, Check, AlertCircle, X, MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';

interface GokyoPassportProps {
  currentProfile: Profile | null;
  allProfiles?: Profile[];
}

export default function GokyoPassport({ currentProfile, allProfiles = [] }: GokyoPassportProps) {
  const { user } = useAuth();
  
  const isSenseiOrAssistant = user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSOR || user?.role === UserRole.ASSISTANT;

  // Selected student to view/evaluate (defaults to currentProfile or first student)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentProfile?.id || '');
  const [selectedGroup, setSelectedGroup] = useState<string>('my-belt-cumulative');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);
  const [updatingTechId, setUpdatingTechId] = useState<string | null>(null);

  // Modal for Sensei feedback / notes without window.prompt
  const [editingNoteTech, setEditingNoteTech] = useState<GokyoTechnique | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The student being evaluated
  const student = allProfiles.find(p => p.id === selectedStudentId) || currentProfile;

  const studentGrade = student?.currentGrade || 'Branca';
  const progressData = student?.gokyoProgress || {};
  const studentOrder = getBeltOrder(studentGrade);

  // Techniques required cumulatively for this student's belt (Branca até a faixa atual)
  const requiredTechniquesForStudent = GOKYO_TECHNIQUES.filter(tech => 
    isTechniqueRequiredForBelt(tech, studentGrade)
  );

  // Compute techniques matching current filter
  const filteredTechniques = GOKYO_TECHNIQUES.filter(tech => {
    // 1. Group / Belt filter
    if (selectedGroup === 'my-belt-cumulative') {
      // Regra do Judô: Faixa atual e todas as faixas anteriores
      if (!isTechniqueRequiredForBelt(tech, studentGrade)) return false;
    } else if (selectedGroup === 'my-belt-only') {
      // Apenas as técnicas introduzidas exatamente nesta faixa
      const matchBelt = tech.introducedAtBelt.toLowerCase().trim() === studentGrade.toLowerCase().trim() ||
        tech.targetBelts[0]?.toLowerCase().trim() === studentGrade.toLowerCase().trim();
      if (!matchBelt) return false;
    } else if (selectedGroup !== 'all') {
      if (tech.group !== selectedGroup) return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = tech.name.toLowerCase().includes(q);
      const matchMeaning = tech.meaning.toLowerCase().includes(q);
      const matchCategory = tech.category.toLowerCase().includes(q);
      const matchJapanese = tech.japanese.toLowerCase().includes(q);
      const matchBelt = tech.introducedAtBelt.toLowerCase().includes(q);
      if (!matchName && !matchMeaning && !matchCategory && !matchJapanese && !matchBelt) return false;
    }

    return true;
  });

  // Calculate stats
  const totalGokyoCount = GOKYO_TECHNIQUES.length;
  const requiredCount = requiredTechniquesForStudent.length;
  
  // Mastered / verified among required techniques
  const masteredRequiredCount = requiredTechniquesForStudent.filter(t => {
    const s = progressData[t.id]?.status;
    return s === 'mastered' || s === 'verified';
  }).length;

  const totalMasteredCount = Object.values(progressData).filter(p => p.status === 'mastered' || p.status === 'verified').length;
  const totalVerifiedCount = Object.values(progressData).filter(p => p.status === 'verified').length;
  const currentBeltProgressPercent = requiredCount > 0 ? Math.round((masteredRequiredCount / requiredCount) * 100) : 0;

  // Update technique status in Firestore
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
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 }
        });
      }
    } catch (err: any) {
      console.error("Failed to update gokyo technique status:", err);
      setErrorMessage("Erro ao salvar progresso: " + (err.message || ''));
    } finally {
      setUpdatingTechId(null);
    }
  };

  const getBeltColor = (belt: string = '') => {
    const b = belt.toLowerCase();
    if (b.includes('cinza')) return 'bg-slate-400 text-white';
    if (b.includes('azul')) return 'bg-blue-600 text-white';
    if (b.includes('amarela')) return 'bg-amber-400 text-slate-900';
    if (b.includes('laranja')) return 'bg-orange-500 text-white';
    if (b.includes('verde')) return 'bg-emerald-600 text-white';
    if (b.includes('roxa')) return 'bg-purple-600 text-white';
    if (b.includes('marrom')) return 'bg-amber-900 text-white';
    if (b.includes('preta')) return 'bg-slate-950 text-white';
    return 'bg-white text-slate-900 border border-slate-300';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 overflow-hidden shrink-0">
            <img src="./logo.png" alt="Judoka Dojô" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Gokyo do Judô
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Kodokan
              </span>
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Passaporte de técnicas cumulativas (faixa atual + anteriores), passos e avaliação do Sensei.
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

      {/* Student Passport Card Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black select-none pointer-events-none">
          五教
        </div>

        <div className="space-y-3 z-10 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
              getBeltColor(studentGrade)
            )}>
              🥋 Faixa {studentGrade}
            </span>
            <span className="text-xs text-indigo-200 font-bold">
              • Passaporte de {student?.fullName || 'Judoca'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
              Conteúdo Cumulativo
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            Exigidas até sua faixa: {masteredRequiredCount} de {requiredCount} Golpes Dominados
          </h3>

          <p className="text-xs text-slate-300 font-medium">
            💡 No Judô tradicional, um judoca faixa <strong className="text-amber-300">{studentGrade}</strong> deve conhecer todas as técnicas desde a faixa Branca até a sua faixa atual.
          </p>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-white/10 rounded-full h-3.5 p-0.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(currentBeltProgressPercent, 4)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 font-bold">
              <span>{currentBeltProgressPercent}% das técnicas do seu nível dominadas</span>
              <span className="text-emerald-300 flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-300" /> {totalVerifiedCount} validadas pelo Sensei
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 z-10 shrink-0 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="p-4 bg-white/10 rounded-2xl text-center border border-white/10 flex-1 md:flex-initial min-w-[100px]">
            <span className="text-2xl font-black text-amber-300 leading-none">{masteredRequiredCount}/{requiredCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mt-1">Exigidas ({studentGrade})</span>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-center border border-white/10 flex-1 md:flex-initial min-w-[90px]">
            <span className="text-2xl font-black text-emerald-300 leading-none">{totalVerifiedCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mt-1">Aprovadas Sensei</span>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-center border border-white/10 flex-1 md:flex-initial min-w-[90px]">
            <span className="text-2xl font-black text-indigo-300 leading-none">{totalMasteredCount}/{totalGokyoCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block mt-1">Total Gokyo</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar golpe pelo nome, tradução, faixa ou categoria (ex: Seoi, Ashi-waza, Amarela)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-xs transition-colors"
          />
        </div>

        {/* Group Filter Tabs / Select */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
          <button
            onClick={() => setSelectedGroup('my-belt-cumulative')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              selectedGroup === 'my-belt-cumulative'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>🥋 Cumulativo (Branca até {studentGrade})</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              selectedGroup === 'my-belt-cumulative' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            )}>
              {requiredCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedGroup('my-belt-only')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              selectedGroup === 'my-belt-only'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Apenas Novas da Faixa {studentGrade}
          </button>

          {GOKYO_GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                selectedGroup === g.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Techniques List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTechniques.map((tech) => {
          const isExpanded = expandedTechId === tech.id;
          const statusObj = progressData[tech.id];
          const status = statusObj?.status || 'not_started';
          const isVerified = status === 'verified';
          const isMastered = status === 'mastered' || isVerified;
          const isLearning = status === 'learning';

          const isCurrentBeltTech = tech.introducedAtBelt.toLowerCase().trim() === studentGrade.toLowerCase().trim();
          const isPastBeltTech = tech.minBeltOrder < studentOrder;
          const isFutureBeltTech = tech.minBeltOrder > studentOrder;

          return (
            <div 
              key={tech.id}
              className={cn(
                "bg-white rounded-3xl border transition-all shadow-sm overflow-hidden flex flex-col justify-between",
                isVerified ? "border-emerald-300 ring-2 ring-emerald-500/10" :
                isMastered ? "border-indigo-200" :
                isLearning ? "border-amber-200" : "border-slate-200 hover:border-slate-300"
              )}
            >
              {/* Card Header */}
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

                      {/* Belt Requirement Badge */}
                      {isCurrentBeltTech ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          ✨ Novidade da Faixa {tech.introducedAtBelt}
                        </span>
                      ) : isPastBeltTech ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          Exigida desde: Faixa {tech.introducedAtBelt}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          Faixa Futura: {tech.introducedAtBelt}
                        </span>
                      )}
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

                {/* Sensei Validation Note if present */}
                {statusObj?.notes && (
                  <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nota do Sensei: {statusObj.notes}</span>
                  </div>
                )}
              </div>

              {/* Expandable Kuzushi / Tsukuri / Kake Breakdown */}
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

              {/* Bottom Actions Footer */}
              <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setExpandedTechId(isExpanded ? null : tech.id)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? 'Menos detalhes' : 'Passo a passo (Kuzushi/Tsukuri/Kake)'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Action buttons depending on user role */}
                <div className="flex items-center gap-1.5">
                  {isSenseiOrAssistant ? (
                    // Sensei / Assistant actions
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
                        <span>{isVerified ? 'Desmarcar Sensei' : 'Aprovar Técnica ⭐'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingNoteTech(tech);
                          setNoteText(statusObj?.notes || "");
                        }}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                        title="Adicionar Anotação / Feedback do Sensei"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    // Student actions (checklist)
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateStatus(tech.id, isMastered ? 'not_started' : 'mastered')}
                        disabled={updatingTechId === tech.id || isVerified}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                          isMastered
                            ? "bg-indigo-600 text-white"
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

        {filteredTechniques.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-base">Nenhuma técnica encontrada</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente selecionar outro grupo do Gokyo ou remover o filtro de busca textual.
            </p>
          </div>
        )}
      </div>

      {/* Sensei Note Feedback Modal */}
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
              Escreva orientações ou pontos de correção para o aluno <strong>{student?.fullName}</strong> praticar no dojô:
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Excelente entrada de quadril, atentar para a tração contínua da manga no kake..."
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
    </div>
  );
}
