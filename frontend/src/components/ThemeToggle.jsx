import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export function ThemeToggle({
  className = '',
  showLabel = false,
  size = 'md',
  variant = 'default',
}) {
  const { theme, toggleTheme, isDark } = useTheme();

  const isDock = variant === 'dock';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-200 active:scale-95 cursor-pointer select-none ${
        isDock
          ? isDark
            ? 'p-2 text-amber-300 hover:text-amber-200 hover:bg-slate-800/90'
            : 'p-2 text-indigo-600 hover:text-indigo-700 hover:bg-white shadow-xs'
          : isDark
          ? 'bg-[#182338] hover:bg-[#223250] text-amber-300 border border-slate-700/80 hover:border-amber-400/50 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 hover:border-indigo-300 shadow-sm shadow-slate-200/50'
      } ${
        isDock
          ? 'w-8 h-8 min-h-[32px]'
          : size === 'sm'
          ? 'px-2.5 py-1.5 text-xs min-h-[32px]'
          : 'px-3 py-2 text-xs sm:text-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode (Standard)' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </div>
      {showLabel && (
        <span className="font-semibold text-xs tracking-tight">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
