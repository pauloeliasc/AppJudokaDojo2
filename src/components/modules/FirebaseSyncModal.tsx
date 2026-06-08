import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../../types';
import { db, doc } from '../../lib/firebase';
import { deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  X, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  UserX, 
  Trash2, 
  Sparkles, 
  UserCheck, 
  ShieldAlert, 
  Plus, 
  Globe,
  ShieldCheck,
  Link2
} from 'lucide-react';
import { createStudentAccount, deleteStudentAccount } from '../../services/adminService';

interface FirebaseSyncModalProps {
  profiles: Profile[];
  onClose: () => void;
}

export default function FirebaseSyncModal({ profiles, onClose }: FirebaseSyncModalProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [failedPasswordResetEmail, setFailedPasswordResetEmail] = useState<string | null>(null);
  
  // Local list of profiles that we can interact with and update dynamically
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(profiles);

  // Safe deletions inside iframe
  const [showConfirmDelete, setShowConfirmDelete] = useState<{ profileId: string; email?: string } | null>(null);

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  // Analyzed discrepancies
  const [duplicates, setDuplicates] = useState<{ email: string; items: Profile[] }[]>([]);
  const [unlinked, setUnlinked] = useState<Profile[]>([]);
  const [inactivesWithAuth, setInactivesWithAuth] = useState<Profile[]>([]);

  // Analyze our profiles for issues
  const analyzeData = () => {
    const emailMap: Record<string, Profile[]> = {};
    const unlinkedList: Profile[] = [];
    const inactiveWithAuthList: Profile[] = [];

    localProfiles.forEach(p => {
      if (!p.email) return;
      const normalizedEmail = p.email.trim().toLowerCase();

      // Duplicates tracker
      if (!emailMap[normalizedEmail]) {
        emailMap[normalizedEmail] = [];
      }
      emailMap[normalizedEmail].push(p);

      // Unlinked tracker (has email, but no userId and is active)
      const isActive = !p.status || p.status === 'active';
      if (isActive && !p.userId) {
        unlinkedList.push(p);
      }

      // Inactive but has Auth details tracker
      const isInactive = p.status === 'inactive' || p.status === 'blocked';
      if (isInactive && (p.userId || p.email)) {
        inactiveWithAuthList.push(p);
      }
    });

    // Filter emailMap to only get actual duplicates
    const duplicatesList = Object.entries(emailMap)
      .filter(([_, items]) => items.length > 1)
      .map(([email, items]) => ({ email, items }));

    setDuplicates(duplicatesList);
    setUnlinked(unlinkedList);
    setInactivesWithAuth(inactiveWithAuthList);
  };

  // Re-run analysis whenever localProfiles change
  useEffect(() => {
    analyzeData();
  }, [localProfiles]);

  // Mass normalization and database sync
  const handleMassSync = async () => {
    setLoading(true);
    setStatusMessage('Iniciando varredura geral de cruzamento...');
    setError('');
    
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      // Normalise all emails and clean states in batch
      for (const p of localProfiles) {
        if (p.email) {
          const cleanedEmail = p.email.trim().toLowerCase();
          if (cleanedEmail !== p.email) {
            const docRef = doc(db, 'profiles', p.id);
            batch.update(docRef, { email: cleanedEmail });
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        await batch.commit();
        setStatusMessage(`Varredura concluída! E-mails de ${updatedCount} cadastro(s) foram normalizados.`);
      } else {
        setStatusMessage('Varredura concluída! Todos os cadastros no Firestore já estão com formatos consistentes e higienizados.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Falha ao sincronizar cadastros: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Create student account on Auth
  const handleCreateAuth = async (profileId: string, email: string) => {
    setLoading(true);
    setStatusMessage(`Criando credenciais de acesso para ${email}...`);
    setError('');
    setFailedPasswordResetEmail(null);
    try {
      await createStudentAccount(email, profileId);
      setStatusMessage('Sucesso! Conta criada com senha padrão: 123456');
      // Update local state to trigger recalculations
      setLocalProfiles(prev => 
        prev.map(p => p.id === profileId ? { ...p, userId: 'linked_temp' } : p)
      );
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Erro desconhecido';
      setError(`Erro ao criar conta Auth para ${email}: ${errMsg}`);
      if (errMsg.includes('já possui uma conta') || errMsg.includes('123456')) {
        setFailedPasswordResetEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAllFamily = async (email: string, items: Profile[]) => {
    setLoading(true);
    setStatusMessage(`Vinculando perfis do e-mail ${email} em uma única conta de família...`);
    setError('');
    setFailedPasswordResetEmail(null);

    try {
      // Find one items with a valid userId (if any)
      let actualUid = items.map(p => p.userId).find(uid => !!uid && uid !== 'linked_temp');

      if (!actualUid) {
        // If none of them has a userId, create an Auth account for the first profile in the list
        const res = await createStudentAccount(email, items[0].id);
        if (res && res.uid) {
          actualUid = res.uid;
        }
      }

      if (!actualUid) {
        throw new Error("Não foi possível gerar ou obter uma credencial de autenticação única.");
      }

      // Update all profiles sharing this email to have the same userId
      const batch = writeBatch(db);
      for (const item of items) {
        const docRef = doc(db, 'profiles', item.id);
        batch.update(docRef, { userId: actualUid });
      }
      await batch.commit();

      setStatusMessage(`Sucesso! Todos os perfis com o e-mail ${email} foram vinculados.`);
      
      // Update local state to trigger recalculations in the sync component
      setLocalProfiles(prev => 
        prev.map(p => p.email?.trim().toLowerCase() === email.trim().toLowerCase() ? { ...p, userId: actualUid! } : p)
      );

    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Erro desconhecido';
      setError(`Erro ao vincular conta de família: ${errMsg}`);
      if (errMsg.includes('já possui uma conta') || errMsg.includes('123456')) {
        setFailedPasswordResetEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  // Permanent Delete of a student (Auth & Firestore)
  const handlePermanentDeleteReal = async (profileId: string, email?: string) => {
    setLoading(true);
    setStatusMessage('Iniciando exclusão permanente no Firebase...');
    setError('');

    try {
      // 1. Delete Firestore profile doc
      await deleteDoc(doc(db, 'profiles', profileId));

      // 2. Delete Auth if email matches
      if (email) {
        setStatusMessage(`Removendo credenciais de login associadas ao e-mail ${email}...`);
        await deleteStudentAccount(email);
      }

      setStatusMessage('Exclusão executada com sucesso em todas as frentes!');
      // Update local state
      setLocalProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao excluir cadastro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-slate-100"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Cruzamento de Cadastros & Sincronização</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Firebase Integrity Audit Control</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-100"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* Top Status & Error Indicators */}
          {statusMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-semibold"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{statusMessage}</span>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex flex-col gap-3 text-sm font-semibold animate-shake"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              {failedPasswordResetEmail && (
                <div className="mt-1 p-4 bg-white border border-rose-100 rounded-xl space-y-3 shadow-sm select-none">
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold font-sans">
                    💡 Quer que o sistema redefina essa conta antiga do aluno para usar a senha padrão <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">"123456"</code> e depois tente vinculá-la automaticamente?
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const email = failedPasswordResetEmail;
                      setLoading(true);
                      setStatusMessage(`Redefinindo senha de ${email} no Firebase e tentando vincular novamente...`);
                      setError('');
                      try {
                        const { resetStudentPassword } = await import('../../services/adminService');
                        await resetStudentPassword(email);
                        setStatusMessage(`Senha de ${email} redefinida! Reativando operação para vincular o perfil...`);
                        
                        // Retry original action
                        const dupItem = duplicates.find(d => d.email.trim().toLowerCase() === email.trim().toLowerCase());
                        if (dupItem) {
                          await handleLinkAllFamily(email, dupItem.items);
                        } else {
                          const unlinkedItem = unlinked.find(u => u.email?.trim().toLowerCase() === email.trim().toLowerCase());
                          if (unlinkedItem) {
                            await handleCreateAuth(unlinkedItem.id, email);
                          } else {
                            setStatusMessage(`Senha de ${email} redefinida com sucesso para o padrão "123456"!`);
                            setFailedPasswordResetEmail(null);
                          }
                        }
                      } catch (err: any) {
                        setError(`Falha ao redefinir e vincular automaticamente: ${err.message || err}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer max-w-max"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                    <span>Redefinir para "123456" & Vincular</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">E-mails Duplicados</span>
                <AlertTriangle className={`w-4 h-4 ${duplicates.length > 0 ? "text-amber-500" : "text-slate-300"}`} />
              </div>
              <span className="text-3xl font-black text-slate-800 leading-none">{duplicates.length}</span>
              <p className="text-[10px] text-slate-500 font-bold mt-1.5">E-mails associados a múltiplos perfis no banco.</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Acessos Pendentes</span>
                <UserCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-3xl font-black text-slate-800 leading-none">{unlinked.length}</span>
              <p className="text-[10px] text-slate-500 font-bold mt-1.5">Alunos ativos com e-mail, mas sem login criado.</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Inativos no banco</span>
                <UserX className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-3xl font-black text-slate-800 leading-none">{inactivesWithAuth.length}</span>
              <p className="text-[10px] text-slate-500 font-bold mt-1.5">Alunos marcados como inativos ou desvinculados.</p>
            </div>
          </div>

          {/* Banner Cruzamento Geral */}
          <div className="relative overflow-hidden bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Varredura de Integridade Automática</span>
              </div>
              <h4 className="text-lg font-black tracking-tight">Cruzar & Normalizar registros de Alunos</h4>
              <p className="text-slate-300 text-xs leading-relaxed max-w-2xl font-medium">
                Esta ação executa uma varredura cruzada em todos os perfis ativos cadastrados no Firebase Firestore, garantindo que o e-mail cadastrado esteja normalizado (em minúsculas, sem espaços extras) para prevenir logins duplicados ou falhas inesperadas de credenciais.
              </p>
              <button
                onClick={handleMassSync}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-xl shadow-lg transition-all border border-indigo-500/10 active:scale-[0.98] mt-2 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Iniciar Cruzamento & Saneamento</span>
              </button>
            </div>
          </div>

          {/* Detailed Lists */}

          {/* 1. DUPLICATES DETECTION */}
          {duplicates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">E-mails Compartilhados (Múltiplos Perfis / Família)</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Múltiplos alunos estão usando o mesmo e-mail (por exemplo, irmãos ou filhos que usam o e-mail do pai/mãe). O sistema agora suporta logins de família unificados! Você pode vincular todos eles ao mesmo login unificado de acesso ou, se preferir, excluir fichas obsoletas.
              </p>

              <div className="space-y-3">
                {duplicates.map((dup, index) => (
                  <div key={index} className="p-5 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs font-black font-mono text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full inline-block">
                        {dup.email}
                      </span>
                      <button
                        onClick={() => handleLinkAllFamily(dup.email, dup.items)}
                        disabled={loading}
                        className="text-[10px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-xl transition-all self-start sm:self-center flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" /> Vincular Todos (Acesso Família)
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dup.items.map((it) => (
                        <div key={it.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">{it.fullName}</span>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide mt-1">
                              Status: {it.status || 'active'} | Graduação: {it.currentGrade} | ID de Acesso: {it.userId ? (it.userId === 'linked_temp' ? 'Vinculado' : it.userId.slice(0, 8) + '...') : 'Não Vinculado'}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowConfirmDelete({ profileId: it.id, email: it.email })}
                            disabled={loading}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. UNLINKED ACCOUNTS (ACTIVE WITHOUT AUTH USERID) */}
          {unlinked.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Acessos Pendentes (Sem login ativado)</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium font-sans">
                Estes são alunos ativos que já possuem e-mail informado em suas fichas de cadastro, porém ainda não possuem uma credencial ativa de autenticação gerada no Firebase Auth de login.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unlinked.map((it) => (
                  <div key={it.id} className="bg-white p-4.5 rounded-2.5xl border border-slate-150 flex items-center justify-between hover:border-slate-300 transition-all shadow-sm">
                    <div>
                      <span className="text-xs font-black text-slate-800 block leading-tight">{it.fullName}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-1">{it.email}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 inline-block bg-slate-50 px-2 py-0.5 rounded-lg">
                        {it.currentGrade}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateAuth(it.id, it.email!)}
                        disabled={loading}
                        className="bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer transition-all"
                        title="Criar credenciais no Firebase"
                      >
                        Criar Login
                      </button>
                      <button
                        onClick={() => setShowConfirmDelete({ profileId: it.id, email: it.email })}
                        disabled={loading}
                        className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. INACTIVE PROFILES STUCK WITH AUTH CREDENTIALS */}
          {inactivesWithAuth.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserX className="w-5 h-5 text-rose-500" />
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Membros Inativos no Firebase</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Alunos marcados como inativos ou desvinculados que ainda ocupam o seu e-mail de acesso no Firebase Auth. Para liberar o e-mail de modo que o aluno possa se recadastrar caso decida retornar, efetue a exclusão permanente abaixo.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactivesWithAuth.map((it) => (
                  <div key={it.id} className="bg-slate-50 p-4.5 rounded-2.5xl border border-slate-150 flex items-center justify-between hover:border-slate-300 transition-all shadow-sm">
                    <div>
                      <span className="text-xs font-black text-slate-400 block leading-tight">{it.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">{it.email || "Sem e-mail"}</span>
                      <span className="text-[9px] font-bold text-rose-500 uppercase mt-1 inline-block bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                        {it.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowConfirmDelete({ profileId: it.id, email: it.email })}
                      disabled={loading}
                      className="bg-rose-100 hover:bg-rose-200 border border-thin border-rose-200 text-rose-700 font-bold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Definitivo</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informative Note */}
          <div className="p-5 bg-indigo-50/30 rounded-3xl border border-indigo-100 flex gap-4 items-start">
            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-indigo-950 uppercase tracking-widest mb-1">Garantia de Sincronismo & Re-cadastro</h5>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans font-medium">
                Sempre que um aluno desliga-se ou é desvinculado, a exclusão completa e permanente do Firestore e Auth garante que, caso ele/ela regresse no futuro à sua academia, o seu e-mail estará inteiramente desimpedido e pronto para nova indexação de matrícula.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>

      {/* Confirmation Dialog safe for cross-origin iframe */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[250] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">Excluir Permanentemente?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              ATENÇÃO: Deseja realmente excluir permanentemente este cadastro e seu acesso à academia do Firebase Auth/Firestore? Esta ação removerá o perfil e liberará o e-mail para novos cadastros.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const target = showConfirmDelete;
                  setShowConfirmDelete(null);
                  await handlePermanentDeleteReal(target.profileId, target.email);
                }}
                className="flex-1 bg-rose-50 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
