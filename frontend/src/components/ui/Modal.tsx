import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hideHeaderOnPrint?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  hideHeaderOnPrint = false,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:p-0 print:static print:block print:overflow-visible">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-sm transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Content Dialog */}
      <div
        className={twMerge(
          clsx(
            "relative w-full bg-white rounded-3xl shadow-large border border-[#e2e8f0] p-6 z-10 animate-fade-in-up print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none",
            maxWidths[maxWidth]
          )
        )}
      >
        <div className={clsx(
          "flex items-start justify-between pb-4 border-b border-[#f1f5f9]",
          hideHeaderOnPrint && "print:hidden"
        )}>
          <div>
            <h3 className="text-xl font-bold text-[#0f172a] font-display">{title}</h3>
            {description && <p className="text-xs text-[#64748b] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-xl transition-colors print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-4 max-h-[75vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible print:pt-0 print:pr-0">
          {children}
        </div>
      </div>
    </div>
  );
}
