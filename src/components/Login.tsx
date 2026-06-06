import React, { useState } from 'react';
import { auth, db, doc } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { UserRole } from '../types';
import { motion } from 'motion/react';
import { User as UserIcon, Lock, Shield, GraduationCap, Users, Fingerprint, Chrome, Mail, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { authenticateWithBiometrics, isBiometricsSupported, hasRegisteredBiometrics } from '../services/biometricService';
import BiometricPrompt from './modules/BiometricPrompt';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  React.useEffect(() => {
    isBiometricsSupported().then(setBiometricSupported);
    setHasBiometrics(hasRegisteredBiometrics());
  }, []);

  const handleSocialLogin = async (providerName: string) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'microsoft') {
        provider = new OAuthProvider('microsoft.com');
      } else if (providerName === 'yahoo') {
        provider = new OAuthProvider('yahoo.com');
      } else {
        throw new Error('Provedor não suportado');
      }

      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setMessage(`Conectado com sucesso como ${result.user.email}!`);
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado porque a janela de autenticação foi fechada.');
      } else if (e.code === 'auth/operation-not-allowed') {
         setError(`Atenção: O login por '${providerName}' precisa estar ativado no console do seu Firebase na seção Authentication > Sign-in method.`);
      } else {
        setError(`Falha ao conectar com ${providerName}: ${e.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
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
        setMessage(`Biometria reconhecida! Conectando como ${result.email}...`);
        await signInWithEmailAndPassword(auth, result.email, result.password);
      }
    } catch (e: any) {
      console.error(e);
      setError('Erro no login biométrico: ' + (e.message || 'Verifique se você registrou a biometria nas configurações do seu perfiln.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const emailLower = username.trim().toLowerCase();

    try {
      await signInWithEmailAndPassword(auth, emailLower, password);
    } catch (e: any) {
      console.log("Auth login attempt notice:", e.message || e);
      // In JS SDK v10+, the error object might have different structures depending on the environment
      const code = e.code || (e.message?.includes('auth/invalid-credential') ? 'auth/invalid-credential' : '');
      
      if (code === 'auth/operation-not-allowed') {
        setError('Erro: O provedor de E-mail/Senha não está ativo no Console do Firebase. Por favor, ative-o em Authentication > Sign-in method.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        // Fallback: This might be the user's first access (pre-registered profile or admin).
        // Attempt on-the-fly registration with the entered password.
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: emailLower.split('@')[0] });
            setMessage('Seu primeiro acesso foi configurado e você foi conectado com sucesso!');
            return;
          }
        } catch (createErr: any) {
          console.error("Failed on-the-fly registration fallback:", createErr);
          if (createErr.code === 'auth/email-already-in-use') {
            if (emailLower === 'pauloeliasc@gmail.com') {
              setError('Sua conta administrativa já existe no Firebase! Se você esqueceu a senha, clique em "Esqueceu a senha?" acima, ou use a opção fácil "Entrar com o Google" abaixo para acessar instantaneamente com sua conta.');
            } else {
              setError('E-mail ou senha incorretos. Caso tenha esquecido sua senha, por favor use a opção "Esqueceu a senha?" para redefini-la ou tente usar o botão "Entrar com o Google".');
            }
          } else if (createErr.code === 'auth/weak-password') {
            setError('A senha deve ter pelo menos 6 caracteres se este for seu primeiro acesso.');
          } else if (createErr.code === 'auth/invalid-email') {
            setError('Por favor, insira um e-mail válido.');
          } else {
            setError('E-mail ou senha incorretos. Se você for aluno e este for seu primeiro acesso, a senha padrão é 123456.');
          }
          return;
        }
      } else if (code === 'auth/invalid-email') {
        setError('Por favor, insira um e-mail válido.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta. Tente fazer login ou redefinir a senha.');
      } else if (code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Tente novamente mais tarde ou redefina sua senha.');
      } else {
        setError('Erro no acesso: ' + (e.message || 'Dados inválidos.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError('Por favor, insira o seu nome completo.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, username.trim().toLowerCase(), password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: fullName.trim() });
      }
      setMessage('Sua conta foi criada com sucesso! Você já pode entrar no sistema.');
      setIsRegistering(false);
    } catch (e: any) {
      console.log("Cadastro registration attempt notice:", e.message || e);
      const code = e.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso por outra conta.');
      } else if (code === 'auth/invalid-email') {
        setError('Por favor, insira um e-mail válido.');
      } else if (code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta: ' + (e.message || 'Dados inválidos.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setError('Por favor, insira seu e-mail no campo acima para redefinir a senha.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, username.trim().toLowerCase());
      setMessage('Link de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        setError('E-mail não encontrado no sistema.');
      } else if (e.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Erro ao enviar e-mail: ' + (e.message || 'Erro desconhecido'));
      }
      console.log("Forgot password attempt notice:", e.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 border border-slate-200"
      >
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-slate-100 overflow-hidden">
               <img 
                 src="./logo.png" 
                 alt="Judoka Dojô" 
                 className="w-22 h-22 object-contain"
                 referrerPolicy="no-referrer"
               />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-slate-900 tracking-tight">Judoka Dojô</h1>
          <p className="text-slate-400 text-center mt-1.5 font-medium text-sm">
            Gestão Inteligente de Academia
          </p>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="mt-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl text-xs font-bold text-center border bg-rose-50 text-rose-700 border-rose-100">
                {error}
              </div>
            )}
            
            {message && (
              <div className="p-4 rounded-xl text-xs font-bold text-center border bg-emerald-50 text-emerald-700 border-emerald-100">
                {message}
              </div>
            )}

            <div className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">
                  E-mail
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Senha
                  </label>
                  {!isRegistering && (
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                      placeholder="Repita sua senha"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isRegistering ? 'Criar Nova Conta' : 'Entrar no Sistema')}
            </button>



            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setMessage('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
              </button>
            </div>

            {!isRegistering && biometricSupported && hasBiometrics && (
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-110 text-indigo-700 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  Entrar com Biometria
                </button>
              </div>
            )}
          </form>
        </div>
      </motion.div>

      <BiometricPrompt 
        isOpen={showBiometricPrompt}
        onClose={() => setShowBiometricPrompt(false)}
        onSuccess={handleBiometricSuccess}
        title="Validar Biometria"
        subtitle="Posicione seu dedo no leitor biométrico ou sensor para acessar Judoka Dojô"
      />
    </div>
  );
}
