import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface BiometricPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export default function BiometricPrompt({
  isOpen,
  onClose,
  onSuccess,
  title = 'Acesso Biométrico',
  subtitle = 'Toque no sensor de impressão digital do seu dispositivo para continuar'
}: BiometricPromptProps) {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setScanState('idle');
      setProgress(0);
      return;
    }

    // Automatically transition to scanning upon open
    const timeout = setTimeout(() => {
      setScanState('scanning');
    }, 400);

    return () => clearTimeout(timeout);
  }, [isOpen]);

  // Simulate progress
  useEffect(() => {
    if (scanState !== 'scanning') return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanState('success');
          // Trigger success callback after showing completion
          setTimeout(() => {
            onSuccess();
          }, 1000);
          return 100;
        }
        return prev + 8; // Adjust scanning speed
      });
    }, 120);

    return () => clearInterval(interval);
  }, [scanState, onSuccess]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white w-full max-w-sm rounded-[2rem] border border-slate-100 shadow-2xl p-8 flex flex-col items-center text-center overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon frame and animations */}
          <div className="relative w-28 h-28 my-6 flex items-center justify-center">
            {/* Background ripple layers */}
            {scanState === 'scanning' && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-indigo-500/20"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.7, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-indigo-500/10"
                />
              </>
            )}

            {/* Glowing circle container */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                scanState === 'success'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                  : scanState === 'scanning'
                  ? 'bg-indigo-50/50 border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {scanState === 'success' ? (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle className="w-12 h-12" />
                </motion.div>
              ) : (
                <Fingerprint className="w-12 h-12 transition-transform duration-300" />
              )}
            </div>

            {/* Scanning line laser */}
            {scanState === 'scanning' && (
              <motion.div
                initial={{ top: '20%' }}
                animate={{ top: '80%' }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'reverse',
                  duration: 1.2,
                  ease: 'easeInOut',
                }}
                className="absolute left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_8px_rgba(99,102,241,0.8)] z-20"
              />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed px-2">
            {scanState === 'success'
              ? 'Leitura biométrica realizada com sucesso!'
              : scanState === 'scanning'
              ? 'Verificando padrão biométrico... Segure firme'
              : subtitle}
          </p>

          {/* Micro scan progress bar */}
          {scanState === 'scanning' && (
            <div className="w-40 bg-slate-100 h-1 rounded-full mt-6 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Spacer */}
          <div className="h-4" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
