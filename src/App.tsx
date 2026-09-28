import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { auth } from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { UserRole } from './types';
import { ShieldAlert, Users, PhoneCall, LogOut, RefreshCw, AlertOctagon, RotateCcw, WifiOff } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Erro desconhecido' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou erro na interface:", error, errorInfo);
  }

  handleHardReset = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Reset error:", e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-white">Ops! Algo não carregou corretamente</h1>
            <p className="text-xs text-slate-400">
              O aplicativo encontrou uma falha temporária. Você pode recarregar ou limpar os dados locais em cache para voltar ao normal.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Aplicativo
              </button>
              <button
                onClick={this.handleHardReset}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen({ logout }: { logout: () => Promise<void> }) {
  const [showRescue, setShowRescue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRescue(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-4 text-center select-none">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-xl animate-pulse">
          <img src="/logo.png" alt="Judoka Dojô" className="w-14 h-14 object-contain" />
        </div>
        <div className="absolute -inset-1 rounded-3xl border-2 border-indigo-500/40 animate-ping opacity-25"></div>
      </div>

      <h2 className="text-lg font-black text-white tracking-wide mb-1">Judoka Dojô</h2>
      <p className="text-xs font-semibold text-slate-400 mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
        Iniciando aplicativo...
      </p>

      {showRescue && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2 max-w-xs w-full bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
          <p className="text-[11px] text-slate-400 font-medium">A conexão está demorando?</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
            >
              Recarregar
            </button>
            <button
              onClick={() => logout()}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
            >
              Trocar Conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { user, loading, refreshUser, activeProfile, availableProfiles, setActiveProfileId, activeProfileId, logout } = useAuth();
  const [checking, setChecking] = React.useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckApproval = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  };

  if (loading) {
    return <LoadingScreen logout={logout} />;
  }

  if (!user) {
    return (
      <>
        {isOffline && (
          <div className="bg-amber-500 text-amber-950 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 sticky top-0 z-50">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Dispositivo sem conexão à internet no momento</span>
          </div>
        )}
        <Login />
      </>
    );
  }

  const isAdmin = user.role === UserRole.ADMIN;
  const isInactiveOrSuspended = !isAdmin && (user.status === 'inactive' || user.status === 'suspended' || user.status === 'blocked');

  // Screen for Suspended / Inactive Student
  if (isInactiveOrSuspended) {
    const activeFamilyMembers = availableProfiles.filter(p => p.id !== activeProfileId && p.status === 'active');

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/95 p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600 shadow-inner">
            <AlertOctagon className="h-10 w-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-block bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Matrícula Inativa / Suspensa
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Acesso Temporariamente Indisponível
            </h1>
            <p className="text-sm font-semibold text-slate-500">
              Aluno: <span className="font-extrabold text-slate-800">{user.name}</span>
            </p>
          </div>

          <div className="p-5 bg-rose-50/70 border border-rose-100 rounded-2xl text-center space-y-2">
            <p className="text-base font-extrabold text-rose-950 leading-relaxed">
              Favor entrar em contato com a secretária do Dojo
            </p>
            {activeProfile?.suspensionReason && (
              <p className="text-xs text-rose-700 font-medium">
                Motivo informado: <span className="font-bold">{activeProfile.suspensionReason}</span>
              </p>
            )}
          </div>

          {activeFamilyMembers.length > 0 && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-left space-y-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">Outro aluno da família:</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Você possui outros alunos ativos vinculados a este login. Deseja alternar?
              </p>
              <div className="flex flex-col gap-1.5 pt-1">
                {activeFamilyMembers.map((fam, idx) => (
                  <button
                    key={`${fam.id}-${idx}`}
                    onClick={() => setActiveProfileId(fam.id)}
                    className="w-full text-left p-2.5 bg-white border border-indigo-200 hover:border-indigo-500 rounded-xl text-xs font-bold text-indigo-950 hover:bg-indigo-50/50 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{fam.fullName} (Faixa {fam.currentGrade || 'Branca'})</span>
                    <span className="text-[10px] text-emerald-600 font-black uppercase">Ativo →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={handleCheckApproval}
              disabled={checking}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Verificando situação...' : 'Verificar Regularização'}</span>
            </button>

            <button 
              onClick={logout}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-3.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOffline && (
        <div className="bg-amber-500 text-amber-950 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Operando em modo offline. As alterações serão sincronizadas quando houver sinal.</span>
        </div>
      )}
      <Dashboard />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
