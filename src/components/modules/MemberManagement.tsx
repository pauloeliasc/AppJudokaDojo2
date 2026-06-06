import React, { useState } from 'react';
import { Profile, UserRole, Payment } from '../../types';
import { db, handleFirestoreError, OperationType, doc } from '../../lib/firebase';
import { deleteDoc, collection, addDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { Plus, Search, UserPlus, Trash2, Edit2, ShieldAlert, Users, LayoutDashboard, CreditCard, CheckCircle2, XCircle, RefreshCw, AlertTriangle, UserCheck, ShieldCheck, UserX, Trash } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { profilesApi, paymentsApi } from '../../services/firestoreService';
import MemberDetailsModal from './MemberDetailsModal';
import FirebaseSyncModal from './FirebaseSyncModal';

export default function MemberManagement({ profiles, payments = [] }: { profiles: Profile[], payments?: Payment[] }) {
  const { user: currentUser } = useAuth();
  const emailCounts: Record<string, number> = {};
  profiles.forEach(p => {
    if (p.email) {
      const emailLower = p.email.trim().toLowerCase();
      emailCounts[emailLower] = (emailCounts[emailLower] || 0) + 1;
    }
  });
  const isAdminUser = currentUser?.role === UserRole.ADMIN;
  const isAdminOrProfessor = isAdminUser || currentUser?.role === UserRole.PROFESSOR;

  const [isAdding, setIsAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'pending' | 'inactive'>('active');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'professor' | 'admin'>('all');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const activeProfiles = profiles.filter(p => !p.status || p.status === 'active');
  const pendingProfiles = profiles.filter(p => p.status === 'pending');
  const inactiveProfiles = profiles.filter(p => p.status === 'inactive' || p.status === 'blocked');

  const filtered = (view === 'active' ? activeProfiles : (view === 'pending' ? pendingProfiles : inactiveProfiles))
    .filter(p => (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'student') return !p.role || p.role === UserRole.STUDENT;
      if (roleFilter === 'professor') return p.role === UserRole.PROFESSOR;
      if (roleFilter === 'admin') return p.role === UserRole.ADMIN;
      return true;
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Membros da Academia</h2>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setView('active')}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all",
                view === 'active' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:text-slate-600"
              )}
            >
              Ativos ({activeProfiles.length})
            </button>
            <button 
              onClick={() => setView('pending')}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all",
                view === 'pending' ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400 hover:text-slate-600"
              )}
            >
              Pendentes ({pendingProfiles.length})
            </button>
            <button 
              onClick={() => setView('inactive')}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all",
                view === 'inactive' ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400 hover:text-slate-600"
              )}
            >
              Inativos ({inactiveProfiles.length})
            </button>
          </div>
        </div>
        <div className="flex gap-2 self-start">
          {isAdminOrProfessor && (
            <button 
              onClick={() => setShowSyncModal(true)}
              className="bg-white text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sincronizar Firebase</span>
            </button>
          )}
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        <input 
          type="text"
          placeholder="Buscar aluno por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-base shadow-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1 pb-2">
        {[
          { id: 'all', label: 'Todos os Membros' },
          { id: 'student', label: 'Alunos' },
          { id: 'professor', label: 'Professores' },
          { id: 'admin', label: 'Administradores' }
        ].map(roleItem => {
          let count = 0;
          const baseList = view === 'active' ? activeProfiles : (view === 'pending' ? pendingProfiles : inactiveProfiles);
          const filteredBySearch = baseList.filter(p => (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()));
          
          if (roleItem.id === 'all') count = filteredBySearch.length;
          else if (roleItem.id === 'student') count = filteredBySearch.filter(p => !p.role || p.role === UserRole.STUDENT).length;
          else if (roleItem.id === 'professor') count = filteredBySearch.filter(p => p.role === UserRole.PROFESSOR).length;
          else if (roleItem.id === 'admin') count = filteredBySearch.filter(p => p.role === UserRole.ADMIN).length;

          return (
            <button
              key={roleItem.id}
              onClick={() => setRoleFilter(roleItem.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 active:scale-95",
                roleFilter === roleItem.id 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10" 
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <span>{roleItem.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                roleFilter === roleItem.id ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map((profile) => (
            <MemberCard 
              key={profile.id} 
              profile={profile} 
              payments={payments.filter(p => p.memberId === profile.id)}
              onEdit={() => setEditingProfile(profile)} 
              onViewDetails={() => setViewingDetails(profile)}
              emailCounts={emailCounts}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
            <Users className="w-8 h-8" />
          </div>
          <p className="text-slate-400 font-medium tracking-tight">Nenhum membro encontrado nesta categoria.</p>
        </div>
      )}

      <AnimatePresence>
        {(isAdding || editingProfile) && (
          <MemberModal 
            profile={editingProfile} 
            profiles={profiles}
            onClose={() => {
              setIsAdding(false);
              setEditingProfile(null);
            }} 
          />
        )}
        {viewingDetails && (
          <MemberDetailsModal 
            profile={viewingDetails} 
            onClose={() => setViewingDetails(null)} 
          />
        )}
        {showSyncModal && (
          <FirebaseSyncModal 
            profiles={profiles}
            onClose={() => setShowSyncModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { createStudentAccount, deleteStudentAccount, updateStudentEmail, resetStudentPassword, sendStudentPasswordReset } from '../../services/adminService';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

function MemberCard({ profile, payments, onEdit, onViewDetails, emailCounts }: { profile: Profile, payments: Payment[], onEdit: () => void, onViewDetails: () => void, emailCounts?: Record<string, number>, key?: string }) {
  const { user: currentUser } = useAuth();
  const isAdminUser = currentUser?.role === UserRole.ADMIN;
  const isAdminOrProfessor = isAdminUser || currentUser?.role === UserRole.PROFESSOR;
  
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingPayment, setIsTogglingPayment] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Custom confirmation and alert overlays for the cross-origin iframe environment
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<UserRole | null>(null);
  const [confirmCreateAccount, setConfirmCreateAccount] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentPayment = payments.find(p => p.month === currentMonth && p.year === currentYear);
  const isPaid = currentPayment?.status === 'paid';

  const handleTogglePayment = async () => {
    if (!isAdminOrProfessor) return;
    setIsTogglingPayment(true);
    try {
      if (currentPayment) {
        await paymentsApi.updateStatus(currentPayment.id, isPaid ? 'pending' : 'paid');
      } else {
        const newPayment: Omit<Payment, 'id'> = {
          memberId: profile.id,
          month: currentMonth,
          year: currentYear,
          status: 'paid',
          dueDate: new Date(currentYear, currentMonth, 5).toISOString().split('T')[0]
        };
        await paymentsApi.create(newPayment);
      }
    } catch (e) {
      console.error(e);
      setAlertMsg({ text: 'Erro ao atualizar status de pagamento.', type: 'error' });
    } finally {
      setIsTogglingPayment(false);
    }
  };

  const handleDeleteReal = async () => {
    setIsDeleting(true);
    try {
      // Try to delete auth account first if email exists
      if (profile.email) {
        await deleteStudentAccount(profile.email);
      }
      
      // Delete firestore profile
      await deleteDoc(doc(db, 'profiles', profile.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `profiles/${profile.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAccountStart = () => {
    if (!profile.email) {
      setAlertMsg({ text: 'O aluno deve ter um e-mail cadastrado para criar o acesso.', type: 'error' });
      return;
    }
    setConfirmCreateAccount(true);
  };

  const handleCreateAccountReal = async () => {
    setIsCreatingAccount(true);
    setAccountStatus('loading');
    try {
      await createStudentAccount(profile.email, profile.id);
      setAccountStatus('success');
      setTimeout(() => setAccountStatus('idle'), 3000);
      setAlertMsg({ text: 'Acesso criado com sucesso inicializado com a senha padrão "123456"!', type: 'success' });
    } catch (e: any) {
      console.error(e);
      let msg = 'Erro ao criar conta: ';
      if (e.code === 'auth/email-already-in-use') {
        msg += 'Este e-mail já possui uma conta cadastrada.';
      } else if (e.code === 'auth/invalid-email') {
        msg += 'E-mail inválido.';
      } else if (e.code === 'auth/operation-not-allowed') {
        msg += 'O provedor de E-mail/Senha não está ativo no Console do Firebase.';
      } else {
        msg += (e.message || 'Erro desconhecido');
      }
      setAlertMsg({ text: msg, type: 'error' });
      setAccountStatus('error');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleApproveReal = async (role: UserRole) => {
    try {
      await profilesApi.update(profile.id, {
        isApproved: true,
        status: 'active',
        role: role
      });
      setAlertMsg({ text: 'Cadastro aprovado com sucesso!', type: 'success' });
    } catch (e) {
      console.error(e);
      setAlertMsg({ text: 'Erro ao aprovar membro.', type: 'error' });
    }
  };

  return (
    <div className={cn(
      "bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
      profile.status === 'pending' ? "border-amber-200 bg-amber-50/10" : "border-slate-200"
    )}>
      {/* Absolute overlay elements for confirms and messages in iFrame scope */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 z-[60] text-center text-white">
          <Trash className="w-10 h-10 text-rose-500 mb-3 animate-bounce" />
          <h5 className="font-bold text-sm uppercase tracking-wider mb-1 text-white">Remover Membro?</h5>
          <p className="text-xs text-slate-300 max-w-[240px] mb-4">
            Deseja remover permanentemente o cadastro de <strong>{profile.fullName}</strong>? Esta ação excluirá os registros e tentará desativar o login associado.
          </p>
          <div className="flex gap-2 w-full max-w-[220px]">
            <button 
              onClick={() => setConfirmDelete(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={async () => {
                setConfirmDelete(false);
                await handleDeleteReal();
              }}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      {confirmCreateAccount && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 z-[60] text-center text-white">
          <Mail className="w-10 h-10 text-emerald-500 mb-3 animate-pulse" />
          <h5 className="font-bold text-sm uppercase tracking-wider mb-1 text-white">Criar Acesso (Login)?</h5>
          <p className="text-xs text-slate-300 max-w-[240px] mb-4">
            Deseja habilitar credenciais de acesso para <strong>{profile.fullName}</strong> com a senha inicial padrão <strong>123456</strong>?
          </p>
          <div className="flex gap-2 w-full max-w-[220px]">
            <button 
              onClick={() => setConfirmCreateAccount(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Não
            </button>
            <button 
              onClick={async () => {
                setConfirmCreateAccount(false);
                await handleCreateAccountReal();
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Sim, Criar
            </button>
          </div>
        </div>
      )}

      {confirmApprove && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 z-[60] text-center text-white">
          <CheckCircle2 className="w-10 h-10 text-indigo-400 mb-3" />
          <h5 className="font-bold text-sm uppercase tracking-wider mb-1 text-white">Aprovar Cadastro?</h5>
          <p className="text-xs text-slate-300 max-w-[240px] mb-4">
            Confirmar aprovação de <strong>{profile.fullName}</strong> para perfil ativo de {confirmApprove === UserRole.STUDENT ? 'Aluno' : 'Professor'}?
          </p>
          <div className="flex gap-2 w-full max-w-[220px]">
            <button 
              onClick={() => setConfirmApprove(null)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Voltar
            </button>
            <button 
              onClick={async () => {
                const role = confirmApprove;
                setConfirmApprove(null);
                await handleApproveReal(role);
              }}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-2 text-xs font-bold cursor-pointer"
            >
              Aprovar
            </button>
          </div>
        </div>
      )}

      {alertMsg && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col justify-center items-center p-6 z-[60] text-center text-white">
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3 animate-bounce" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-3 animate-ping" />
          )}
          <h5 className="font-bold text-sm uppercase tracking-wider mb-1 text-white">
            {alertMsg.type === 'success' ? 'Sucesso' : 'Aviso/Erro'}
          </h5>
          <p className="text-xs text-slate-300 max-w-[240px] mb-4">{alertMsg.text}</p>
          <button 
            type="button"
            onClick={() => setAlertMsg(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
          >
            Entendido
          </button>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm",
            profile.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-orange-100 text-orange-600"
          )}>
            {(profile.fullName || 'N N').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {profile.callNumber && (
                <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-slate-200" title="Número de Chamada">
                  Nº {profile.callNumber}
                </span>
              )}
              <h4 
                className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                onClick={onViewDetails}
              >
                {profile.fullName}
              </h4>
              {profile.status === 'pending' && (
                <span className="bg-amber-100 text-amber-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest">Pendente</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {profile.currentGrade && (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                   {profile.currentGrade}
                </span>
              )}
              {profile.email && emailCounts && emailCounts[profile.email.trim().toLowerCase()] >= 2 ? (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200" title={`Conta Família (Contém ${emailCounts[profile.email.trim().toLowerCase()]} alunos cadastrados com o mesmo e-mail)`}>
                  Responsável/Família ({emailCounts[profile.email.trim().toLowerCase()]} Alunos)
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  {profile.role || 'student'}
                </span>
              )}
              {profile.userId && profile.status === 'active' && (
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Ativo
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {profile.status === 'active' && (
            <button 
              onClick={handleTogglePayment}
              disabled={isTogglingPayment}
              title={isPaid ? "Marcar como Inadimplente" : "Marcar como Pago"}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2",
                isPaid 
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              )}
            >
              {isTogglingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPaid ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
            </button>
          )}
          {profile.status === 'active' && !profile.userId && profile.email && (
            <button 
              onClick={handleCreateAccountStart}
              disabled={isCreatingAccount}
              title="Criar Acesso (Login)"
              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors text-slate-400 hover:text-emerald-600 disabled:opacity-50"
            >
              {accountStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={onViewDetails} 
            title="Ver Detalhes e Estatísticas"
            className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <button onClick={onEdit} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-indigo-600">
            <Edit2 className="w-4 h-4" />
          </button>
          {isAdminUser && (
            <button 
              onClick={() => setConfirmDelete(true)} 
              disabled={isDeleting}
              title="Excluir Membro"
              className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-600 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {profile.status === 'pending' ? (
        <div className="mt-6 flex gap-3">
          <button 
            onClick={() => setConfirmApprove(UserRole.STUDENT)}
            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
          >
            Aprovar Aluno
          </button>
          <button 
            onClick={() => setConfirmApprove(UserRole.PROFESSOR)}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            Aprovar Prof
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-ellipsis overflow-hidden">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">E-mail de Login</p>
            <p className="text-xs font-bold text-slate-700 truncate">{profile.email || 'Não cadastrado'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nascimento</p>
            <p className="text-xs font-bold text-slate-700">{formatDate(profile.birthDate)}</p>
          </div>
          
          {profile.medications && (
            <div className="col-span-2 p-3 bg-blue-50/50 rounded-lg flex gap-3 items-start border border-blue-100">
              <ShieldAlert className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">Medicamentos em uso</p>
                <p className="text-xs text-blue-800 font-medium">{profile.medications}</p>
              </div>
            </div>
          )}

          {profile.conditions && (
            <div className="col-span-2 p-3 bg-rose-50/50 rounded-lg flex gap-3 items-start border border-rose-100">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Observações de Saúde</p>
                <p className="text-xs text-rose-800 font-medium">{profile.conditions}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useAuth } from '../../AuthContext';

function MemberModal({ profile, profiles, onClose }: { profile?: Profile | null, profiles: Profile[], onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const isAdminUser = currentUser?.role === UserRole.ADMIN;

  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    email: profile?.email || '',
    birthDate: profile?.birthDate || '',
    enrollmentDate: profile?.enrollmentDate || new Date().toISOString().split('T')[0],
    lastPromotionDate: profile?.lastPromotionDate || '',
    currentGrade: profile?.currentGrade || 'Branca',
    medications: profile?.medications || '',
    healthInsurance: profile?.healthInsurance || '',
    bloodType: profile?.bloodType || '',
    conditions: profile?.conditions || '',
    role: profile?.role || UserRole.STUDENT,
    responsibleId: profile?.responsibleId || '',
    points: profile?.points || 0,
    isApproved: profile?.isApproved !== undefined ? profile.isApproved : true,
    status: profile?.status || 'active',
    callNumber: profile?.callNumber || '',
    isStudent: profile?.isStudent || false,
    phoneNumber: profile?.phoneNumber || '',
    address: profile?.address || ''
  });

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [customCurrentPassword, setCustomCurrentPassword] = useState('');
  const [showPwdField, setShowPwdField] = useState(false);

  // Custom alert and confirmation dialog states for MemberModal scope
  const [modalAlert, setModalAlert] = useState<{ text: string, type: 'success' | 'error', onClose?: () => void } | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    if (isResettingPassword) return;
    setIsResettingPassword(true);
    try {
      await resetStudentPassword(profile.email, customCurrentPassword || undefined);
      setModalAlert({ text: 'Sucesso! A senha de login do aluno foi redefinida para o padrão: 123456', type: 'success' });
      setShowPwdField(false);
      setCustomCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setModalAlert({ text: 'Erro: Senha incorreta. Se o aluno já alterou a senha padrão, digite a senha atual dele no campo "Senha de Login Atual do Aluno" para podermos redefini-la.', type: 'error' });
        setShowPwdField(true);
      } else {
        setModalAlert({ text: `Erro ao redefinir senha do aluno: ${err.message || 'Erro desconhecido'}`, type: 'error' });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!profile?.email) return;
    if (isSendingResetEmail) return;
    setIsSendingResetEmail(true);
    try {
      await sendStudentPasswordReset(profile.email);
      setModalAlert({ text: 'E-mail de redefinição de senha enviado com sucesso usando as ferramentas oficiais do Firebase!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setModalAlert({ text: `Erro ao enviar e-mail de redefinição: ${err.message || 'Erro desconhecido'}`, type: 'error' });
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const normalizedEmail = formData.email ? formData.email.trim().toLowerCase() : '';

      // Check if email already exists in profiles (only if email is provided and it is a new profile)
      if (!profile?.id && normalizedEmail) {
        const q = query(collection(db, 'profiles'), where('email', '==', normalizedEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setModalAlert({ text: 'Um membro com este e-mail já está cadastrado.', type: 'error' });
          setLoading(false);
          return;
        }
      }

      const submissionData = { ...formData, email: normalizedEmail };
      if (!submissionData.email) delete (submissionData as any).email;
      if (!submissionData.responsibleId) delete (submissionData as any).responsibleId;
      if (!submissionData.callNumber) delete (submissionData as any).callNumber;
      delete (submissionData as any).isStudent;

      if (profile?.id) {
        // If email has changed, handle updating Firebase Auth login
        if (normalizedEmail && profile.email && normalizedEmail !== profile.email.toLowerCase()) {
          if (profile.userId) {
            try {
              const res = await updateStudentEmail(profile.email, normalizedEmail, customCurrentPassword || undefined, profile.id);
              if (res && res.uid) {
                submissionData.userId = res.uid;
              }
              setModalAlert({ text: 'E-mail de login do aluno atualizado com sucesso no Firebase Authentication!', type: 'success' });
            } catch (error: any) {
              console.error("Failed to update auth email automatically:", error);
              if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                setModalAlert({ text: 'Erro de Autenticação: O aluno já alterou sua senha padrão de "123456". Preencha a senha atual dele no campo de senha atual para poder atualizar o e-mail de login.', type: 'error' });
                setShowPwdField(true);
                setLoading(false);
                return;
              } else {
                setModalAlert({ text: `Aviso: O e-mail foi alterado no cadastro, mas o login não pôde ser atualizado no Firebase Authentication: ${error.message || 'Erro desconhecido'}`, type: 'error' });
              }
            }
          } else {
            // Profile exists but does not have a userId/Auth account. Create one!
            try {
              const res = await createStudentAccount(normalizedEmail, profile.id);
              if (res && res.uid) {
                submissionData.userId = res.uid;
              }
              setModalAlert({ text: 'Conta de login criada com sucesso no Firebase Authentication para o novo e-mail!', type: 'success' });
            } catch (createErr: any) {
              console.error("Error creating student account automatically on email change:", createErr);
              setModalAlert({ text: `Membro atualizado, mas erro ao criar conta de acesso (Login): ${createErr.message || 'Erro desconhecido'}`, type: 'error' });
            }
          }
        } else if (normalizedEmail && !profile.userId) {
          // If the email did NOT change, but the profile has an email and no userId, let's create a login account!
          try {
            const res = await createStudentAccount(normalizedEmail, profile.id);
            if (res && res.uid) {
              submissionData.userId = res.uid;
            }
            setModalAlert({ text: 'Conta de login criada com sucesso no Firebase Authentication para o e-mail cadastrado!', type: 'success' });
          } catch (createErr: any) {
            console.error("Error creating student account automatically for existing email:", createErr);
          }
        }
        await profilesApi.update(profile.id, submissionData);
        onClose();
      } else {
        const docRef = await addDoc(collection(db, 'profiles'), {
          ...submissionData,
          createdAt: new Date().toISOString()
        });

        // Automatically create login account only if email is provided
        if (normalizedEmail) {
          try {
            await createStudentAccount(normalizedEmail, docRef.id);
          } catch (accountError: any) {
            console.error("Error creating student account automatically:", accountError);
            setModalAlert({ text: `Membro cadastrado, mas erro ao criar conta de acesso (Login): ${accountError.message || 'Erro desconhecido'}`, type: 'error' });
          }
        }
        onClose();
      }
    } catch (e: any) {
      handleFirestoreError(e, profile ? OperationType.UPDATE : OperationType.CREATE, 'profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    
    // Ignore key intercepts in textareas for normal carriage returns and up/down text caret styling
    if (target.tagName === 'TEXTAREA') {
      return;
    }

    const isInput = target.tagName === 'INPUT';
    const isSelect = target.tagName === 'SELECT';

    if (!isInput && !isSelect) return;

    const key = e.key;

    // Standard arrow up/down on input elements, or ENTER key to move to next input/select
    const isArrowDown = key === 'ArrowDown' && isInput;
    const isArrowUp = key === 'ArrowUp' && isInput;
    const isEnter = key === 'Enter';

    if (isArrowDown || isArrowUp || isEnter) {
      // Prevent default form submissions and list/dropdown scrollings which could trigger form events unexpectedly
      e.preventDefault();

      const form = e.currentTarget;
      // Gather all navigable form fields excluding standard hidden autofill blocks
      const focusableElements = Array.from(
        form.querySelectorAll('input:not([tabindex="-1"]), select, textarea, button[type="submit"]')
      ).filter((el: any) => {
        const style = window.getComputedStyle(el);
        return !el.disabled && el.type !== 'hidden' && style.display !== 'none' && style.visibility !== 'hidden';
      });

      const index = focusableElements.indexOf(target);
      if (index > -1) {
        let nextIndex = index;
        if (isArrowDown || isEnter) {
          nextIndex = (index + 1) % focusableElements.length;
        } else if (isArrowUp) {
          nextIndex = (index - 1 + focusableElements.length) % focusableElements.length;
        }
        
        const nextElement = focusableElements[nextIndex] as any;
        if (nextElement) {
          nextElement.focus();
          if (nextElement instanceof HTMLInputElement && (nextElement.type === 'text' || nextElement.type === 'email')) {
            nextElement.select();
          }
        }
      }
    }
  };

  const handleDeleteReal = async () => {
    if (!profile) return;
    setIsDeleting(true);
    try {
      if (profile.email) {
        await deleteStudentAccount(profile.email);
      }
      await deleteDoc(doc(db, 'profiles', profile.id));
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `profiles/${profile.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-100"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{profile ? 'Editar Aluno' : 'Novo Aluno'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Informações Cadastrais</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45 w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1" autoComplete="off">
          {/* Evitar preenchimento automático invasivo do Google Chrome */}
          <div style={{ display: 'none' }}>
            <input type="text" name="chrome_prevent_email_autofill" tabIndex={-1} autoComplete="off" />
            <input type="password" name="chrome_prevent_password_autofill" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Nome Completo</label>
              <input 
                required
                type="text"
                id="fullName"
                name="fullName"
                autoComplete="new-name"
                placeholder="Ex Nome: João Silva"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">E-mail (Login/Notificações)</label>
              <input 
                type="email"
                id="email"
                name="email"
                autoComplete="new-email"
                placeholder="email@exemplo.com"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <p className="text-[8px] text-slate-400 mt-1 ml-1 italic">Opcional para alunos sob responsabilidade.</p>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Telefone / Celular</label>
              <input 
                type="text"
                id="phoneNumber"
                name="phoneNumber"
                placeholder="(00) 00000-0000"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Endereço</label>
              <input 
                type="text"
                id="address"
                name="address"
                placeholder="Rua, Número, Bairro, Cidade - Estado"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            {profile && profile.email && isAdminUser && (
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Credenciais e Segurança de Login</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Gerencie as opções de login e senha do aluno.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPwdField(!showPwdField)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    {showPwdField ? 'Ocultar Campo de Senha' : 'Já alterou a senha padrão?'}
                  </button>
                </div>

                {showPwdField && (
                  <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-100">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Senha de Login Atual do Aluno</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 outline-none text-xs text-slate-800 font-mono"
                      placeholder="Deixe em branco se ainda for a padrão '123456'"
                      value={customCurrentPassword}
                      onChange={e => setCustomCurrentPassword(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-400 leading-relaxed font-semibold">
                      Nota: Se o aluno mudou a senha padrão dele, precisamos da senha atual para autorizar a alteração do e-mail de login ou redefinição da senha diretamente pelo applet cliente do Firebase.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword || isSendingResetEmail}
                    className="flex-1 min-w-[200px] bg-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isResettingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Redefinir Senha para Padrão (123456)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={isResettingPassword || isSendingResetEmail}
                    className="flex-1 min-w-[200px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl py-2.5 px-4 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isSendingResetEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar Link de Redefinição por E-mail</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Data de Nascimento</label>
              <input 
                type="date"
                required
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.birthDate}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Data de Matrícula</label>
              <input 
                type="date"
                required
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                value={formData.enrollmentDate}
                onChange={e => setFormData({...formData, enrollmentDate: e.target.value})}
              />
            </div>

            {formData.role === UserRole.STUDENT && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Última Graduação</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium appearance-none"
                    value={formData.currentGrade}
                    onChange={e => setFormData({...formData, currentGrade: e.target.value})}
                  >
                    {['Branca', 'Cinza', 'Cinza ponta azul', 'Azul', 'Azul ponta amarela', 'Amarela', 'Amarela ponta laranja', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Data da Última Graduação</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                    value={formData.lastPromotionDate}
                    onChange={e => setFormData({...formData, lastPromotionDate: e.target.value})}
                  />
                </div>
              </>
            )}

            {isAdminUser && (
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Função</label>
                 <select 
                   className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium appearance-none"
                   value={formData.role}
                   onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                 >
                   <option value={UserRole.STUDENT}>Aluno</option>
                   <option value={UserRole.PROFESSOR}>Professor</option>

                   <option value={UserRole.ADMIN}>Administrador</option>
                 </select>
               </div>
             )}
 
             {isAdminUser && (
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Situação (Status)</label>
                 <select 
                   className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium appearance-none"
                   value={formData.status}
                   onChange={e => {
                     const statusVal = e.target.value as any;
                     setFormData({
                       ...formData, 
                       status: statusVal, 
                       isApproved: statusVal === 'active' || statusVal === 'inactive' || statusVal === 'blocked'
                     });
                   }}
                 >
                   <option value="active">Ativo (Active)</option>
                   <option value="inactive">Inativo (Inactive)</option>
                   <option value="pending">Pendente (Pending)</option>
                   <option value="blocked">Bloqueado (Blocked)</option>
                  </select>
                </div>
              )}

            {formData.role === UserRole.STUDENT && (
              <div className="md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Informações do Responsável (Opcional)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Nome do Responsável</label>
                    <input 
                      type="text"
                      placeholder="Nome completo"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                      value={formData.responsibleName || ''}
                      onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Telefone do Responsável</label>
                    <input 
                      type="text"
                      placeholder="(00) 00000-0000"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                      value={formData.responsiblePhone || ''}
                      onChange={e => setFormData({...formData, responsiblePhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">E-mail do Responsável</label>
                    <input 
                      type="email"
                      placeholder="email@exemplo.com"
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl py-3 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                      value={formData.responsibleEmail || ''}
                      onChange={e => setFormData({...formData, responsibleEmail: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.role === UserRole.STUDENT && isAdminUser && (
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Número de Chamada (Opcional - Anotações Pessoais)</label>
                <input 
                  type="text"
                  placeholder="Ex: 05, 12, etc. (ajuda a ordenar o aluno conforme suas anotações pessoais)"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium"
                  value={formData.callNumber}
                  onChange={e => setFormData({...formData, callNumber: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Tipo Sanguíneo</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm transition-all text-slate-900 font-medium appearance-none"
                value={formData.bloodType}
                onChange={e => setFormData({...formData, bloodType: e.target.value})}
              >
                <option value="">Selecione</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Alertas Médicos / Medicamentos</label>
              <textarea 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3.5 px-4 outline-none text-sm min-h-[80px] transition-all text-slate-900 font-medium"
                placeholder="Ex: Alérgico a dipirona, asma..."
                value={formData.medications}
                onChange={e => setFormData({...formData, medications: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
            {profile && isAdminUser && (
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting || loading}
                className="px-4 py-3 font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center gap-2 mr-auto active:scale-95 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir</span>
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              disabled={loading || isDeleting}
              className={cn(
                "flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer",
                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 shadow-indigo-600/20"
              )}
            >
              {(loading || isDeleting) && <Loader2 className="w-4 h-4 animate-spin" />}
              {profile ? 'Salvar Alterações' : 'Salvar Cadastro'}
            </button>
          </div>
        </form>
      </motion.div>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">Excluir Cadastro Permanentemente?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o cadastro de <strong>{profile?.fullName}</strong>? Esta ação é irreversível e tentará remover o login do Firebase Auth correspondente.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  setShowConfirmDelete(false);
                  await handleDeleteReal();
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            {modalAlert.type === 'success' ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            )}
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">
              {modalAlert.type === 'success' ? 'Sucesso!' : 'Aviso/Erro'}
            </h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {modalAlert.text}
            </p>
            <button 
              type="button"
              onClick={() => {
                const onDismiss = modalAlert.onClose || (() => {});
                setModalAlert(null);
                onDismiss();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

