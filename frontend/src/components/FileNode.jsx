import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, AlertOctagon, AlertTriangle, Flame, Folder } from 'lucide-react';

function getSeverityConfig(severity, isChanged) {
  if (isChanged) {
    return {
      bg: 'bg-gradient-to-br from-[#2f1f0a] via-[#1c2438] to-[#131b2e]',
      border: 'border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30',
      badgeBg: 'bg-amber-400/20 text-amber-200 border-amber-400/60 shadow-sm shadow-amber-500/20',
      dotColor: 'bg-amber-400 animate-pulse',
      accentBar: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      titleColor: 'text-amber-100',
      icon: <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      label: 'ROOT CHANGED',
    };
  }

  switch (severity) {
    case 'CRITICAL':
      return {
        bg: 'bg-gradient-to-br from-[#351019] via-[#1e2338] to-[#131b2e]',
        border: 'border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/30',
        badgeBg: 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-sm shadow-rose-500/20',
        dotColor: 'bg-rose-500 animate-ping',
        accentBar: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        titleColor: 'text-rose-100',
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        label: 'CRITICAL',
      };
    case 'HIGH':
      return {
        bg: 'bg-gradient-to-br from-[#301a0d] via-[#1d2338] to-[#131b2e]',
        border: 'border-orange-500 shadow-lg shadow-orange-950/40',
        badgeBg: 'bg-orange-500/25 text-orange-200 border-orange-400/60 shadow-sm shadow-orange-500/20',
        dotColor: 'bg-orange-400',
        accentBar: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
        titleColor: 'text-orange-100',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
        label: 'DIRECT (Lv 1)',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-gradient-to-br from-[#2a220a] via-[#1c2338] to-[#131b2e]',
        border: 'border-yellow-500/90 shadow-md shadow-yellow-950/30',
        badgeBg: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50',
        dotColor: 'bg-yellow-400',
        accentBar: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]',
        titleColor: 'text-yellow-100',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />,
        label: 'TRANSITIVE',
      };
    case 'LOW':
      return {
        bg: 'bg-gradient-to-br from-[#12233c] via-[#18233a] to-[#121929]',
        border: 'border-sky-500/70 shadow-md shadow-sky-950/30',
        badgeBg: 'bg-sky-500/20 text-sky-200 border-sky-400/50',
        dotColor: 'bg-sky-400',
        accentBar: 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
        titleColor: 'text-sky-100',
        icon: <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
        label: 'DEEP (Lv 3+)',
      };
    default:
      return {
        bg: 'bg-[#151f32] hover:bg-[#19263e]',
        border: 'border-slate-700/90 hover:border-slate-500 shadow-md shadow-black/35',
        badgeBg: 'bg-slate-800/90 text-slate-300 border-slate-600/70',
        dotColor: 'bg-slate-500',
        accentBar: 'bg-slate-600/70',
        titleColor: 'text-slate-100',
        icon: <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
        label: 'CLEAN',
      };
  }
}

export const FileNode = memo(({ data, selected }) => {
  const {
    label,
    fullPath = '',
    isChanged = false,
    isImpacted = false,
    severity = 'NONE',
    depth = 0,
    isHighlighted = false,
    isDimmed = false,
  } = data;

  const config = getSeverityConfig(severity, isChanged);
  const dirName = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';

  return (
    <div
      title={fullPath}
      className={`relative w-[270px] h-[76px] rounded-xl border transition-all duration-200 px-3 py-2 flex flex-col justify-between transform-gpu will-change-transform ${
        config.bg
      } ${config.border} ${
        isDimmed && !selected && !isHighlighted ? 'opacity-25 scale-[0.98]' : 'opacity-100'
      } ${
        selected
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0d1527] scale-[1.03] z-30 shadow-2xl shadow-cyan-500/25'
          : isHighlighted
          ? 'ring-1.5 ring-cyan-400/90 scale-[1.02] z-20 shadow-lg shadow-cyan-500/15'
          : ''
      }`}
    >
      {/* Top micro accent bar */}
      <div
        className={`absolute top-0 left-3 right-3 h-[2px] rounded-full ${config.accentBar} opacity-90`}
      />

      {/* Horizontal DAG Handles (Left = Target, Right = Source) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-slate-300 !border-2 !border-[#0d1527] rounded-full hover:!bg-cyan-400 transition-colors shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-slate-300 !border-2 !border-[#0d1527] rounded-full hover:!bg-cyan-400 transition-colors shadow-sm"
      />

      {/* Top & Bottom Handles for complex routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-slate-400 !border !border-[#0d1527] rounded-full opacity-40 hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-slate-400 !border !border-[#0d1527] rounded-full opacity-40 hover:opacity-100"
      />

      {/* Top Row: Icon + Filename + Severity Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {config.icon}
          <span
            className={`font-bold text-xs truncate font-mono tracking-tight ${config.titleColor}`}
            title={label}
          >
            {label}
          </span>
        </div>

        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 tracking-wider font-mono ${config.badgeBg}`}
        >
          {config.label}
        </span>
      </div>

      {/* Middle/Bottom Row: Directory Path + Depth Badge */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          <Folder className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate text-slate-300" title={dirName || 'root'}>
            {dirName || '.'}
          </span>
          {data.publicSymbols?.length > 0 && (
            <span
              className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/90 text-indigo-200 border border-indigo-500/50 shrink-0 font-mono"
              title={`Exported symbols: ${data.publicSymbols.join(', ')}`}
            >
              {data.publicSymbols.length} fx
            </span>
          )}
        </div>

        {isChanged ? (
          <span className="text-amber-300 font-bold shrink-0 text-[10px] bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/40">
            Root
          </span>
        ) : isImpacted ? (
          <span className="text-cyan-300 font-bold shrink-0 text-[10px] bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/40">
            Lv {depth}
          </span>
        ) : (
          <span className="text-slate-400 font-medium shrink-0 text-[10px]">Clean</span>
        )}
      </div>
    </div>
  );
});

FileNode.displayName = 'FileNode';
