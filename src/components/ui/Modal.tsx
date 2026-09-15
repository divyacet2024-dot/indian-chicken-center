'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if user clicked directly on the overlay backdrop itself, not inside children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] animate-in fade-in duration-150 overflow-y-auto"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Content Container Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85dvh] sm:max-h-[90dvh] flex flex-col z-10 animate-in slide-in-from-bottom-6 duration-200 pointer-events-auto my-0 sm:my-auto`}
      >
        {/* Mobile Drag Handle Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 rounded-t-3xl sm:rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:scale-90 transition-all touch-manipulation cursor-pointer flex items-center justify-center shrink-0 z-20"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
