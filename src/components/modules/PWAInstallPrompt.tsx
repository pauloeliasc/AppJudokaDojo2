import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, ArrowUpFromLine, Check, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showiOSModal, setShowiOSModal] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = window.navigator.userAgent;
    const appleDevice = /iPhone|iPad|iPod/.test(ua);
    setIsIOS(appleDevice);

    // Detect standalone display mode (if already installed)
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Listens for PWA prompt on Android/Chrome/Windows/macOS
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      const dismissed = localStorage.getItem('judoka_pwa_dismissed');
      if (!dismissed && !standaloneMode) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If on iOS and not installed and not dismissed, we show the prompt option too
    if (appleDevice && !standaloneMode) {
      setIsInstallable(true);
      const dismissed = localStorage.getItem('judoka_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowiOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback message for other devices where prompt was not captured
      alert('Para instalar este aplicativo:\nNo Chrome: Toque nos três pontinhos no canto superior direito e selecione "Instalar aplicativo" ou "Instalar Judoka Dojô".\nNo Safari ou Samsung: Toque em Compartilhar e selecione "Adicionar à Tela de Início".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('judoka_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  // If already installed or not loadable, do not show anything
  if (isStandalone) return null;
  if (!isInstallable && !isIOS) return null;
  if (!showPrompt) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 border border-slate-700/50 shadow-xl mb-8 relative overflow-hidden animate-fade-in">
        {/* Decorative elements */}
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
          title="Fechar e não mostrar novamente"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-700 shrink-0 flex items-center justify-center shadow-md overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Judoka Dojô" 
              className="w-14 h-14 object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-1 pr-6">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-indigo-500/30">
                PWA Instalável
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Instalação Rápida</span>
            </div>
            <h3 className="font-extrabold text-lg text-white">Instalar o Aplicativo Judoka Dojô?</h3>
            <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
              Adicione um atalho na tela inicial do seu celular, tablet ou computador para ter acesso instantâneo, visualização em tela cheia e carregamento veloz, igual a um aplicativo nativo da Play Store ou App Store!
            </p>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Adicionar Atalho
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showiOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 relative">
            <button 
              onClick={() => setShowiOSModal(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-1 border border-slate-700 shadow-md">
                <img 
                  src="/logo.png" 
                  alt="Judoka Dojô" 
                  className="w-14 h-14 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-black text-lg text-white">Como Instalar no iPhone / iPad</h4>
                <p className="text-xs text-slate-400 font-medium">Instalação rápida e direta pelo Safari</p>
              </div>
            </div>

            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pt-1.5">
                  Toque no ícone de <strong className="text-white flex inline-flex items-center gap-1">Compartilhar <Share className="w-3.5 h-3.5 text-indigo-400 shrink-0 inline" /></strong> (ícone com um quadrado e uma seta para cima) na barra inferior do Safari.
                </p>
              </div>

              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pt-1.5">
                  Role o menu de compartilhamento para baixo e toque em <strong className="text-white flex inline-flex items-center gap-1">Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 text-rose-400 shrink-0 inline" /></strong>.
                </p>
              </div>

              <div className="flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pt-1.5">
                  Toque em <strong className="text-white">Adicionar</strong> no canto superior direito para confirmar o atalho.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowiOSModal(false)}
              className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
