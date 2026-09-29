import React, { useState } from 'react';
import { auth, db, doc } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  User as UserIcon, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawInput = username.trim();
    if (!rawInput) {
      setError('Por favor, informe seu e-mail de acesso ou usuário.');
      return;
    }

    if (!password) {
      setError('Por favor, digite sua senha.');
      return;
    }

    setLoading(true);

    let emailToUse = rawInput.toLowerCase();
    // Allow quick handle resolution if user didn't enter full domain
    if (!emailToUse.includes('@')) {
      if (emailToUse === 'admin' || emailToUse === 'administrador') {
        emailToUse = 'admin@judokadojo.com';
      } else if (emailToUse === 'sensei' || emailToUse === 'professor') {
        emailToUse = 'sensei@judokadojo.com';
      } else if (emailToUse === 'ajudante' || emailToUse === 'assistente') {
        emailToUse = 'ajudante@judokadojo.com';
      } else if (emailToUse === 'pauloeliasc' || emailToUse === 'paulo') {
        emailToUse = 'pauloeliasc@gmail.com';
      } else {
        emailToUse = `${emailToUse.replace(/\s+/g, '.')}@judokadojo.com`;
      }
    }

    // Safety timeout: Never leave user stuck on loading spinner longer than 9s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('A conexão com o servidor demorou a responder. Verifique sua rede e tente novamente.');
    }, 9000);

    try {
      // 1. Check if there is an active reset/alias email in auth_resets
      try {
        const resetSnap = await getDoc(doc(db, 'auth_resets', emailToUse));
        if (resetSnap.exists() && resetSnap.data()?.resetAuthEmail) {
          emailToUse = resetSnap.data().resetAuthEmail;
        }
      } catch (checkErr) {
        // Non-blocking query failure
      }

      // 2. Direct Firebase Authentication sign-in
      try {
        await signInWithEmailAndPassword(auth, emailToUse, password);
        clearTimeout(timeoutId);
        return;
      } catch (signInErr: any) {
        const code = signInErr?.code || '';
        
        // If account is not in Firebase Auth yet (e.g. pre-registered student),
        // attempt on-demand account activation using their email and password
        if (
          code === 'auth/user-not-found' || 
          code === 'auth/invalid-credential' ||
          signInErr?.message?.includes('invalid-credential')
        ) {
          try {
            await createUserWithEmailAndPassword(auth, emailToUse, password);
            clearTimeout(timeoutId);
            return;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // The account exists in Auth, but the provided password was incorrect
              clearTimeout(timeoutId);
              setError('E-mail ou senha incorretos. Por favor, confira os dados digitados.');
              return;
            } else if (createErr.code === 'auth/weak-password') {
              clearTimeout(timeoutId);
              setError('A senha deve ter no mínimo 6 caracteres.');
              return;
            }
          }
        }
        throw signInErr;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Login attempt failed:", err);
      const code = err?.code || '';
      
      if (
        code === 'auth/invalid-credential' || 
        code === 'auth/user-not-found' || 
        code === 'auth/wrong-password' ||
        err?.message?.includes('invalid-credential')
      ) {
        setError('E-mail ou senha incorretos. Por favor, confira os dados digitados.');
      } else if (code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido. Digite um e-mail válido (ex: seu@email.com).');
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Aguarde 1 minuto e tente novamente.');
      } else if (code === 'auth/network-request-failed') {
        setError('Falha de conexão com os servidores. Verifique sua rede e tente novamente.');
      } else {
        setError('Não foi possível entrar: ' + (err?.message || 'Verifique seus dados e tente novamente.'));
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 p-4 sm:p-6 font-sans relative overflow-hidden select-none">
      {/* Background Japanese Calligraphy Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800/20 text-[20rem] font-black select-none pointer-events-none tracking-widest">
        柔道
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 relative z-10 my-4"
      >
        <div className="p-7 sm:p-9">
          {/* Logo & Header */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-slate-50 border border-slate-200/80 rounded-3xl flex items-center justify-center shadow-md p-2">
              <img 
                src="/logo.png" 
                alt="Judoka Dojô" 
                className="w-16 h-16 object-contain"
                loading="eager"
              />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-center text-slate-900 tracking-tight">Judoka Dojô</h1>
          <p className="text-slate-400 text-center mt-1 font-semibold text-xs uppercase tracking-wider">
            Gestão de Academia & Tatame Digital
          </p>

          {/* Error Feedback */}
          {error && (
            <div className="mt-5 p-3.5 rounded-2xl text-xs font-bold text-center border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="flex-1 text-left">{error}</span>
            </div>
          )}

          {/* Direct, Streamlined Login Form */}
          <form onSubmit={handleLogin} noValidate className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  inputMode="email"
                  autoComplete="username email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all font-medium text-slate-800"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando ao Dojô...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Acesso exclusivo para alunos, professores e responsáveis do Judoka Dojô.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
