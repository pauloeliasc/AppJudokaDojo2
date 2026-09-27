import React, { useState, useEffect } from 'react';
import { auth, db, doc } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Lock, Shield, GraduationCap, Users, Fingerprint, 
  Mail, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  Smartphone, Monitor, HelpCircle, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { authenticateWithBiometrics, isBiometricsSupported, hasRegisteredBiometrics } from '../services/biometricService';
import BiometricPrompt from './modules/BiometricPrompt';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>(UserRole.STUDENT);
  const [registerBelt, setRegisterBelt] = useState('Branca');

  // UI state
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState<UserRole | null>(null);
  
  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [forgotError, setForgotError] = useState('');

  // Biometrics
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    isBiometricsSupported().then(setBiometricSupported);
    setHasBiometrics(hasRegisteredBiometrics());
  }, []);

  // Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const emailLower = username.trim().toLowerCase();

    // Check if there is an active reset email mapping (so students with reset passwords can login)
    let loginEmail = emailLower;
    try {
      const resetSnap = await getDoc(doc(db, 'auth_resets', emailLower));
      if (resetSnap.exists()) {
        loginEmail = resetSnap.data().resetAuthEmail;
      }
    } catch (e) {
      console.warn("Could not check auth_resets mapping:", e);
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (e: any) {
      console.log("Auth login attempt notice:", e.message || e);
      const code = e.code || (e.message?.includes('auth/invalid-credential') ? 'auth/invalid-credential' : '');
      
      if (code === 'auth/operation-not-allowed') {
        setError('Erro: O provedor de E-mail/Senha não está ativo no Console do Firebase.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos. Caso seja seu primeiro acesso ou não tenha senha, use a aba "Criar Conta" ou solicite a redefinição.');
      } else if (code === 'auth/invalid-email') {
        setError('Por favor, insira um e-mail válido.');
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Aguarde alguns minutos ou redefina sua senha.');
      } else {
        setError('Erro no acesso: ' + (e.message || 'Dados inválidos.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Self-Registration / Account Creation (Aluno, Ajudante, Professor, Admin)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const emailLower = registerEmail.trim().toLowerCase();

    if (!registerName.trim()) {
      setError('Por favor, informe seu nome completo.');
      setLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, emailLower, registerPassword);
      const uid = userCredential.user.uid;

      // 2. Check if a profile with this email was already pre-registered by Sensei
      let existingProfileId = uid;
      try {
        const q = query(collection(db, 'profiles'), where('email', '==', emailLower));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          existingProfileId = qSnap.docs[0].id;
        }
      } catch (err) {
        console.warn("Could not check existing profile on register:", err);
      }

      // 3. Save profile data in Firestore
      await setDoc(doc(db, 'profiles', existingProfileId), {
        id: existingProfileId,
        userId: uid,
        uid: uid,
        fullName: registerName.trim(),
        email: emailLower,
        role: registerRole,
        currentGrade: registerBelt,
        status: 'active',
        isApproved: true,
        points: 50,
        enrollmentDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Also ensure profiles/{uid} points correctly
      if (existingProfileId !== uid) {
        await setDoc(doc(db, 'profiles', uid), {
          id: uid,
          userId: uid,
          role: registerRole,
          fullName: registerName.trim(),
          email: emailLower,
          targetProfileId: existingProfileId,
          isPointer: true
        }, { merge: true });
      }

      // 4. Save users collection doc for rule caching
      await setDoc(doc(db, 'users', uid), {
        role: registerRole
      }, { merge: true });

      setMessage('Conta criada com sucesso! Entrando...');
    } catch (e: any) {
      console.error("Register error:", e);
      if (e.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui conta cadastrada. Tente fazer login ou redefinir a senha.');
      } else if (e.code === 'auth/weak-password') {
        setError('A senha informada é fraca. Use pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta: ' + (e.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Role Access (For testing / demonstration across any device)
  const handleQuickRoleAccess = async (targetRole: UserRole) => {
    setQuickLoadingRole(targetRole);
    setError('');
    setMessage('');

    const roleConfig = {
      [UserRole.ADMIN]: {
        email: 'admin@judokadojo.com',
        name: 'Administrador do Dojô',
        belt: 'Preta',
        pass: 'dojo123456'
      },
      [UserRole.PROFESSOR]: {
        email: 'sensei@judokadojo.com',
        name: 'Sensei Silva',
        belt: 'Preta',
        pass: 'dojo123456'
      },
      [UserRole.ASSISTANT]: {
        email: 'ajudante@judokadojo.com',
        name: 'Ajudante Rafael (Tatame)',
        belt: 'Marrom',
        pass: 'dojo123456'
      },
      [UserRole.STUDENT]: {
        email: 'aluno@judokadojo.com',
        name: 'Lucas Judoca (Aluno)',
        belt: 'Azul',
        pass: 'dojo123456'
      }
    };

    const cfg = roleConfig[targetRole];

    try {
      // 1. Try to sign in with pre-configured credentials
      await signInWithEmailAndPassword(auth, cfg.email, cfg.pass);
    } catch (err: any) {
      // 2. If account does not exist yet, provision it seamlessly on the fly
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cfg.email, cfg.pass);
          const uid = userCredential.user.uid;

          await setDoc(doc(db, 'profiles', uid), {
            id: uid,
            userId: uid,
            fullName: cfg.name,
            email: cfg.email,
            role: targetRole,
            currentGrade: cfg.belt,
            status: 'active',
            isApproved: true,
            points: targetRole === UserRole.STUDENT ? 120 : 0,
            enrollmentDate: new Date().toISOString().split('T')[0]
          }, { merge: true });

          await setDoc(doc(db, 'users', uid), {
            role: targetRole
          }, { merge: true });
        } catch (createErr: any) {
          console.error("Auto-provision demo role failed:", createErr);
          setError(`Não foi possível iniciar como ${cfg.name}: ${createErr.message}`);
        }
      } else {
        setError(`Erro ao acessar como ${cfg.name}: ${err.message}`);
      }
    } finally {
      setQuickLoadingRole(null);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Por favor, informe seu e-mail.');
      return;
    }

    setForgotStatus('loading');
    setForgotError('');

    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotStatus('success');
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setForgotError('Nenhuma conta encontrada com este e-mail.');
      } else {
        setForgotError('Erro ao enviar e-mail: ' + (err.message || 'Verifique o e-mail digitado.'));
      }
      setForgotStatus('error');
    }
  };

  const handleBiometricLogin = () => {
    setError('');
    setMessage('');
    setShowBiometricPrompt(true);
  };

  const handleBiometricSuccess = async () => {
    setShowBiometricPrompt(false);
    setLoading(true);
    try {
      const result = await authenticateWithBiometrics();
      if (result.success && result.email && result.password) {
        setMessage(`Biometria reconhecida! Conectando...`);
        await signInWithEmailAndPassword(auth, result.email, result.password);
      }
    } catch (e: any) {
      console.error(e);
      setError('Erro no login biométrico: ' + (e.message || 'Verifique as configurações do seu perfil.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Japanese Calligraphy Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800/20 text-[20rem] font-black select-none pointer-events-none tracking-widest">
        柔道
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 z-10 my-4"
      >
        <div className="p-6 sm:p-8">
          {/* Logo & Header */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden shrink-0">
              <img 
                src="./logo.png" 
                alt="Judoka Dojô" 
                className="w-18 h-18 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-center text-slate-900 tracking-tight">Judoka Dojô</h1>
          <p className="text-slate-400 text-center mt-1 font-semibold text-xs uppercase tracking-wider">
            Gestão Inteligente & Tatame Digital
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl mt-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setMessage('');
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center",
                mode === 'login' 
                  ? "bg-white text-slate-900 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setMessage('');
              }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center",
                mode === 'register' 
                  ? "bg-white text-slate-900 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Criar Conta / Cadastro
            </button>
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="mt-4 p-3.5 rounded-2xl text-xs font-bold text-center border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3.5 rounded-2xl text-xs font-bold text-center border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1">{message}</span>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                  E-mail
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(username);
                      setShowForgotModal(true);
                      setForgotStatus('idle');
                      setForgotError('');
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-11 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar no Sistema'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {biometricSupported && hasBiometrics && (
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  Entrar com Biometria
                </button>
              )}
            </form>
          ) : (
            // FORM: REGISTER
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                  Nome Completo
                </label>
                <input 
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                  placeholder="Nome do Aluno ou Professor"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                  E-mail
                </label>
                <input 
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                  Crie uma Senha
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-11 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                    Tipo de Acesso
                  </label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={UserRole.STUDENT}>🥋 Aluno</option>
                    <option value={UserRole.ASSISTANT}>🥋 Ajudante</option>
                    <option value={UserRole.PROFESSOR}>🥋 Professor / Sensei</option>
                    <option value={UserRole.ADMIN}>🛡️ Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                    Faixa de Judô
                  </label>
                  <select
                    value={registerBelt}
                    onChange={(e) => setRegisterBelt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Branca">Branca</option>
                    <option value="Cinza">Cinza</option>
                    <option value="Azul">Azul</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Laranja">Laranja</option>
                    <option value="Verde">Verde</option>
                    <option value="Roxa">Roxa</option>
                    <option value="Marrom">Marrom</option>
                    <option value="Preta">Preta</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro & Acessar'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Access Section by Role */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Acesso Rápido por Função (1 Clique)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Qualquer Dispositivo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRoleAccess(UserRole.STUDENT)}
                disabled={quickLoadingRole !== null || loading}
                className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    🥋
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block group-hover:text-blue-700">
                      Aluno
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {quickLoadingRole === UserRole.STUDENT ? 'Entrando...' : 'Carteirinha & Gokyo'}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleAccess(UserRole.ASSISTANT)}
                disabled={quickLoadingRole !== null || loading}
                className="p-3 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                    🥋
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block group-hover:text-amber-800">
                      Ajudante
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {quickLoadingRole === UserRole.ASSISTANT ? 'Entrando...' : 'Scanner QR & Tatame'}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleAccess(UserRole.PROFESSOR)}
                disabled={quickLoadingRole !== null || loading}
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                    🥋
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block group-hover:text-indigo-700">
                      Professor
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {quickLoadingRole === UserRole.PROFESSOR ? 'Entrando...' : 'Sensei & Aulas'}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickRoleAccess(UserRole.ADMIN)}
                disabled={quickLoadingRole !== null || loading}
                className="p-3 rounded-2xl border border-slate-200 hover:border-slate-800 hover:bg-slate-100 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                    🛡️
                  </span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Administrador
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {quickLoadingRole === UserRole.ADMIN ? 'Entrando...' : 'Gestão Completa'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Cross-Platform Badge Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold text-center">
            <Smartphone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <Monitor className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>Compatível com Android, iOS (iPhone/iPad) e Computador</span>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Redefinir Senha
              </h3>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Informe seu e-mail cadastrado. Enviaremos um link de recuperação diretamente para sua caixa de entrada.
            </p>

            {forgotStatus === 'success' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p>E-mail de recuperação enviado com sucesso!</p>
                <p className="text-[11px] font-medium text-emerald-700">
                  Verifique sua caixa de entrada e pasta de spam.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 w-full py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                    {forgotError}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    Seu E-mail
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="aluno@email.com"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-base font-medium text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotStatus === 'loading'}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                  >
                    {forgotStatus === 'loading' ? 'Enviando...' : 'Enviar Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Biometric Prompt */}
      <BiometricPrompt 
        isOpen={showBiometricPrompt}
        onClose={() => setShowBiometricPrompt(false)}
        onSuccess={handleBiometricSuccess}
        title="Validar Biometria"
        subtitle="Posicione seu dedo no leitor biométrico ou sensor para acessar o Judoka Dojô"
      />
    </div>
  );
}
