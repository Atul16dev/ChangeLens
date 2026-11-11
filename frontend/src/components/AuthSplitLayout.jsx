import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { AuthCanvas3D } from './AuthCanvas3D.jsx';

/**
 * Shared responsive split-screen layout for authentication pages (Login & Sign Up).
 * Uses the entire left half of the viewport for the edge-to-edge 3D AST showcase
 * and centers the auth card with a centered ChangeLens emblem on the right half.
 */
export function AuthSplitLayout({ variant = 'login', title, subtitle, children }) {
  const isRegister = variant === 'register';

  return (
    <div
      className={`min-h-screen w-full font-sans relative overflow-x-hidden text-slate-900 dark:text-slate-100 grid grid-cols-1 lg:grid-cols-2 ${
        isRegister ? 'bg-slate-50 dark:bg-[#070b14]' : 'bg-slate-50 dark:bg-slate-950'
      }`}
    >
      {/* Top right theme toggle */}
      <div className="fixed top-4 right-4 z-30">
        <ThemeToggle size="sm" />
      </div>

      {/* Left Half (Desktop) / Below-Card Showcase (Mobile/Tablet): Full-Bleed Edge-to-Edge 3D AST Canvas */}
      <div className="order-2 lg:order-1 relative min-h-[380px] sm:min-h-[420px] lg:min-h-screen w-full overflow-hidden border-t lg:border-t-0 lg:border-r border-slate-200/80 dark:border-slate-800/80">
        <AuthCanvas3D variant={variant} />
      </div>

      {/* Right Half (Desktop) / First Fold (Mobile/Tablet): Auth Form Card */}
      <div className="order-1 lg:order-2 min-h-[auto] lg:min-h-screen flex items-center justify-center px-4 sm:px-8 lg:px-10 xl:px-14 pt-16 pb-10 lg:py-10 relative">
        {/* Subtle Right-Half Ambient Glow */}
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[340px] blur-[130px] rounded-full pointer-events-none ${
            isRegister ? 'bg-indigo-600/10' : 'bg-cyan-600/10'
          }`}
        />

        <div className={`w-full relative z-10 ${isRegister ? 'max-w-lg' : 'max-w-md'}`}>
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl dark:shadow-2xl shadow-slate-900/5 dark:shadow-black/40">
            {/* Top precision gradient accent strip */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600" />

            <div className={isRegister ? 'px-5 sm:px-7 py-5 sm:py-6' : 'p-5 sm:p-7'}>
              {/* Centered Premium Brand Header */}
              <div className="flex flex-col items-center text-center mb-5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <Link
                  to="/"
                  className="group inline-flex flex-col items-center gap-2 focus:outline-none"
                  title="Back to ChangeLens Home"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-2xl bg-cyan-500/15 dark:bg-cyan-400/15 blur-md opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <BrandLogo size="lg" />
                  </div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">
                    ChangeLens
                  </span>
                </Link>

                <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium max-w-sm">
                  {subtitle}
                </p>
              </div>

              {/* Form & Auth Actions */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
