import React, { useState } from 'react';
import { GRADUATION_DATA } from '../../data/graduation';
import { GOKYO_TECHNIQUES, GokyoTechnique } from '../../data/gokyoData';
import { KODOKAN_PLAYLIST_URL, findKodokanVideo } from '../../data/kodokanVideos';
import KodokanVideoModal from '../modules/KodokanVideoModal';
import { GraduationCap, BookOpen, Clock, ShieldCheck, Play, ExternalLink, Search, Sparkles, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function GraduationView() {
  const [selectedTechniqueForVideo, setSelectedTechniqueForVideo] = useState<{
    name: string;
    details?: GokyoTechnique | null;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const getBeltColor = (belt: string) => {
    const b = belt.toLowerCase();
    if (b.includes('branca')) return 'bg-white text-slate-900 border-slate-200';
    if (b.includes('cinza')) return 'bg-slate-400 text-white border-slate-500';
    if (b.includes('azul')) return 'bg-blue-600 text-white border-blue-700';
    if (b.includes('amarela')) return 'bg-amber-400 text-slate-950 border-amber-500';
    if (b.includes('laranja')) return 'bg-orange-500 text-white border-orange-600';
    if (b.includes('verde')) return 'bg-emerald-600 text-white border-emerald-700';
    if (b.includes('roxa')) return 'bg-purple-600 text-white border-purple-700';
    if (b.includes('marrom')) return 'bg-amber-900 text-white border-amber-950';
    if (b.includes('preta')) return 'bg-slate-950 text-white border-black';
    return 'bg-indigo-500 text-white';
  };

  const handleOpenVideo = (techniqueName: string) => {
    // Find matching GokyoTechnique if available
    const cleanName = techniqueName.toLowerCase().trim();
    const details = GOKYO_TECHNIQUES.find(t => 
      t.name.toLowerCase().includes(cleanName) || 
      cleanName.includes(t.name.toLowerCase()) ||
      t.id.toLowerCase() === cleanName.replace(/[^a-z0-9]/g, '-')
    ) || null;

    setSelectedTechniqueForVideo({
      name: techniqueName,
      details
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xs border border-slate-200 overflow-hidden shrink-0">
            <img 
              src="./logo.png" 
              alt="Judoka Dojô" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Guia de Graduação & Exames
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <Video className="w-3 h-3 text-red-600" /> Vídeos Kodokan
              </span>
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Conteúdo técnico oficial para exames de faixa com vídeo-aulas da Kodokan & IJF Academy.
            </p>
          </div>
        </div>
      </header>

      {/* Official YouTube Playlist Study Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl font-black select-none pointer-events-none">
          昇段
        </div>

        <div className="space-y-2.5 z-10 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs flex items-center gap-1">
              <Play className="w-3 h-3 fill-white" /> Playlist Oficial de Estudo
            </span>
            <span className="text-xs text-indigo-300 font-bold">
              Kodokan × IJF Academy (100 Técnicas)
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Estude as técnicas do seu exame com os mestres do Kodokan
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Clique no botão <strong>▶ Vídeo</strong> ao lado de qualquer golpe para assistir à execução oficial, ver desequilíbrio (*Kuzushi*), entrada (*Tsukuri*) e arremesso (*Kake*).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 z-10 shrink-0 w-full md:w-auto">
          <a
            href={KODOKAN_PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-2xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Abrir Playlist no YouTube</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
          </a>
        </div>
      </div>

      {/* Belt Requirements List */}
      <div className="grid grid-cols-1 gap-8">
        {GRADUATION_DATA.map((item, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            {/* Belt Card Header */}
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold border-2 shadow-inner transition-transform group-hover:scale-110 shrink-0",
                  getBeltColor(item.belt)
                )}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight leading-none text-white">
                    Faixa {item.belt}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {item.kyu}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" /> Carência: {item.minTime}
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Idade Mín: {item.minAge}
                </div>
              </div>
            </div>

            {/* Techniques Sections */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {item.kihon && (
                <Section title="Kihon (Fundamentos)" icon={BookOpen}>
                  <ul className="space-y-1.5">
                    {item.kihon.map((k, i) => (
                      <li key={i} className="text-xs text-slate-700 font-medium">
                        • {k}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              
              {item.ukemi && (
                <Section title="Ukemi (Amortecimento)" icon={ShieldCheck}>
                   <ul className="space-y-1.5">
                    {item.ukemi.map((k, i) => (
                      <li key={i} className="text-xs text-slate-700 font-medium">
                        • {k}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {item.nageWaza && (
                <Section title="Nage-waza (Projeção)" icon={GraduationCap} highlight>
                  <ul className="space-y-1.5">
                    {item.nageWaza.map((techName, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {techName}
                        </span>
                        <button
                          onClick={() => handleOpenVideo(techName)}
                          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={`Assistir vídeo oficial de ${techName}`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Vídeo</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {item.osaeKomiWaza && (
                <Section title="Osae-komi-waza (Imobilização)" icon={GraduationCap} highlight>
                  <ul className="space-y-1.5">
                    {item.osaeKomiWaza.map((techName, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {techName}
                        </span>
                        <button
                          onClick={() => handleOpenVideo(techName)}
                          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={`Assistir vídeo oficial de ${techName}`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Vídeo</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {item.shimeWaza && (
                <Section title="Shime-waza (Estrangulamento)" icon={ShieldCheck} highlight>
                  <ul className="space-y-1.5">
                    {item.shimeWaza.map((techName, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {techName}
                        </span>
                        <button
                          onClick={() => handleOpenVideo(techName)}
                          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title={`Assistir vídeo oficial de ${techName}`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Vídeo</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {item.others && (
                <Section title="Conteúdo Extra & Renraku / Kaeshi" icon={BookOpen}>
                   <ul className="space-y-1.5">
                    {item.others.map((k, i) => (
                      <li key={i} className="text-xs text-slate-600 font-medium">
                        • {k}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
            
            <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>* Lembrando: Para o exame de faixa, o aluno deve acumular e dominar todas as técnicas das faixas anteriores.</span>
              <span className="hidden sm:inline text-indigo-600 font-bold">100 Técnicas Kodokan IJF</span>
            </div>
          </div>
        ))}
      </div>

      {/* Video Demonstration Modal */}
      {selectedTechniqueForVideo && (
        <KodokanVideoModal
          techniqueName={selectedTechniqueForVideo.name}
          techniqueDetails={selectedTechniqueForVideo.details}
          isOpen={true}
          onClose={() => setSelectedTechniqueForVideo(null)}
        />
      )}
    </div>
  );
}

function Section({ 
  title, 
  icon: Icon, 
  highlight = false,
  children 
}: { 
  title: string; 
  icon: any; 
  highlight?: boolean;
  children: React.ReactNode; 
}) {
  return (
    <div className={cn(
      "space-y-3 p-4 rounded-2xl transition-all",
      highlight ? "bg-slate-50/60 border border-slate-200/70" : ""
    )}>
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
        <Icon className={cn("w-4 h-4", highlight ? "text-indigo-600" : "text-slate-400")} />
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">{title}</h4>
      </div>
      {children}
    </div>
  );
}
