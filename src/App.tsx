import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { auth } from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { UserRole } from './types';
import { ShieldAlert, Users, PhoneCall, LogOut, RefreshCw, AlertOctagon } from 'lucide-react';

function AppContent() {
  const { user, loading, refreshUser, activeProfile, availableProfiles, setActiveProfileId, activeProfileId } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleCheckApproval = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4]">
        <div className="w-12 h-12 border-4 border-[#0a0a0a] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
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
              onClick={() => auth.signOut()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen for Pending Approval
  if (!user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-slate-200 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Aprovação Pendente</h1>
            <p className="text-slate-500 mt-2">Olá, {user.name}! Sua conta foi criada, mas ainda aguarda aprovação de um administrador.</p>
          </div>
          <p className="text-sm text-slate-400">Entre em contato com a academia para agilizar o processo.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleCheckApproval}
              disabled={checking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {checking ? 'Verificando...' : 'Verificar Aprovação'}
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
