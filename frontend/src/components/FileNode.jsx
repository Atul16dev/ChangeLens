import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, AlertOctagon, AlertTriangle, Flame, Folder, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

function getSeverityConfig(severity, isChanged, isDeleted, isDark = true) {
  if (isDeleted || severity === 'DELETED') {
    return {
      bg: isDark
        ? 'bg-gradient-to-br from-[#3b080d] via-[#1f1728] to-[#121626]'
        : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/60',
      border: isDark
        ? 'border-rose-500 shadow-xl shadow-rose-950/70 ring-2 ring-rose-500/50'
        : 'border-rose-400 shadow-md shadow-rose-500/10 ring-2 ring-rose-400/40',
      badgeBg: isDark
        ? 'bg-rose-500/30 text-rose-200 border-rose-500/80 shadow-sm shadow-rose-500/30'
        : 'bg-rose-100 text-rose-800 border-rose-300 shadow-sm',
      dotColor: 'bg-rose-500 animate-ping',
      accentBar: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]',
      titleColor: isDark ? 'text-rose-100' : 'text-rose-950',
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
      label: 'ROOT DELETED',
    };
  }

  if (isChanged) {
    return {
      bg: isDark
        ? 'bg-gradient-to-br from-[#2f1f0a] via-[#1c2438] to-[#131b2e]'
        : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/70',
      border: isDark
        ? 'border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/30'
        : 'border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/50',
      badgeBg: isDark
        ? 'bg-amber-400/20 text-amber-200 border-amber-400/60 shadow-sm shadow-amber-500/20'
        : 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm',
      dotColor: 'bg-amber-400 animate-pulse',
      accentBar: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      titleColor: isDark ? 'text-amber-100' : 'text-amber-950',
      icon: <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      label: 'ROOT CHANGED',
    };
  }

  switch (severity) {
    case 'CRITICAL':
      return {
        bg: isDark
          ? 'bg-gradient-to-br from-[#351019] via-[#1e2338] to-[#131b2e]'
          : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/70',
        border: isDark
          ? 'border-rose-500 shadow-lg shadow-rose-950/50 ring-1 ring-rose-500/30'
          : 'border-rose-400 shadow-lg shadow-rose-500/20 ring-1 ring-rose-400/50',
        badgeBg: isDark
          ? 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-sm shadow-rose-500/20'
          : 'bg-rose-100 text-rose-900 border-rose-300 shadow-sm',
        dotColor: 'bg-rose-500 animate-ping',
        accentBar: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        titleColor: isDark ? 'text-rose-100' : 'text-rose-950',
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        label: 'CRITICAL',
      };
    case 'HIGH':
      return {
        bg: isDark
          ? 'bg-gradient-to-br from-[#301a0d] via-[#1d2338] to-[#131b2e]'
          : 'bg-gradient-to-br from-orange-50 via-white to-orange-50/70',
        border: isDark
          ? 'border-orange-500 shadow-lg shadow-orange-950/40'
          : 'border-orange-400 shadow-lg shadow-orange-500/20',
        badgeBg: isDark
          ? 'bg-orange-500/25 text-orange-200 border-orange-400/60 shadow-sm shadow-orange-500/20'
          : 'bg-orange-100 text-orange-900 border-orange-300 shadow-sm',
        dotColor: 'bg-orange-400',
        accentBar: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]',
        titleColor: isDark ? 'text-orange-100' : 'text-orange-950',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />,
        label: 'DIRECT (Lv 1)',
      };
    case 'MEDIUM':
      return {
        bg: isDark
          ? 'bg-gradient-to-br from-[#2a220a] via-[#1c2338] to-[#131b2e]'
          : 'bg-gradient-to-br from-yellow-50 via-white to-yellow-50/60',
        border: isDark
          ? 'border-yellow-500/90 shadow-md shadow-yellow-950/30'
          : 'border-yellow-400 shadow-lg shadow-yellow-500/20',
        badgeBg: isDark
          ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50'
          : 'bg-yellow-100 text-yellow-900 border-yellow-300 shadow-sm',
        dotColor: 'bg-yellow-400',
        accentBar: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]',
        titleColor: isDark ? 'text-yellow-100' : 'text-yellow-950',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
        label: 'TRANSITIVE',
      };
    case 'LOW':
      return {
        bg: isDark
          ? 'bg-gradient-to-br from-[#12233c] via-[#18233a] to-[#121929]'
          : 'bg-gradient-to-br from-sky-50 via-white to-sky-50/60',
        border: isDark
          ? 'border-sky-500/70 shadow-md shadow-sky-950/30'
          : 'border-sky-400 shadow-lg shadow-sky-500/20',
        badgeBg: isDark
          ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
          : 'bg-sky-100 text-sky-900 border-sky-300 shadow-sm',
        dotColor: 'bg-sky-400',
        accentBar: 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
        titleColor: isDark ? 'text-sky-100' : 'text-sky-950',
        icon: <FileCode className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
        label: 'DEEP (Lv 3+)',
      };
    default:
      return {
        bg: isDark ? 'bg-[#151f32] hover:bg-[#19263e]' : 'bg-white hover:bg-slate-50',
        border: isDark
          ? 'border-slate-700/90 hover:border-slate-500 shadow-md shadow-black/35'
          : 'border-slate-300 hover:border-slate-400 shadow-md shadow-slate-900/10',
        badgeBg: isDark
          ? 'bg-slate-800/90 text-slate-300 border-slate-600/70'
          : 'bg-slate-100 text-slate-700 border-slate-300 shadow-sm',
        dotColor: isDark ? 'bg-slate-500' : 'bg-slate-500',
        accentBar: isDark ? 'bg-slate-600/70' : 'bg-slate-400',
        titleColor: isDark ? 'text-slate-100' : 'text-slate-900',
        icon: <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
        label: 'CLEAN',
      };
  }
}

