import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export function ThemeToggle({ className = '', showLabel = false, size = 'md' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200 border active:scale-95 cursor-pointer select-none ${
        isDark
          ? 'bg-[#182338] hover:bg-[#223250] text-amber-300 border-slate-700/80 hover:border-amber-400/50 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 hover:border-indigo-300 shadow-sm shadow-slate-200/50'
      } ${size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-2 text-xs sm:text-sm'} ${className}`}
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
