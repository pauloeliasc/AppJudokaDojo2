import React, { useMemo } from 'react';
import { findKodokanVideo, KODOKAN_PLAYLIST_URL } from '../../data/kodokanVideos';
import { GokyoTechnique } from '../../data/gokyoData';
import { X, Play, ExternalLink, Sparkles, BookOpen, Layers, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KodokanVideoModalProps {
  techniqueName: string;
  techniqueDetails?: GokyoTechnique | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KodokanVideoModal({
  techniqueName,
  techniqueDetails,
  isOpen,
  onClose
}: KodokanVideoModalProps) {
  const videoData = useMemo(() => {
    if (!techniqueName) return null;
    return findKodokanVideo(techniqueName);
  }, [techniqueName]);

  if (!isOpen || !techniqueName) return null;

  const entry = videoData?.entry;
  const embedUrl = videoData?.embedUrl || `https://www.youtube.com/embed/_GxcFx8LZRk?list=PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ&autoplay=1`;
  const youtubeUrl = videoData?.youtubeUrl || KODOKAN_PLAYLIST_URL;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-red-400">
                  Kodokan × IJF Academy
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  100 Técnicas Oficiais
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight truncate">
                {entry?.fullTitle || techniqueName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title="Abrir playlist no YouTube"
            >
              <span>Abrir no YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="relative w-full bg-black aspect-video shrink-0 border-b border-slate-800">
          <iframe
            src={embedUrl}
            title={entry?.fullTitle || techniqueName}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        {/* Technical Explanations & Study Notes */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-900 text-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-white">
                  {techniqueDetails?.name || entry?.romaji || techniqueName}
                </h4>
                {(techniqueDetails?.japanese || entry?.kanji) && (
                  <span className="text-sm font-medium text-slate-400">
                    {techniqueDetails?.japanese || entry?.kanji}
                  </span>
                )}
              </div>
              {techniqueDetails?.meaning && (
                <p className="text-xs text-indigo-300 font-medium mt-0.5">
                  Significado: {techniqueDetails.meaning}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {techniqueDetails?.category || entry?.category || 'Judô Kodokan'}
              </span>
              {techniqueDetails?.introducedAtBelt && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Faixa {techniqueDetails.introducedAtBelt}
                </span>
              )}
            </div>
          </div>

          {/* Kuzushi / Tsukuri / Kake if available */}
          {techniqueDetails ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                  1. Kuzushi (Desequilíbrio)
                </span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {techniqueDetails.kuzushi}
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                  2. Tsukuri (Preparação)
                </span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {techniqueDetails.tsukuri}
                </p>
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-2xl">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                  3. Kake (Projeção)
                </span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {techniqueDetails.kake}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-xs text-slate-300">
              Assista à demonstração oficial dos mestres do Kodokan acima observando a pegada (*Kumi-kata*), o desequilíbrio (*Kuzushi*) e a finalização com segurança no tatame.
            </div>
          )}

          {techniqueDetails?.senseiTips && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Dica de Tatame do Sensei:
                </span>
                <p className="text-xs font-semibold leading-relaxed">
                  {techniqueDetails.senseiTips}
                </p>
              </div>
            </div>
          )}

          {/* Bottom helper */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Vídeo oficial da playlist do Kodokan & Federação Internacional de Judô (IJF).
            </span>

            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 underline"
            >
              <span>Ver no YouTube com playlist</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
