import React, { useState } from 'react';
import { Profile } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2, Maximize2, ShieldCheck, Sparkles, Printer, User, Award, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StudentDigitalCardModalProps {
  profile: Profile;
  onClose: () => void;
}

export default function StudentDigitalCardModal({ profile, onClose }: StudentDigitalCardModalProps) {
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const matricula = profile.matriculaNumber || profile.callNumber || `JD-${profile.id.slice(0, 6).toUpperCase()}`;

  // QR Code payload format: standardized for instant Tatame Scanner detection
  const qrPayload = JSON.stringify({
    app: 'judokadojo',
    type: 'checkin',
    id: profile.id,
    name: profile.fullName,
    grade: profile.currentGrade || 'Branca'
  });

  const getBeltStyle = (belt: string = '') => {
    const b = belt.toLowerCase();
    if (b.includes('cinza')) return { bg: 'bg-slate-400', text: 'text-slate-900', border: 'border-slate-300', hex: '#94a3b8' };
    if (b.includes('azul')) return { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400', hex: '#2563eb' };
    if (b.includes('amarela')) return { bg: 'bg-amber-400', text: 'text-slate-950', border: 'border-amber-300', hex: '#f59e0b' };
    if (b.includes('laranja')) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-400', hex: '#f97316' };
    if (b.includes('verde')) return { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-400', hex: '#059669' };
    if (b.includes('roxa')) return { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400', hex: '#9333ea' };
    if (b.includes('marrom')) return { bg: 'bg-amber-900', text: 'text-white', border: 'border-amber-700', hex: '#78350f' };
    if (b.includes('preta')) return { bg: 'bg-slate-950', text: 'text-white', border: 'border-slate-700', hex: '#020617' };
    return { bg: 'bg-white', text: 'text-slate-900', border: 'border-slate-300', hex: '#ffffff' };
  };

  const beltStyle = getBeltStyle(profile.currentGrade);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Carteirinha de Judoca - ${profile.fullName}`,
          text: `Carteirinha Digital do Judoka Dojô de ${profile.fullName} (Faixa ${profile.currentGrade || 'Branca'}).`,
        });
      } catch (err) {
        // user cancelled or unsupported
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative my-auto">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Carteirinha Digital de Judoca</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acesso ao Tatame & Presença</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Digital Card Body */}
        <div className="p-6">
          <div 
            id="judoka-digital-card"
            className="w-full rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 shadow-xl border border-slate-700/50 relative overflow-hidden flex flex-col justify-between min-h-[460px]"
          >
            {/* Japanese aesthetic watermarks */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 p-4 opacity-5 text-8xl font-black select-none pointer-events-none">
              柔道
            </div>

            {/* Card Header */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md">
                  <img src="./logo.png" alt="Judoka Dojô" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="font-black text-sm tracking-tight text-white leading-none">JUDOKA DOJÔ</h4>
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Cartão Oficial do Atleta</span>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ativo
              </span>
            </div>

            {/* Student Photo & Belt Banner */}
            <div className="my-5 flex flex-col items-center text-center z-10">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-2xl bg-white/10 border-2 border-white/20 p-1 overflow-hidden shadow-lg flex items-center justify-center">
                  {profile.photoUrl ? (
                    <img 
                      src={profile.photoUrl} 
                      alt={profile.fullName} 
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-900/60 rounded-xl flex items-center justify-center text-2xl font-black text-indigo-200">
                      {profile.fullName?.charAt(0) || 'J'}
                    </div>
                  )}
                </div>
                {/* Belt Badge floating */}
                <div className={cn(
                  "absolute -bottom-2 -right-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md border flex items-center gap-1",
                  beltStyle.bg, beltStyle.text, beltStyle.border
                )}>
                  🥋 {profile.currentGrade || 'Branca'}
                </div>
              </div>

              <h2 className="text-xl font-black text-white tracking-tight">{profile.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  Matrícula: {matricula}
                </span>
                {profile.bloodType && (
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" /> {profile.bloodType}
                  </span>
                )}
              </div>
            </div>

            {/* High Definition QR Code for quick camera scan */}
            <div className="z-10 bg-white p-3 rounded-2xl flex items-center gap-4 text-slate-900 shadow-md">
              <div className="p-1 bg-white rounded-xl shrink-0">
                <QRCodeSVG 
                  value={qrPayload}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Aproxime da Câmera</span>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  Aponte este código para o celular do Sensei ou Ajudante na entrada do dojô.
                </p>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Check-in Instantâneo em 1 seg</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-medium z-10">
              <span>Judoka Dojô Osasco</span>
              <span>Budo Pass Oficial</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 pt-1 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFullscreenMode(true)}
              className="py-3 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Tela Cheia</span>
            </button>
            <button
              onClick={handlePrint}
              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar</span>
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? 'Link Copiado!' : 'Compartilhar Carteirinha'}</span>
          </button>
        </div>
      </div>

      {/* Fullscreen High Brightness QR Mode for Instant Scanning */}
      {fullscreenMode && (
        <div 
          onClick={() => setFullscreenMode(false)}
          className="fixed inset-0 z-60 bg-white flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
        >
          <div className="max-w-xs space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg p-1">
                <img src="./logo.png" alt="Judoka" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-base text-slate-900">Judoka Dojô</span>
            </div>

            <h2 className="text-xl font-black text-slate-900">{profile.fullName}</h2>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              Faixa {profile.currentGrade || 'Branca'} • {matricula}
            </div>

            {/* Jumbo QR */}
            <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-slate-900 inline-block">
              <QRCodeSVG 
                value={qrPayload}
                size={240}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-xs font-extrabold text-indigo-600 animate-pulse uppercase tracking-wider">
              Aproxime do scanner da academia
            </p>
            <p className="text-[11px] text-slate-400">Toque em qualquer lugar para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
