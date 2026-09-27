import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Profile, ClassSession, Presence } from '../../types';
import { db, doc } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { soundEffects } from '../../lib/soundEffects';
import confetti from 'canvas-confetti';
import { 
  Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Zap, Users, 
  Search, ShieldAlert, Sparkles, Volume2, VolumeX, ArrowRight, UserCheck 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface QRCodeAttendanceScannerProps {
  classes: ClassSession[];
  profiles: Profile[];
  onClose: () => void;
  selectedClassId?: string;
}

export default function QRCodeAttendanceScanner({
  classes,
  profiles,
  onClose,
  selectedClassId: initialSelectedClassId
}: QRCodeAttendanceScannerProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialSelectedClassId || '');
  const [scanning, setScanning] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<{
    profile: Profile;
    status: 'success' | 'already_checked_in' | 'error';
    message: string;
    timestamp: string;
  } | null>(null);
  const [sessionPresences, setSessionPresences] = useState<{ profile: Profile; time: string }[]>([]);
  const [classPresences, setClassPresences] = useState<Presence[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualSearch, setManualSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-camera-attendance-reader';

  const todayStr = new Date().toISOString().split('T')[0];
  const todayClasses = classes.filter(c => c.date?.startsWith(todayStr));

  // Auto-select today's class if none selected
  useEffect(() => {
    if (!selectedClassId && todayClasses.length > 0) {
      setSelectedClassId(todayClasses[0].id);
    } else if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, todayClasses, selectedClassId]);

  // Subscribe in real-time to current class presences to detect duplicates
  useEffect(() => {
    if (!selectedClassId) {
      setClassPresences([]);
      return;
    }

    const unsub = onSnapshot(collection(db, `classes/${selectedClassId}/presences`), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Presence));
      setClassPresences(list);
    });

    return () => unsub();
  }, [selectedClassId]);

  // Create an automatic today training class if none exists
  const handleCreateTodayClass = async () => {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newClassRef = await addDoc(collection(db, 'classes'), {
        title: 'Treino de Judô (Tatame Aberto)',
        date: todayStr,
        time: timeStr,
        professorId: 'sensei',
        type: 'Judô',
        createdAt: now.toISOString(),
      });
      setSelectedClassId(newClassRef.id);
    } catch (err: any) {
      console.error('Failed to create today class:', err);
      alert('Erro ao criar treino de hoje: ' + (err.message || ''));
    }
  };

  // Start HTML5 Camera Scanner
  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      try {
        setCameraError(null);
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // ignore
          }
        }

        const html5QrCode = new Html5Qrcode(qrRegionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              handleCodeScanned(decodedText);
            }
          },
          () => {
            // frame without qr code - ignore
          }
        );
        setScanning(true);
      } catch (err: any) {
        console.error("Camera scanner init error:", err);
        if (isMounted) {
          setCameraError(err.message || "Não foi possível acessar a câmera. Verifique as permissões do navegador no celular.");
        }
      }
    }

    // Small delay to ensure DOM element exists
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, []);

  // Process Scanned Code
  const handleCodeScanned = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let studentId = '';

      // Try parsing JSON payload from student digital card
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        try {
          const parsed = JSON.parse(decodedText);
          studentId = parsed.id || parsed.studentId || '';
        } catch {
          studentId = decodedText.trim();
        }
      } else if (decodedText.startsWith('JUDOKA_CHECKIN:')) {
        studentId = decodedText.replace('JUDOKA_CHECKIN:', '').trim();
      } else {
        studentId = decodedText.trim();
      }

      const student = profiles.find(p => p.id === studentId || p.userId === studentId || p.callNumber === studentId);

      if (!student) {
        if (soundEnabled) soundEffects.playWarningTone();
        setLastScannedResult({
          profile: { id: studentId, fullName: 'Aluno Não Identificado', currentGrade: 'N/A' } as Profile,
          status: 'error',
          message: `Código lido (${studentId.slice(0, 10)}...), mas aluno não foi encontrado no cadastro.`,
          timestamp: new Date().toLocaleTimeString('pt-BR')
        });
        setTimeout(() => setIsProcessing(false), 2000);
        return;
      }

      await registerCheckInForStudent(student);
    } catch (err: any) {
      console.error("Scanned process error:", err);
      setTimeout(() => setIsProcessing(false), 1500);
    }
  };

  const registerCheckInForStudent = async (student: Profile) => {
    if (!selectedClassId) {
      alert("Por favor, selecione ou crie um treino para registrar a presença.");
      setIsProcessing(false);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Check if already checked in for this class
    const alreadyPresent = classPresences.some(p => p.memberId === student.id);
    if (alreadyPresent) {
      if (soundEnabled) soundEffects.playWarningTone();
      setLastScannedResult({
        profile: student,
        status: 'already_checked_in',
        message: `${student.fullName} já registrou presença neste treino!`,
        timestamp: timeStr
      });
      setTimeout(() => setIsProcessing(false), 2000);
      return;
    }

    try {
      // 1. Record Presence in class subcollection
      const presencePayload = {
        memberId: student.id,
        classId: selectedClassId,
        timestamp: now.toISOString(),
        checkInDate: todayStr,
        pointsAwarded: 10
      };

      await addDoc(collection(db, `classes/${selectedClassId}/presences`), presencePayload);

      // 2. Award +10 points to student profile
      try {
        const currentPoints = student.points || 0;
        await updateDoc(doc(db, 'profiles', student.id), {
          points: currentPoints + 10
        });
      } catch (e) {
        console.warn("Could not update profile points:", e);
      }

      // 3. Audio & Visual Celebration
      if (soundEnabled) soundEffects.playCheckInSuccess();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });

      setLastScannedResult({
        profile: student,
        status: 'success',
        message: 'Presença confirmada no tatame! (+10 pontos)',
        timestamp: timeStr
      });

      setSessionPresences(prev => [{ profile: student, time: timeStr }, ...prev]);

      // Re-enable scanning after 1.8s
      setTimeout(() => {
        setIsProcessing(false);
      }, 1800);
    } catch (err: any) {
      console.error("Failed to save check-in:", err);
      if (soundEnabled) soundEffects.playWarningTone();
      setLastScannedResult({
        profile: student,
        status: 'error',
        message: 'Erro ao salvar no banco de dados: ' + (err.message || 'Verifique sua conexão'),
        timestamp: timeStr
      });
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Filter students for manual search fallback
  const filteredManualStudents = manualSearch.trim()
    ? profiles.filter(p => 
        (p.status === 'active' || !p.status) &&
        !p.isPointer &&
        p.fullName.toLowerCase().includes(manualSearch.toLowerCase().trim())
      ).slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col md:items-center md:justify-center p-0 md:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white md:rounded-[2.5rem] shadow-2xl flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Top Header Bar */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Scanner de Presença • Entrada</h3>
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Aponte para o QR Code do Aluno</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                soundEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-slate-400"
              )}
              title={soundEnabled ? "Som Ativado" : "Som Desativado"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Class Selection Strip */}
        <div className="bg-slate-100/80 px-5 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-700">Treino Vinculado:</span>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:justify-end">
            {classes.length > 0 ? (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 outline-none shadow-xs max-w-full sm:max-w-xs truncate"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title || 'Treino'} ({c.date ? new Date(c.date).toLocaleDateString('pt-BR') : 'Data'} - {c.time || 'Horário'})
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={handleCreateTodayClass}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl font-bold transition-all shadow-xs"
              >
                + Criar Treino de Hoje
              </button>
            )}
          </div>
        </div>

        {/* Live Camera Viewfinder Area */}
        <div className="relative bg-black flex-1 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-white space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm">Acesso à Câmera Bloqueado</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              {/* HTML5 QR Code Mount Element */}
              <div id={qrRegionId} className="w-full h-full max-h-[360px]" />

              {/* Viewfinder Target Border Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-indigo-400/80 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Glowing Scanning Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  
                  {/* Corner Markers */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
                </div>
              </div>
            </>
          )}

          {/* Real-time Scan Status Alert Overlay */}
          {lastScannedResult && (
            <div className={cn(
              "absolute bottom-4 left-4 right-4 p-4 rounded-2xl border text-white shadow-2xl flex items-center gap-3.5 z-20 backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 duration-200",
              lastScannedResult.status === 'success' && "bg-emerald-950/90 border-emerald-500/50",
              lastScannedResult.status === 'already_checked_in' && "bg-amber-950/90 border-amber-500/50",
              lastScannedResult.status === 'error' && "bg-rose-950/90 border-rose-500/50"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                lastScannedResult.status === 'success' ? "bg-emerald-500 text-white" :
                lastScannedResult.status === 'already_checked_in' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
              )}>
                {lastScannedResult.status === 'success' && <CheckCircle2 className="w-7 h-7" />}
                {lastScannedResult.status === 'already_checked_in' && <AlertTriangle className="w-7 h-7" />}
                {lastScannedResult.status === 'error' && <X className="w-7 h-7" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm truncate text-white">
                    {lastScannedResult.profile.fullName}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-white/20">
                    Faixa {lastScannedResult.profile.currentGrade || 'Branca'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium mt-0.5">
                  {lastScannedResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Manual Student Check-in Fallback & Scanned Feed */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col gap-4 overflow-y-auto max-h-64 sm:max-h-72">
          {/* Manual Search Bar */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Esqueceu o celular? Busca e Chamada Manual:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Digitar nome do aluno..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quick manual match results */}
            {filteredManualStudents.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm bg-white">
                {filteredManualStudents.map((st) => {
                  const isPresent = classPresences.some(p => p.memberId === st.id);
                  return (
                    <div key={st.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {st.fullName?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 leading-none">{st.fullName}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Faixa {st.currentGrade || 'Branca'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setManualSearch('');
                          registerCheckInForStudent(st);
                        }}
                        disabled={isPresent}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                          isPresent
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95"
                        )}
                      >
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Presente</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Dar Presença</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Attendees Feed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Alunos Presentes no Tatame Hoje ({classPresences.length})
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Ao Vivo
              </span>
            </div>

            {sessionPresences.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {sessionPresences.map((sp, idx) => (
                  <div key={`${sp.profile.id}-${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                        ✓
                      </span>
                      <span className="font-extrabold text-slate-800">{sp.profile.fullName}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Faixa {sp.profile.currentGrade || 'Branca'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{sp.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl border border-slate-100">
                Aponte o primeiro QR Code para iniciar o fluxo da chamada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