export const FileNode = memo(({ data, selected }) => {
  const { isDark } = useTheme();
  const {
    label,
    fullPath = '',
    isChanged = false,
    isDeleted = false,
    changeType = null,
    isImpacted = false,
    severity = 'NONE',
    depth = 0,
    isHighlighted = false,
    isDimmed = false,
  } = data;

  const effectiveIsDeleted = isDeleted || changeType === 'deleted' || severity === 'DELETED';
  const config = getSeverityConfig(severity, isChanged, effectiveIsDeleted, isDark);
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
          ? isDark
            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0d1527] scale-[1.03] z-30 shadow-2xl shadow-cyan-500/25'
            : 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-white scale-[1.03] z-30 shadow-xl shadow-cyan-500/20'
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
        className={`!w-2.5 !h-2.5 rounded-full transition-colors shadow-sm ${
          isDark
            ? '!bg-slate-300 !border-2 !border-[#0d1527] hover:!bg-cyan-400'
            : '!bg-slate-400 !border-2 !border-white hover:!bg-cyan-500'
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={`!w-2.5 !h-2.5 rounded-full transition-colors shadow-sm ${
          isDark
            ? '!bg-slate-300 !border-2 !border-[#0d1527] hover:!bg-cyan-400'
            : '!bg-slate-400 !border-2 !border-white hover:!bg-cyan-500'
        }`}
      />

      {/* Top & Bottom Handles for complex routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`!w-2 !h-2 rounded-full opacity-40 hover:opacity-100 ${
          isDark ? '!bg-slate-400 !border !border-[#0d1527]' : '!bg-slate-400 !border !border-white'
        }`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`!w-2 !h-2 rounded-full opacity-40 hover:opacity-100 ${
          isDark ? '!bg-slate-400 !border !border-[#0d1527]' : '!bg-slate-400 !border !border-white'
        }`}
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
      <div
        className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${
          isDark ? 'border-slate-700/50 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          <Folder className="w-3 h-3 text-slate-400 shrink-0" />
          <span
            className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
            title={dirName || 'root'}
          >
            {dirName || '.'}
          </span>
          {data.publicSymbols?.length > 0 && (
            <span
              className={`text-[9px] px-1 py-0.2 rounded border shrink-0 font-mono ${
                isDark
                  ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/50'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
              title={`Exported symbols: ${data.publicSymbols.join(', ')}`}
            >
              {data.publicSymbols.length} fx
            </span>
          )}
        </div>

        {isChanged ? (
          <span
            className={`font-bold shrink-0 text-[10px] px-1.5 py-0.2 rounded border ${
              isDark
                ? 'text-amber-300 bg-amber-950/60 border-amber-500/40'
                : 'text-amber-800 bg-amber-100 border-amber-300'
            }`}
          >
            Root
          </span>
        ) : isImpacted ? (
          <span
            className={`font-bold shrink-0 text-[10px] px-1.5 py-0.2 rounded border ${
              isDark
                ? 'text-cyan-300 bg-cyan-950/60 border-cyan-500/40'
                : 'text-cyan-800 bg-cyan-100 border-cyan-300'
            }`}
          >
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
