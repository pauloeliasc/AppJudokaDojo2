import React, { useState, useEffect } from 'react';
import { Settings } from '../../types';
import { Save, Wallet, Calendar } from 'lucide-react';
import { settingsApi } from '../../services/firestoreService';

export default function SettingsPanel({ settings }: { settings: Settings | null }) {
  const [formData, setFormData] = useState<Settings>({
    pixKey: '',
    monthlyValue: 0,
    defaultDueDate: 'Todo dia 10'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await settingsApi.update(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black uppercase tracking-tight">Configurações Gerais</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-[#0a0a0a]/5 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40">
              <Wallet className="w-4 h-4" /> Pagamentos
            </label>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 block ml-1">Chave PIX Recebedora</label>
                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Apenas Admin</span>
              </div>
              <input 
                required className="w-full bg-[#f5f5f4] border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#0a0a0a] outline-none text-base"
                value={formData.pixKey}
                onChange={e => setFormData({...formData, pixKey: e.target.value})}
                placeholder="CPF, E-mail ou Chave Aleatória"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">Valor da Mensalidade (R$)</label>
              <input 
                type="number" required className="w-full bg-[#f5f5f4] border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#0a0a0a] outline-none text-base"
                value={formData.monthlyValue}
                onChange={e => setFormData({...formData, monthlyValue: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40">
              <Calendar className="w-4 h-4" /> Academia
            </label>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">Dia de Vencimento Padrão</label>
              <input 
                required className="w-full bg-[#f5f5f4] border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#0a0a0a] outline-none text-base"
                value={formData.defaultDueDate}
                onChange={e => setFormData({...formData, defaultDueDate: e.target.value})}
                placeholder="Ex: Todo dia 10"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#0a0a0a]/5 flex items-center justify-between">
          {success ? (
            <p className="text-green-600 font-bold text-sm">Configurações salvas com sucesso!</p>
          ) : <div></div>}
          <button 
            disabled={loading}
            className="bg-[#0a0a0a] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:shadow-xl transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
