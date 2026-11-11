import React, { useId } from 'react';

const SIZE_CLASSES = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
  xl: 'w-16 h-16 rounded-2xl',
};

const ICON_SIZES = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-12 h-12',
};

/**
 * Static ChangeLens brand emblem combining:
 * - Optical "C" Lens Aperture (Brand initial + code inspection lens)
 * - Split Diff-Prism Core (Original vs. changed AST node refraction)
 * - Blast Radius Wave + Focal Impact Node (Pre-merge impact propagation)
 */
export function BrandLogo({ size = 'md', className = '' }) {
  const uid = useId().replace(/:/g, '');
  const ringGradId = `cl-ring-${uid}`;
  const prismGradId = `cl-prism-${uid}`;
  const impactGradId = `cl-impact-${uid}`;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 dark:from-[#0b1328] dark:via-[#111c3a] dark:to-[#1e1b4b] border border-sky-400/50 dark:border-cyan-400/35 shadow-md shadow-blue-900/15 dark:shadow-cyan-500/20 ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`relative z-10 ${ICON_SIZES[size] || ICON_SIZES.md}`}
      >
        <defs>
          <linearGradient id={ringGradId} x1="10" y1="12" x2="46" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>
          <linearGradient id={prismGradId} x1="27" y1="21" x2="35" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <radialGradient id={impactGradId} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="55%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E11D48" />
          </radialGradient>
        </defs>

        {/* Optical "C" Lens Aperture */}
        <path
          d="M 46.2 18.3 A 20.5 20.5 0 1 0 46.2 45.7"
          stroke={`url(#${ringGradId})`}
          strokeWidth="6.2"
          strokeLinecap="round"
        />

        {/* Central Split AST Diff-Prism (Before White / Changed Cyan) */}
        <polygon points="27,21.5 27,42.5 19,32" fill="#FFFFFF" />
        <polygon points="27,21.5 35,32 27,42.5" fill={`url(#${prismGradId})`} />

        {/* Directional Blast Radius Wave */}
        <path
          d="M 38.4 24.1 A 13.5 13.5 0 0 1 38.4 39.9"
          stroke="#67E8F9"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        {/* Focused Blast Impact Target Node */}
        <circle cx="51.5" cy="32" r="4.5" fill={`url(#${impactGradId})`} />
      </svg>

      {/* Subtle glass highlight overlay */}
      <div className="absolute inset-0 z-20 rounded-[inherit] bg-gradient-to-t from-black/15 via-transparent to-white/15 pointer-events-none" />
    </div>
  );
}
