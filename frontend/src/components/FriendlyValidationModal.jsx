import React, { useEffect } from 'react';
import {
  Sparkles,
  X,
  AlertCircle,
  Folder,
  GitPullRequest,
  Terminal,
  KeyRound,
} from 'lucide-react';

/**
 * FriendlyValidationModal
 * Compact, clean English pop-up that gently tells users what input is missing or invalid.
 */
export function FriendlyValidationModal({
  isOpen,
  onClose,
  title = 'Missing Input',
  message = 'Please fill in the required field before continuing.',
  example = '',
  secondaryActionLabel = '',
  onSecondaryAction = null,
  primaryActionLabel = 'Got it',
  onPrimaryAction = null,
  iconType = 'alert', // 'sparkles' | 'folder' | 'pr' | 'terminal' | 'token' | 'alert'
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconConfig = {
    folder: {
      icon: <Folder className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      bg: 'bg-cyan-100/80 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/30',
      bar: 'from-cyan-400 to-blue-500',
    },
    pr: {
      icon: <GitPullRequest className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-100/80 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30',
      bar: 'from-indigo-400 to-purple-500',
    },
    terminal: {
      icon: <Terminal className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-100/80 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
      bar: 'from-amber-400 to-orange-500',
    },
    token: {
      icon: <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-100/80 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
      bar: 'from-amber-400 to-rose-500',
    },
    sparkles: {
      icon: <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      bg: 'bg-cyan-100/80 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/30',
      bar: 'from-cyan-400 to-indigo-500',
    },
    alert: {
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      bg: 'bg-rose-100/80 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30',
      bar: 'from-rose-400 to-amber-500',
    },
  };

  const style = iconConfig[iconType] || iconConfig.alert;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-[#0f1626] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/30 overflow-hidden animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top accent line */}
        <div className={`h-1 w-full bg-gradient-to-r ${style.bar}`} />

        <div className="p-5">
          {/* Header: Icon + Title + Close */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${style.bg}`}
              >
                {style.icon}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Concise message */}
          <p className="mt-3 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>

          {/* Optional compact example */}
          {example && (
            <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
              <span className="font-sans text-slate-500 dark:text-slate-500 mr-1.5">Example:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-semibold select-all">{example}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex items-center justify-end gap-2">
            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {secondaryActionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onPrimaryAction) {
                  onPrimaryAction();
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
