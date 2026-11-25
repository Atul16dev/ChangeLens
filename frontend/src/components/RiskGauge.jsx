import React, { useState } from 'react';
import { useTheme } from '../context/theme-context.js';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sliders,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';

const TIER_CONFIG = {
  LOW: {
    label: 'LOW RISK',
    colorHex: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    barColor: 'from-emerald-500 to-teal-500',
    icon: CheckCircle2,
    needleColor: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  MEDIUM: {
    label: 'MEDIUM RISK',
    colorHex: '#f59e0b',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    barColor: 'from-amber-500 to-yellow-500',
    icon: AlertTriangle,
    needleColor: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  HIGH: {
    label: 'HIGH RISK',
    colorHex: '#f97316',
    badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    barColor: 'from-orange-500 to-amber-600',
    icon: ShieldAlert,
    needleColor: '#f97316',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  CRITICAL: {
    label: 'CRITICAL RISK',
    colorHex: '#f43f5e',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    barColor: 'from-rose-500 to-red-600',
    icon: AlertOctagon,
    needleColor: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.35)',
  },
};

/**
 * Visual Explainable 0-100 Risk Score Speedometer Gauge
 */
export function RiskGauge({
  score = 0,
  tier = 'LOW',
  label = null,
  factors = [],
  recommendation = '',
  showBreakdown = true,
}) {
  const { isDark } = useTheme();
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(true);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score || 0)));
  const config = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
  const TierIcon = config.icon;

  // Arc calculations for 180-degree semi-circle
  const radius = 72;
  const cx = 100;
  const cy = 90;
  const strokeWidth = 12;
  const arcLength = Math.PI * radius; // ~226.19
  const dashOffset = arcLength - (normalizedScore / 100) * arcLength;

  // Angle for the needle: 0 = -90deg (pointing left), 100 = 90deg (pointing right)
  const needleAngle = -90 + (normalizedScore / 100) * 180;

  return (
    <div className="w-full space-y-3.5">
      {/* Visual Speedometer Card */}
      <div className="relative bg-gradient-to-b from-white to-slate-50 dark:from-[#131d2e] dark:to-[#0c1322] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm overflow-hidden">
        {/* Header with Title and Formula Info Pill */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Explainable Risk Gauge
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
              Deterministic
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 cursor-pointer transition-colors"
            title="Inspect deterministic rule formulas"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Formula</span>
          </button>
        </div>

        {/* SVG Speedometer Gauge */}
        <div className="relative flex flex-col items-center justify-center -mt-1">
          <svg
            viewBox="0 -6 200 122"
            className="w-full max-w-[240px] overflow-visible drop-shadow-sm select-none"
          >
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Track (Theme-aware soft grey in Light Mode, slate-800 in Dark Mode) */}
            <path
              d="M 28 90 A 72 72 0 0 1 172 90"
              fill="none"
              stroke={isDark ? '#1e293b' : '#e2e8f0'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Colored Segment Reference Dots */}
            <circle cx="28" cy="90" r="3" fill="#10b981" />
            <circle cx="68" cy="30" r="3" fill="#f59e0b" />
            <circle cx="132" cy="30" r="3" fill="#f97316" />
            <circle cx="172" cy="90" r="3" fill="#f43f5e" />

            {/* Active Colored Progress Arc */}
            <path
              d="M 28 90 A 72 72 0 0 1 172 90"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
              filter="url(#gaugeGlow)"
            />

            {/* Dynamic Needle Pin */}
            <g
              transform={`translate(${cx}, ${cy}) rotate(${needleAngle})`}
              className="transition-transform duration-700 ease-out"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-58"
                stroke={config.needleColor}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <polygon
                points="-3.5,-45 3.5,-45 0,-62"
                fill={config.needleColor}
              />
              <circle cx="0" cy="0" r="7" fill={config.needleColor} />
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
            </g>

            {/* Min / Mid / Max Labels positioned cleanly outside the arc */}
            <text x="25" y="109" fill={isDark ? '#94a3b8' : '#475569'} className="text-[9px] font-bold" textAnchor="middle">
              0
            </text>
            <text x="100" y="6" fill={isDark ? '#94a3b8' : '#475569'} className="text-[9px] font-bold" textAnchor="middle">
              50
            </text>
            <text x="175" y="109" fill={isDark ? '#94a3b8' : '#475569'} className="text-[9px] font-bold" textAnchor="middle">
              100
            </text>
          </svg>

          {/* Center Digital Readout */}
          <div className="flex flex-col items-center -mt-6">
            <div className="flex items-baseline gap-1">
              <span
                className="text-4xl font-black tracking-tight"
                style={{ color: config.colorHex }}
              >
                {normalizedScore}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ 100</span>
            </div>

            <div
              className={`mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border shadow-sm ${config.badgeBg}`}
            >
              <TierIcon className="w-3.5 h-3.5" />
              <span>{label || config.label}</span>
            </div>
          </div>
        </div>

        {/* Actionable Reviewer Recommendation */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-700/80">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
            <span className="text-sm shrink-0">💡</span>
            <span>{recommendation || 'Low risk change with minimal downstream propagation.'}</span>
          </p>
        </div>
      </div>

      {/* Explainable Factor Breakdown (Why this score?) */}
      {showBreakdown && factors && factors.length > 0 && (
        <div className="bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-sm">
          <button
            type="button"
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
            className="w-full flex items-center justify-between text-left cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Deterministic Factor Breakdown ({factors.length})
              </h4>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>{isBreakdownExpanded ? 'Collapse' : 'Expand'}</span>
              {isBreakdownExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {isBreakdownExpanded && (
            <div className="mt-2.5 space-y-2">
              {factors.map((factor, index) => {
                const isPositiveDeduction = factor.points < 0;
                return (
                  <div
                    key={factor.id || index}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0a0f1d] border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {factor.name}
                        </span>
                        {factor.category && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {factor.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                        {factor.description}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg shrink-0 ${
                        isPositiveDeduction
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : factor.points >= 20
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {factor.points > 0 ? `+${factor.points}` : factor.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Formula & Rule Engine Details Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    0–100 Explainable Risk Scoring Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deterministic Math vs. Opaque LLM Guesswork
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <p>
                Rather than relying on non-deterministic LLM hallucinations that vary on each run,
                ChangeLens calculates a reproducible mathematical score between <strong>0 and 100</strong> based on verifiable AST metrics:
              </p>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-[#0a0f1d] rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold">
                  <span>+25 pts</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Auth / Security Module Touch</span>
                </div>
                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold">
                  <span>+20 pts</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Broken Export / Symbol Reference</span>
                </div>
                <div className="flex justify-between items-center text-orange-600 dark:text-orange-400 font-bold">
                  <span>+15 pts</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Blast Radius Depth &gt; 3 (Deep Propagation)</span>
                </div>
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
                  <span>+15 pts</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Database Schema / Model Touch</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>-10 pts</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Automated Test Coverage Safety Net</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-bold text-[10px]">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  LOW<br />0–30
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  MEDIUM<br />31–60
                </div>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20">
                  HIGH<br />61–80
                </div>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  CRITICAL<br />81–100
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
