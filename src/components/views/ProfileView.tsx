import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import { profilesApi } from '../../services/firestoreService';
import { changePassword } from '../../services/adminService';
import { UserCircle, Save, Key, Loader2, CheckCircle, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { isBiometricsSupported, registerBiometrics } from '../../services/biometricService';
import BiometricPrompt from '../modules/BiometricPrompt';

export default function ProfileView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
  });

  React.useEffect(() => {
    isBiometricsSupported().then(setBiometricSupported);
    if (user) {
      const profileId = user.id || user.uid;
      profilesApi.getById(profileId).then(profileData => {
        if (profileData) {
          setFormData({
            fullName: profileData.fullName || '',
            email: profileData.email || '',
            phoneNumber: profileData.phoneNumber || '',
            address: profileData.address || '',
          });
        } else {
          setFormData({
            fullName: user.name || '',
            email: user.email || '',
            phoneNumber: '',
            address: '',
          });
        }
      });
    }
  }, [user]);

  const handleRegisterBiometrics = () => {
    if (!user?.uid || !formData.email) return;
    if (!biometricPassword) {
      setError('Por favor, digite sua senha de acesso atual no campo indicado antes de configurar a biometria.');
      return;
    }
    setError('');
    setShowBiometricPrompt(true);
  };

  const handleBiometricSuccess = async () => {
    if (!user?.uid || !formData.email) return;
    setShowBiometricPrompt(false);
    setLoading(true);
    try {
      const res = await registerBiometrics(user.uid, formData.email, formData.fullName, biometricPassword);
      setSuccess(
        res.isSimulated
          ? 'Impressão digital vinculada localmente com sucesso neste dispositivo!'
          : 'Acesso biométrico configurado e ativo com sucesso!'
      );
      setBiometricPassword('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      console.error(e);
      setError('Erro ao registrar biometria: ' + (e.message || 'Verifique se seu dispositivo suporta essa função.'));
    } finally {
      setLoading(false);
    }
  };

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const profileId = user.id || user.uid;
      await profilesApi.update(profileId, {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address
      });
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setSuccess('');
    setError('');
    try {
      await changePassword(passwordData.newPassword);
      setSuccess('Senha alterada com sucesso!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Erro ao alterar senha. Talvez você precise fazer login novamente antes dessa ação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Meu Perfil</h2>
        <p className="text-slate-500 text-sm mt-1">Gerencie seus dados pessoais e segurança.</p>
      </header>

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-bold text-xs">!</div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dados Pessoais */}
        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Dados Pessoais</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Nome Completo</label>
              <input 
                required
                type="text"
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Seu nome completo"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">E-mail</label>
              <input 
                type="email"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Telefone / Celular</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                placeholder="(00) 00000-0000"
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Endereço</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                placeholder="Rua, Número, Bairro, Cidade - Estado"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Salvar Alterações</span>
            </button>
          </form>
        </section>

        {/* Segurança */}
        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Segurança</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Nova Senha</label>
              <input 
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block ml-1">Confirmar Nova Senha</label>
              <input 
                type="password"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-base transition-all"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
              <span>Atualizar Senha</span>
            </button>
          </form>

          {/* Biometrics Section */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900">Acesso Biométrico</h4>
            </div>
            
            {biometricSupported ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Ative o login por biometria (Digital ou FaceID) para entrar no app sem precisar digitar sua senha neste dispositivo.
                </p>
                
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block ml-1 mb-1">Confirmar Sua Senha Atual</label>
                  <input 
                    type="password"
                    placeholder="Sua senha de login atual"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 outline-none text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition-all"
                    value={biometricPassword}
                    onChange={e => setBiometricPassword(e.target.value)}
                  />
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal ml-1 mt-1">
                    Preencha sua senha atual para que possamos criptografá-la de forma segura e local neste dispositivo.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={handleRegisterBiometrics}
                  disabled={loading || !biometricPassword}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                  <span>Configurar Impressão Digital</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-medium italic">
                  O acesso biométrico não está disponível ou não é suportado por este navegador/dispositivo.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <BiometricPrompt 
        isOpen={showBiometricPrompt}
        onClose={() => setShowBiometricPrompt(false)}
        onSuccess={handleBiometricSuccess}
        title="Registrar Biometria"
        subtitle="Toque ou posicione o dedo no leitor de impressão digital para vincular suas credenciais"
      />
    </div>
  );
}
