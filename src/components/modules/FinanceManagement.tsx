import React, { useState } from 'react';
import { Profile, Payment, Settings } from '../../types';
import { Wallet, CheckCircle2, AlertCircle, Copy, QrCode } from 'lucide-react';
import { cn, getMonthName } from '../../lib/utils';
import { paymentsApi, profilesApi } from '../../services/firestoreService';

export default function FinanceManagement({ profiles, payments, settings }: { profiles: Profile[], payments: Payment[], settings: Settings | null }) {
  const [loading, setLoading] = useState(false);

  const students = profiles.filter(p => !p.role || p.role === 'student');

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const handleTogglePaymentStatus = async (studentId: string, currentStatus: 'paid' | 'pending') => {
    setLoading(true);
    try {
      const existingPayment = payments.find(p => p.memberId === studentId && p.month === selectedMonth && p.year === selectedYear);
      const paymentId = existingPayment?.id || `${studentId}_${selectedYear}_${selectedMonth}`;
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      
      await paymentsApi.updateStatus(paymentId, newStatus, new Date().toISOString(), studentId, selectedMonth, selectedYear);

      // Give 50 points or adjust points
      const profile = profiles.find(p => p.id === studentId);
      if (profile) {
        const pointDiff = newStatus === 'paid' ? 50 : -50;
        await profilesApi.update(studentId, {
          points: Math.max(0, (profile.points || 0) + pointDiff)
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Controle Financeiro</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Gerencie a adimplência e confirme pagamentos via PIX ou dinheiro manualmente.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#0a0a0a]/5 shadow-sm">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none px-3 py-1.5 cursor-pointer"
          >
            {months.map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-100" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none px-3 py-1.5 cursor-pointer"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] border border-[#0a0a0a]/5 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f5f4]/50 border-b border-[#0a0a0a]/5">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Judoka</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Status ({getMonthName(selectedMonth)})</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0a0a0a]/5">
                {students.map(student => {
                  const payment = payments.find(p => p.memberId === student.id && p.month === selectedMonth && p.year === selectedYear);
                  const isPaid = payment?.status === 'paid';

                  return (
                    <tr key={student.id} className="hover:bg-[#f5f5f4]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{student.fullName}</div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{student.currentGrade || 'Sem Faixa'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          disabled={loading}
                          onClick={() => handleTogglePaymentStatus(student.id, isPaid ? 'paid' : 'pending')}
                          className={cn(
                            "text-xs font-semibold px-4 py-2 rounded-lg hover:scale-105 transition-all shadow-md active:scale-95 disabled:opacity-50",
                            isPaid 
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                              : "bg-[#0a0a0a] text-white hover:bg-slate-800"
                          )}
                        >
                          {isPaid ? 'Reverter para Pendente' : 'Confirmar PIX/Pagto'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a0a0a] text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <Wallet className="w-10 h-10 mb-4 opacity-50" />
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Valor Mensalidade</h4>
              <p className="text-4xl font-black mb-6">R$ {settings?.monthlyValue || '0,00'}</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Chave PIX Ativa</p>
                  <p className="text-xs font-mono break-all line-clamp-2">{settings?.pixKey || 'Não configurada'}</p>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(settings?.pixKey || '')}
                  className="w-full bg-white text-[#0a0a0a] py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copiar Chave
                </button>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-[#0a0a0a]/5 flex flex-col items-center">
             <QrCode className="w-24 h-24 mb-4 opacity-20" />
             <p className="text-center text-xs font-bold uppercase tracking-widest opacity-40">O QR Code é gerado dinamicamente no app do aluno</p>
          </div>
        </div>
      </div>
    </div>
  );
}
