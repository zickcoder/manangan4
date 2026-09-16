import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, Sparkles, X } from 'lucide-react';

interface StatusAnimationModalProps {
  isOpen: boolean;
  type: 'loading' | 'success' | 'paid' | 'rejected';
  title: string;
  message: string;
  onClose?: () => void;
  autoCloseMs?: number;
}

export function StatusAnimationModal({
  isOpen,
  type,
  title,
  message,
  onClose,
  autoCloseMs = 1100,
}: StatusAnimationModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Safety timeout: if stuck in 'loading', force auto-dismiss after 2.5 seconds
    if (type === 'loading') {
      const safetyTimer = setTimeout(() => {
        onCloseRef.current?.();
      }, 2500);
      return () => clearTimeout(safetyTimer);
    }

    // Auto-dismiss automatically for success / paid / rejected (default 1100ms)
    if (autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onCloseRef.current?.();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type, autoCloseMs]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in cursor-pointer"
      onClick={() => {
        onCloseRef.current?.();
      }}
    >
      <div 
        className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-scale-up cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Optional Manual Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            onCloseRef.current?.();
          }}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Icon Housing */}
        <div className="flex justify-center">
          {type === 'loading' && (
            <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center text-blue-600 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {(type === 'success' || type === 'paid') && (
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center text-emerald-600 animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-spin" />
            </div>
          )}

          {type === 'rejected' && (
            <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-300 flex items-center justify-center text-red-600 animate-pulse">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
          )}
        </div>

        {/* Title & Message */}
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900 font-display">
            {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Visual Countdown Progress Line */}
        {type !== 'loading' && autoCloseMs > 0 && (
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full ${type === 'rejected' ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{
                animation: `shrink ${autoCloseMs}ms linear forwards`
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
