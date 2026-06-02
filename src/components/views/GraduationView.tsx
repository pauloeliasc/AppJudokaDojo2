import React from 'react';
import { GRADUATION_DATA } from '../../data/graduation';
import { GraduationCap, BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function GraduationView() {
  const getBeltColor = (belt: string) => {
    const b = belt.toLowerCase();
    if (b.includes('branca')) return 'bg-white text-slate-900 border-slate-200';
    if (b.includes('cinza')) return 'bg-slate-400 text-white border-slate-500';
    if (b.includes('azul')) return 'bg-blue-600 text-white border-blue-700';
    if (b.includes('amarela')) return 'bg-yellow-400 text-slate-900 border-yellow-500';
    if (b.includes('laranja')) return 'bg-orange-500 text-white border-orange-600';
    if (b.includes('verde')) return 'bg-green-600 text-white border-green-700';
    if (b.includes('roxa')) return 'bg-purple-600 text-white border-purple-700';
    if (b.includes('marrom')) return 'bg-amber-900 text-white border-amber-950';
    if (b.includes('preta')) return 'bg-slate-900 text-white border-black';
    return 'bg-indigo-500 text-white';
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 overflow-hidden shrink-0">
            <img 
              src="/logo.png" 
              alt="Judoka Dojô" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Guia de Graduação</h2>
            <p className="text-slate-500 text-sm mt-1">Conteúdo técnico para exames de faixa da Judoka Dojô.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {GRADUATION_DATA.map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center font-bold border-2 shadow-inner transition-transform group-hover:scale-110",
                  getBeltColor(item.belt)
                )}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight leading-none">Faixa {item.belt}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.kyu}</p>
                </div>
              </div>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {item.minTime}</div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> {item.minAge}</div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {item.kihon && (
                <Section title="Kihon (Fundamentos)" icon={BookOpen}>
                  <ul className="space-y-1">
                    {item.kihon.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium">• {k}</li>)}
                  </ul>
                </Section>
              )}
              
              {item.ukemi && (
                <Section title="Ukemi (Amortecimento)" icon={ShieldCheck}>
                   <ul className="space-y-1">
                    {item.ukemi.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium">• {k}</li>)}
                  </ul>
                </Section>
              )}

              {item.nageWaza && (
                <Section title="Nage-waza (Projeção)" icon={GraduationCap}>
                   <ul className="space-y-1">
                    {item.nageWaza.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium font-mono text-[13px]">{k}</li>)}
                  </ul>
                </Section>
              )}

              {item.osaeKomiWaza && (
                <Section title="Osae-komi-waza (Imobilização)" icon={GraduationCap}>
                   <ul className="space-y-1">
                    {item.osaeKomiWaza.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium font-mono text-[13px]">{k}</li>)}
                  </ul>
                </Section>
              )}

              {item.shimeWaza && (
                <Section title="Shime-waza (Estrangulamento)" icon={ShieldCheck}>
                   <ul className="space-y-1">
                    {item.shimeWaza.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium font-mono text-[13px]">{k}</li>)}
                  </ul>
                </Section>
              )}

              {item.others && (
                <Section title="Conteúdo Extra" icon={BookOpen}>
                   <ul className="space-y-1">
                    {item.others.map((k, i) => <li key={i} className="text-sm text-slate-600 font-medium">• {k}</li>)}
                  </ul>
                </Section>
              )}
            </div>
            
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 italic text-[11px] text-slate-400">
               * Acumule o conteúdo das faixas anteriores para o exame.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Icon className="w-4 h-4 text-indigo-500" />
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h4>
      </div>
      {children}
    </div>
  );
}
