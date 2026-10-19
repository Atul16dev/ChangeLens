import React from 'react';
import { Activity } from 'lucide-react';

export function BrandLogo({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition-transform group-hover:scale-105 duration-200 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <Activity className={`${iconSizes[size] || iconSizes.md} text-white stroke-[2.2]`} />
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-black/20 via-transparent to-white/20 pointer-events-none" />
    </div>
  );
}
