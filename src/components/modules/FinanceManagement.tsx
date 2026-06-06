import React, { useState } from 'react';
import { Profile, Payment, Settings } from '../../types';
import { Wallet, CheckCircle2, AlertCircle, Copy, QrCode } from 'lucide-react';
import { cn, getMonthName } from '../../lib/utils';
import { paymentsApi, profilesApi } from '../../services/firestoreService';

export default function FinanceManagement({ profiles, payments, settings }: { profiles: Profile[], payments: Payment[], settings: Settings | null }) {
  const [loading, setLoading] = useState(false);

  const students = profiles.filter(p => !p.role || p.role === 'student');

  const confirmPayment = async (studentId: string, month: number, year: number) => {
    setLoading(true);
    try {
      const existingPayment = payments.find(p => p.memberId === studentId && p.month === month && p.year === year);
      const paymentId = existingPayment?.id || `${studentId}_${year}_${month}`;
      await paymentsApi.updateStatus(paymentId, 'paid', new Date().toISOString(), studentId, month, year);

      // Add points for being on time
      const profile = profiles.find(p => p.id === studentId);
      if (profile) {
        await profilesApi.update(studentId, {
          points: (profile.points || 0) + 50 // 50 points for timely payment
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black uppercase tracking-tight">Controle Financeiro</h2>
        <div className="bg-white px-4 py-2 rounded-xl border border-[#0a0a0a]/5 font-bold text-sm">
          Ref: {getMonthName(currentMonth)} / {currentYear}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] border border-[#0a0a0a]/5 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f5f5f4]/50 border-b border-[#0a0a0a]/5">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Judoka</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Status ({getMonthName(currentMonth)})</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest opacity-40 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0a0a0a]/5">
                {students.map(student => {
                  const payment = payments.find(p => p.memberId === student.id && p.month === currentMonth && p.year === currentYear);
                  const isPaid = payment?.status === 'paid';

                  return (
                    <tr key={student.id} className="hover:bg-[#f5f5f4]/30 transition-colors">
                      <td className="px-6 py-4 font-bold">{student.fullName}</td>
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
                        {!isPaid && (
                          <button 
                            disabled={loading}
                            onClick={() => confirmPayment(student.id, currentMonth, currentYear)}
                            className="bg-[#0a0a0a] text-white text-xs font-bold px-4 py-2 rounded-lg hover:scale-105 transition-all shadow-md active:scale-95 disabled:opacity-50"
                          >
                            Confirmar PIX
                          </button>
                        )}
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
