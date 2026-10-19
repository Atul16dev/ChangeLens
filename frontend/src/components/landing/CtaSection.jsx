import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ArrowRight, LayoutDashboard, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

export function CtaSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-slate-950">
      {/* Background glow banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <ScrollReveal animation="scale-up" duration={850}>
          <div className="relative rounded-3xl bg-gradient-to-tr from-cyan-950/60 via-slate-900/90 to-indigo-950/60 border border-cyan-500/30 p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl shadow-cyan-950/30 text-center space-y-6 group">
            {/* Ambient Radial Light with continuous breathing */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-cyan-500/15 blur-[140px] rounded-full pointer-events-none animate-pulse-glow" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Ship Without Fear
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
              Understand the Impact.{' '}
              <span className="text-shimmer inline-block">
                Ship With Confidence.
              </span>
            </h2>

            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Explore your code dependencies and make informed decisions before every merge.
            </p>

            {/* Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/app"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/25 active:scale-95 transition-all group/btn"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Open ChangeLens Workspace</span>
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base px-8 py-4 rounded-xl shadow-xl shadow-cyan-500/25 active:scale-95 transition-all group/btn"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              )}

              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base px-7 py-4 rounded-xl border border-slate-800 transition-colors shadow-sm"
              >
                <span>Sign In to Existing Account</span>
              </Link>
            </div>

            {/* Assurance badges */}
            <div className="pt-6 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Free & Open Architecture
              </span>
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" /> Offline WASM Parser
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> Cloud History with MongoDB
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
