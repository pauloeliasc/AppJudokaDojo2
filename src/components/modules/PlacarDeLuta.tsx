import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundEffects } from '../../lib/soundEffects';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX, 
  ArrowLeftRight, Trophy, Bell, Award, Sparkles, Users, Clock, 
  ShieldAlert, Plus, Minus, Settings2, CheckCircle2, Flame, Tv
} from 'lucide-react';
import { Profile } from '../../types';
import { cn } from '../../lib/utils';

export interface PlacarDeLutaProps {
  profiles?: Profile[];
}

export function PlacarDeLuta({ profiles = [] }: PlacarDeLutaProps) {
  // --- Match Timer Configuration ---
  const [matchDuration, setMatchDuration] = useState<number>(240); // Standard 4 minutes in seconds
  const [timeLeft, setTimeLeft] = useState<number>(240);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isGoldenScore, setIsGoldenScore] = useState<boolean>(false);
  const [goldenScoreElapsed, setGoldenScoreElapsed] = useState<number>(0);

  // --- Competitor White (Shiro) ---
  const [shiroName, setShiroName] = useState<string>('Judoca Branco (Shiro)');
  const [shiroIppon, setShiroIppon] = useState<number>(0);
  const [shiroWazaari, setShiroWazaari] = useState<number>(0);
  const [shiroShido, setShiroShido] = useState<number>(0);

  // --- Competitor Blue (Ao) ---
  const [aoName, setAoName] = useState<string>('Judoca Azul (Ao)');
  const [aoIppon, setAoIppon] = useState<number>(0);
  const [aoWazaari, setAoWazaari] = useState<number>(0);
  const [aoShido, setAoShido] = useState<number>(0);

  // --- Osaekomi (Immobilization) Control ---
  const [osaekomiSide, setOsaekomiSide] = useState<'shiro' | 'ao' | null>(null);
  const [osaekomiSeconds, setOsaekomiSeconds] = useState<number>(0);

  // --- Match Status & Winner ---
  const [matchWinner, setMatchWinner] = useState<{
    side: 'shiro' | 'ao';
    name: string;
    reason: string;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<number>(4);
  const [customSeconds, setCustomSeconds] = useState<number>(0);

  const scoreboardContainerRef = useRef<HTMLDivElement>(null);

  // --- Match Finish Helper ---
  const handleDeclareWinner = useCallback((side: 'shiro' | 'ao', reason: string) => {
    setIsTimerRunning(false);
    setOsaekomiSide(null);
    const winnerName = side === 'shiro' ? shiroName : aoName;
    setMatchWinner({ side, name: winnerName, reason });

    if (soundEnabled) {
      soundEffects.playIpponCelebration();
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored
    }
  }, [shiroName, aoName, soundEnabled]);

  // --- Match Timer Tick ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isTimerRunning && !matchWinner) {
      interval = setInterval(() => {
        if (isGoldenScore) {
          setGoldenScoreElapsed(prev => prev + 1);
        } else {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (interval) clearInterval(interval);
              setIsTimerRunning(false);
              if (soundEnabled) {
                soundEffects.playScoreboardBuzzer();
              }
              // Check if scores are tied to prompt or auto-trigger Golden Score
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isGoldenScore, matchWinner, soundEnabled]);

  // --- Osaekomi Timer Tick ---
  useEffect(() => {
    let osaekomiInterval: ReturnType<typeof setInterval> | null = null;

    if (osaekomiSide && !matchWinner) {
      osaekomiInterval = setInterval(() => {
        setOsaekomiSeconds(prev => {
          const nextVal = prev + 1;

          // Milestone: 10 Seconds -> Waza-ari award
          if (nextVal === 10) {
            if (soundEnabled) {
              soundEffects.playOsaekomiBell();
            }
            if (osaekomiSide === 'shiro') {
              setShiroWazaari(currW => {
                if (currW >= 1) {
                  // Waza-ari Awasete Ippon!
                  setShiroIppon(1);
                  handleDeclareWinner('shiro', 'Waza-ari Awasete Ippon (Osaekomi 10s)');
                  return 2;
                }
                return 1;
              });
            } else {
              setAoWazaari(currW => {
                if (currW >= 1) {
                  // Waza-ari Awasete Ippon!
                  setAoIppon(1);
                  handleDeclareWinner('ao', 'Waza-ari Awasete Ippon (Osaekomi 10s)');
                  return 2;
                }
                return 1;
              });
            }
          }

          // Milestone: 20 Seconds -> Full Ippon Victory!
          if (nextVal >= 20) {
            if (osaekomiInterval) clearInterval(osaekomiInterval);
            if (osaekomiSide === 'shiro') {
              setShiroIppon(1);
              handleDeclareWinner('shiro', 'Ippon por Imobilização (Osaekomi 20s)');
            } else {
              setAoIppon(1);
              handleDeclareWinner('ao', 'Ippon por Imobilização (Osaekomi 20s)');
            }
            return 20;
          }

          return nextVal;
        });
      }, 1000);
    }

    return () => {
      if (osaekomiInterval) clearInterval(osaekomiInterval);
    };
  }, [osaekomiSide, matchWinner, soundEnabled, handleDeclareWinner]);

  // --- Fullscreen Change Detection ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (scoreboardContainerRef.current?.requestFullscreen) {
        scoreboardContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // --- Reset Match Function ---
  const handleResetMatch = (newDurationSeconds: number = matchDuration) => {
    setIsTimerRunning(false);
    setOsaekomiSide(null);
    setOsaekomiSeconds(0);
    setIsGoldenScore(false);
    setGoldenScoreElapsed(0);
    setTimeLeft(newDurationSeconds);
    setShiroIppon(0);
    setShiroWazaari(0);
    setShiroShido(0);
    setAoIppon(0);
    setAoWazaari(0);
    setAoShido(0);
    setMatchWinner(null);
  };

  // --- Hajime / Matte Toggle ---
  const toggleHajimeMatte = () => {
    if (matchWinner) return;
    setIsTimerRunning(prev => !prev);
  };

  // --- Osaekomi Triggers ---
  const handleStartOsaekomi = (side: 'shiro' | 'ao') => {
    if (matchWinner) return;
    // Osaekomi continues running even if match timer is paused or ongoing
    if (!isTimerRunning && !isGoldenScore && timeLeft > 0) {
      setIsTimerRunning(true);
    }
    setOsaekomiSide(side);
    setOsaekomiSeconds(0);
  };

  const handleToketa = () => {
    setOsaekomiSide(null);
    setOsaekomiSeconds(0);
  };

  // --- Score Mutators ---
  const addShiroIppon = () => {
    if (shiroIppon > 0) {
      setShiroIppon(0);
    } else {
      setShiroIppon(1);
      handleDeclareWinner('shiro', 'Ippon');
    }
  };

  const addAoIppon = () => {
    if (aoIppon > 0) {
      setAoIppon(0);
    } else {
      setAoIppon(1);
      handleDeclareWinner('ao', 'Ippon');
    }
  };

  const addShiroWazaari = (delta: number) => {
    setShiroWazaari(prev => {
      const next = Math.max(0, Math.min(2, prev + delta));
      if (next === 2) {
        setShiroIppon(1);
        handleDeclareWinner('shiro', 'Waza-ari Awasete Ippon');
      }
      return next;
    });
  };

  const addAoWazaari = (delta: number) => {
    setAoWazaari(prev => {
      const next = Math.max(0, Math.min(2, prev + delta));
      if (next === 2) {
        setAoIppon(1);
        handleDeclareWinner('ao', 'Waza-ari Awasete Ippon');
      }
      return next;
    });
  };

  const addShiroShido = (delta: number) => {
    setShiroShido(prev => {
      const next = Math.max(0, Math.min(3, prev + delta));
      if (next === 3) {
        // Hansoku-make -> Ao wins!
        handleDeclareWinner('ao', 'Vitória por Hansoku-make (3 Shidos)');
      }
      return next;
    });
  };

  const addAoShido = (delta: number) => {
    setAoShido(prev => {
      const next = Math.max(0, Math.min(3, prev + delta));
      if (next === 3) {
        // Hansoku-make -> Shiro wins!
        handleDeclareWinner('shiro', 'Vitória por Hansoku-make (3 Shidos)');
      }
      return next;
    });
  };

  // Adjust time by seconds
  const adjustTimeBy = (deltaSeconds: number) => {
    if (isGoldenScore) {
      setGoldenScoreElapsed(prev => Math.max(0, prev + deltaSeconds));
    } else {
      setTimeLeft(prev => Math.max(0, prev + deltaSeconds));
    }
  };

  // --- Keyboard Shortcuts for Dojo Table Official ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleHajimeMatte();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleStartOsaekomi('shiro');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleStartOsaekomi('ao');
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleToketa();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Time format helper (mm:ss)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={scoreboardContainerRef}
      className={cn(
        "flex flex-col justify-between transition-all select-none font-sans",
        isFullscreen 
          ? "fixed inset-0 z-50 bg-slate-950 text-white p-4 sm:p-8 w-screen h-screen overflow-hidden" 
          : "bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800 space-y-6"
      )}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
              <span>Placar de Luta do Dojô</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Oficial Shiai
              </span>
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              Cronômetro regressivo ajustável, Ippon, Waza-ari, Shido e controle de Osaekomi.
            </p>
          </div>
        </div>

        {/* Global Scoreboard Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick preset buttons (desktop/tablet) */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            {[
              { label: '4:00 (Adulto)', sec: 240 },
              { label: '3:00 (Sub-18)', sec: 180 },
              { label: '2:00 (Infantil)', sec: 120 },
              { label: '5:00 (Master)', sec: 300 }
            ].map(p => (
              <button
                key={p.sec}
                onClick={() => {
                  setMatchDuration(p.sec);
                  handleResetMatch(p.sec);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  matchDuration === p.sec && !isGoldenScore
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Adjust Config Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Ajustar Atletas e Tempo"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={cn(
              "p-2 rounded-xl transition-colors cursor-pointer border",
              soundEnabled 
                ? "bg-white/10 border-white/10 text-amber-400" 
                : "bg-white/5 border-white/5 text-slate-500"
            )}
            title={soundEnabled ? "Som Ativado (Campainha/Buzzer)" : "Som Mudo"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle for Dojo TV */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="Espelhar na TV do Dojô em Tela Cheia"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Sair da TV</span>
              </>
            ) : (
              <>
                <Tv className="w-4 h-4" />
                <span className="hidden sm:inline">Tela Cheia (TV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Fight Display Grid */}
      <div className={cn(
        "grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch",
        isFullscreen ? "flex-1 my-auto max-h-[85vh]" : ""
      )}>
        {/* =========================================
            WHITE JUDOKA (SHIRO)
            ========================================= */}
        <div className="lg:col-span-4 bg-gradient-to-b from-white/95 to-slate-100 text-slate-950 rounded-3xl p-5 sm:p-6 shadow-xl border-4 border-white flex flex-col justify-between relative overflow-hidden">
          {/* Top Label */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Shiro (Branco)
              </span>
            </div>
            {matchWinner?.side === 'shiro' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm flex items-center gap-1">
                <CrownIcon className="w-3 h-3" /> Vencedor
              </span>
            )}
          </div>

          {/* Competitor Name */}
          <div className="my-3">
            <input
              type="text"
              value={shiroName}
              onChange={(e) => setShiroName(e.target.value)}
              className="text-xl sm:text-2xl font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 outline-none w-full tracking-tight transition-colors"
              placeholder="Nome do Judoca Branco"
            />
          </div>

          {/* Scores (Ippon & Waza-ari) */}
          <div className="grid grid-cols-2 gap-3 my-2">
            {/* Ippon */}
            <div className="bg-white rounded-2xl p-4 text-center border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Ippon</span>
              <span className="text-5xl sm:text-6xl font-black text-slate-950 tracking-tighter my-1">
                {shiroIppon}
              </span>
              <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                <button
                  onClick={addShiroIppon}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
                  title="Marcar Ippon (Vitória)"
                >
                  +1 IPPON
                </button>
              </div>
            </div>

            {/* Waza-ari */}
            <div className="bg-white rounded-2xl p-4 text-center border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Waza-ari</span>
              <span className="text-5xl sm:text-6xl font-black text-amber-500 tracking-tighter my-1">
                {shiroWazaari}
              </span>
              <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                <button
                  onClick={() => addShiroWazaari(-1)}
                  disabled={shiroWazaari <= 0}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 cursor-pointer transition-colors"
                  title="Diminuir Waza-ari"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => addShiroWazaari(1)}
                  disabled={shiroWazaari >= 2}
                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
                  title="Adicionar Waza-ari"
                >
                  +1 WAZA
                </button>
              </div>
            </div>
          </div>

          {/* Shido Penalties */}
          <div className="bg-white/80 rounded-2xl p-3 border border-slate-200 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Penalidades (Shido)
              </span>
              <span className="text-xs font-black text-slate-800">
                {shiroShido} / 3
              </span>
            </div>

            {/* Shido Visual Cards */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  className={cn(
                    "flex-1 h-7 rounded-lg border-2 flex items-center justify-center font-black text-xs transition-all",
                    shiroShido >= level
                      ? level === 3 
                        ? "bg-rose-600 border-rose-700 text-white animate-pulse" 
                        : "bg-amber-400 border-amber-500 text-slate-950"
                      : "bg-slate-100 border-dashed border-slate-300 text-slate-400"
                  )}
                >
                  {level === 3 && shiroShido >= 3 ? "H" : `S${level}`}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => addShiroShido(-1)}
                disabled={shiroShido <= 0}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 cursor-pointer"
                title="Retirar Shido"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => addShiroShido(1)}
                disabled={shiroShido >= 3}
                className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
              >
                +1 SHIDO
              </button>
            </div>
          </div>

          {/* Osaekomi Trigger Button for Shiro */}
          <div className="mt-3">
            <button
              onClick={() => {
                if (osaekomiSide === 'shiro') {
                  handleToketa();
                } else {
                  handleStartOsaekomi('shiro');
                }
              }}
              className={cn(
                "w-full py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-2",
                osaekomiSide === 'shiro'
                  ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              <Flame className="w-4 h-4" />
              <span>{osaekomiSide === 'shiro' ? 'Toketa (Soltou!)' : 'Osaekomi Shiro (Imobilização)'}</span>
            </button>
          </div>
        </div>

        {/* =========================================
            CENTER: MATCH TIMER & OSAEKOMI CLOCK
            ========================================= */}
        <div className="lg:col-span-4 bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between items-center text-center space-y-4 shadow-xl">
          {/* Mode Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsGoldenScore(prev => !prev);
                setIsTimerRunning(false);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                isGoldenScore
                  ? "bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/30"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              )}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{isGoldenScore ? 'Modo Golden Score (Ponto de Ouro)' : 'Tempo Regular'}</span>
            </button>
          </div>

          {/* Match Giant Timer */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              {isGoldenScore ? 'Tempo Transcorrido no Golden Score' : 'Tempo Restante da Luta'}
            </span>
            <div className={cn(
              "font-mono font-black tracking-tight leading-none drop-shadow-md transition-all select-all",
              isFullscreen ? "text-7xl sm:text-9xl" : "text-6xl sm:text-7xl",
              timeLeft <= 30 && !isGoldenScore ? "text-rose-500 animate-pulse" : "text-white"
            )}>
              {isGoldenScore ? formatTime(goldenScoreElapsed) : formatTime(timeLeft)}
            </div>

            {/* Quick +/- 15s adjuster */}
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => adjustTimeBy(-15)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title="Menos 15 segundos"
              >
                -15s
              </button>
              <button
                onClick={() => adjustTimeBy(15)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title="Mais 15 segundos"
              >
                +15s
              </button>
              <button
                onClick={() => adjustTimeBy(60)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                title="Mais 1 minuto"
              >
                +1m
              </button>
            </div>
          </div>

          {/* Main Hajime / Matte Button */}
          <div className="w-full space-y-2">
            <button
              onClick={toggleHajimeMatte}
              className={cn(
                "w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider transition-all shadow-xl cursor-pointer flex items-center justify-center gap-3 active:scale-95",
                isTimerRunning
                  ? "bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/20"
                  : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 ring-4 ring-emerald-500/20"
              )}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-6 h-6 fill-current" />
                  <span>Matte (Pausar)</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  <span>Hajime (Iniciar)</span>
                </>
              )}
            </button>

            <span className="text-[10px] text-slate-400 font-bold block">
              Dica de Dojô: Pressione a <strong>Barra de Espaço</strong> para Iniciar/Pausar
            </span>
          </div>

          {/* Osaekomi Real-Time Status & Clock */}
          <div className={cn(
            "w-full rounded-2xl p-4 border transition-all",
            osaekomiSide
              ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-slate-800/60 border-slate-700/80"
          )}>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="uppercase tracking-wider flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Osaekomi (Imobilização)
              </span>
              {osaekomiSide && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  osaekomiSide === 'shiro' ? "bg-white text-slate-950" : "bg-blue-600 text-white"
                )}>
                  {osaekomiSide === 'shiro' ? 'Shiro' : 'Ao'} Imobilizando
                </span>
              )}
            </div>

            {/* Osaekomi Big Digits */}
            <div className="flex items-center justify-center gap-3 my-2">
              <span className={cn(
                "font-mono font-black text-4xl sm:text-5xl tracking-tight",
                osaekomiSide ? "text-amber-400 animate-pulse" : "text-slate-500"
              )}>
                {osaekomiSeconds}s
              </span>
              <div className="text-left text-[10px] font-bold text-slate-400 leading-tight">
                <div>10s = Waza-ari</div>
                <div>20s = Ippon</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  osaekomiSeconds >= 10 ? "bg-emerald-400" : "bg-amber-400"
                )}
                style={{ width: `${Math.min(100, (osaekomiSeconds / 20) * 100)}%` }}
              />
            </div>

            {osaekomiSide && (
              <button
                onClick={handleToketa}
                className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Toketa (Interromper Osaekomi)
              </button>
            )}
          </div>

          {/* Reset / Sound Controls */}
          <div className="flex items-center justify-between w-full pt-1 border-t border-slate-800">
            <button
              onClick={() => handleResetMatch()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Placar</span>
            </button>

            <button
              onClick={() => {
                if (soundEnabled) soundEffects.playScoreboardBuzzer();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              title="Tocar Campainha / Buzzer Manual"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Campainha</span>
            </button>
          </div>
        </div>

        {/* =========================================
            BLUE JUDOKA (AO)
            ========================================= */}
        <div className="lg:col-span-4 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-4 border-blue-600 flex flex-col justify-between relative overflow-hidden">
          {/* Top Label */}
          <div className="flex items-center justify-between gap-2 border-b border-blue-600/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-300 border-2 border-white shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-blue-200">
                Ao (Azul)
              </span>
            </div>
            {matchWinner?.side === 'ao' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm flex items-center gap-1">
                <CrownIcon className="w-3 h-3" /> Vencedor
              </span>
            )}
          </div>

          {/* Competitor Name */}
          <div className="my-3">
            <input
              type="text"
              value={aoName}
              onChange={(e) => setAoName(e.target.value)}
              className="text-xl sm:text-2xl font-black text-white bg-transparent border-b border-transparent hover:border-blue-400 focus:border-amber-400 outline-none w-full tracking-tight transition-colors"
              placeholder="Nome do Judoca Azul"
            />
          </div>

          {/* Scores (Ippon & Waza-ari) */}
          <div className="grid grid-cols-2 gap-3 my-2">
            {/* Ippon */}
            <div className="bg-blue-950/80 rounded-2xl p-4 text-center border-2 border-blue-500 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">Ippon</span>
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter my-1">
                {aoIppon}
              </span>
              <div className="flex items-center justify-center gap-1 pt-1 border-t border-blue-800/80">
                <button
                  onClick={addAoIppon}
                  className="flex-1 py-1.5 bg-white hover:bg-blue-50 text-blue-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
                  title="Marcar Ippon (Vitória)"
                >
                  +1 IPPON
                </button>
              </div>
            </div>

            {/* Waza-ari */}
            <div className="bg-blue-950/80 rounded-2xl p-4 text-center border-2 border-blue-500 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">Waza-ari</span>
              <span className="text-5xl sm:text-6xl font-black text-amber-400 tracking-tighter my-1">
                {aoWazaari}
              </span>
              <div className="flex items-center gap-1 pt-1 border-t border-blue-800/80">
                <button
                  onClick={() => addAoWazaari(-1)}
                  disabled={aoWazaari <= 0}
                  className="p-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-30 rounded-lg text-white cursor-pointer transition-colors"
                  title="Diminuir Waza-ari"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => addAoWazaari(1)}
                  disabled={aoWazaari >= 2}
                  className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
                  title="Adicionar Waza-ari"
                >
                  +1 WAZA
                </button>
              </div>
            </div>
          </div>

          {/* Shido Penalties */}
          <div className="bg-blue-950/60 rounded-2xl p-3 border border-blue-600/80 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-200 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Penalidades (Shido)
              </span>
              <span className="text-xs font-black text-white">
                {aoShido} / 3
              </span>
            </div>

            {/* Shido Visual Cards */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map(level => (
                <div
                  key={level}
                  className={cn(
                    "flex-1 h-7 rounded-lg border-2 flex items-center justify-center font-black text-xs transition-all",
                    aoShido >= level
                      ? level === 3 
                        ? "bg-rose-600 border-rose-700 text-white animate-pulse" 
                        : "bg-amber-400 border-amber-500 text-slate-950"
                      : "bg-blue-900/60 border-dashed border-blue-700 text-blue-400"
                  )}
                >
                  {level === 3 && aoShido >= 3 ? "H" : `S${level}`}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => addAoShido(-1)}
                disabled={aoShido <= 0}
                className="p-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-30 rounded-lg text-white cursor-pointer"
                title="Retirar Shido"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => addAoShido(1)}
                disabled={aoShido >= 3}
                className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black cursor-pointer active:scale-95 transition-all"
              >
                +1 SHIDO
              </button>
            </div>
          </div>

          {/* Osaekomi Trigger Button for Ao */}
          <div className="mt-3">
            <button
              onClick={() => {
                if (osaekomiSide === 'ao') {
                  handleToketa();
                } else {
                  handleStartOsaekomi('ao');
                }
              }}
              className={cn(
                "w-full py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-2",
                osaekomiSide === 'ao'
                  ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20"
                  : "bg-white hover:bg-blue-50 text-blue-950"
              )}
            >
              <Flame className="w-4 h-4" />
              <span>{osaekomiSide === 'ao' ? 'Toketa (Soltou!)' : 'Osaekomi Ao (Imobilização)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Match Winner Announcement Banner */}
      {matchWinner && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-900 block font-bold">
                Vitória Oficial no Tatame
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                {matchWinner.name} ({matchWinner.side === 'shiro' ? 'Branco' : 'Azul'})
              </h3>
              <p className="text-xs text-slate-900 font-bold mt-0.5">
                Motivo: {matchWinner.reason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleResetMatch()}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black cursor-pointer shadow-md transition-all active:scale-95"
            >
              Iniciar Nova Luta
            </button>
          </div>
        </div>
      )}

      {/* Settings / Athlete Selection Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" />
                <h4 className="font-black text-lg text-white">Configurar Luta & Judocas</h4>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Select from Dojo Profiles */}
            {profiles.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Vincular Judocas Cadastrados no Dojô
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Judoca Branco (Shiro):
                    </label>
                    <select
                      value={shiroName}
                      onChange={(e) => setShiroName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="Judoca Branco (Shiro)">-- Nome Livre --</option>
                      {profiles
                        .filter(p => !p.isPointer && p.status !== 'inactive')
                        .map(p => (
                          <option key={`shiro-${p.id}`} value={p.fullName}>
                            {p.fullName} ({p.currentGrade || 'Branca'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Judoca Azul (Ao):
                    </label>
                    <select
                      value={aoName}
                      onChange={(e) => setAoName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="Judoca Azul (Ao)">-- Nome Livre --</option>
                      {profiles
                        .filter(p => !p.isPointer && p.status !== 'inactive')
                        .map(p => (
                          <option key={`ao-${p.id}`} value={p.fullName}>
                            {p.fullName} ({p.currentGrade || 'Branca'})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Adjustable Duration Settings */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Duração do Cronômetro Regressivo
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: '1:00 (Rápido)', sec: 60 },
                  { label: '2:00 (Infantil)', sec: 120 },
                  { label: '3:00 (Sub-18)', sec: 180 },
                  { label: '4:00 (Oficial)', sec: 240 },
                  { label: '5:00 (Master)', sec: 300 }
                ].map(p => (
                  <button
                    key={p.sec}
                    onClick={() => {
                      setMatchDuration(p.sec);
                      handleResetMatch(p.sec);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border",
                      matchDuration === p.sec
                        ? "bg-amber-500 border-amber-500 text-slate-950 font-black shadow-sm"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Min / Sec Inputs */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Minutos:</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Segundos:</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white text-center"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      const totalSec = (customMinutes * 60) + customSeconds;
                      if (totalSec > 0) {
                        setMatchDuration(totalSec);
                        handleResetMatch(totalSec);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Definir Tempo
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
              >
                Concluir e Voltar ao Placar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}

export default PlacarDeLuta;
