import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, AlertOctagon, AlertTriangle, Flame, Folder } from 'lucide-react';

function getSeverityConfig(severity, isChanged) {
  if (isChanged) {
    return {
      bg: 'bg-amber-950/60',
      border: 'border-amber-500/80 shadow-amber-500/20',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dotColor: 'bg-amber-400 animate-pulse',
      icon: <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      label: 'ROOT CHANGED',
    };
  }

  switch (severity) {
    case 'CRITICAL':
      return {
        bg: 'bg-rose-950/70',
        border: 'border-rose-500 shadow-rose-500/30',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        dotColor: 'bg-rose-500 animate-ping',
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        label: 'CRITICAL',
      };
    case 'HIGH':
      return {
        bg: 'bg-orange-950/50',
        border: 'border-orange-500/80 shadow-orange-500/20',
        badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        dotColor: 'bg-orange-400',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
        label: 'DIRECT (Lv 1)',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-950/40',
        border: 'border-yellow-500/70 shadow-yellow-500/10',
        badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        dotColor: 'bg-yellow-400',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />,
        label: 'TRANSITIVE',
      };
    case 'LOW':
      return {
        bg: 'bg-slate-900/80',
        border: 'border-blue-500/50',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        dotColor: 'bg-blue-400',
        icon: <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
        label: 'DEEP (Lv 3+)',
      };
    default:
      return {
        bg: 'bg-slate-900/60',
        border: 'border-slate-800 hover:border-slate-700',
        badgeBg: 'bg-slate-800 text-slate-400 border-slate-700/60',
        dotColor: 'bg-slate-600',
        icon: <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
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
      className={`relative w-[270px] h-[76px] rounded-xl border backdrop-blur-md transition-all duration-200 px-3 py-2 flex flex-col justify-between transform-gpu will-change-transform ${
        config.bg
      } ${config.border} ${
        isDimmed && !selected && !isHighlighted ? 'opacity-25 scale-[0.98]' : 'opacity-100'
      } ${
        selected
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-[1.03] z-30 shadow-xl shadow-cyan-500/20'
          : isHighlighted
          ? 'ring-1 ring-cyan-400/80 scale-[1.02] z-20 shadow-lg'
          : ''
      }`}
    >
      {/* Horizontal DAG Handles (Left = Target, Right = Source) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-950 rounded-full hover:!bg-cyan-400 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-slate-950 rounded-full hover:!bg-cyan-400 transition-colors"
      />

      {/* Top & Bottom Handles for complex routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-slate-500 !border !border-slate-950 rounded-full opacity-30 hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-slate-500 !border !border-slate-950 rounded-full opacity-30 hover:opacity-100"
      />

      {/* Top Row: Icon + Filename + Severity Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {config.icon}
          <span
            className="font-bold text-slate-100 text-xs truncate font-mono tracking-tight"
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
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          <Folder className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate" title={dirName || 'root'}>
            {dirName || '.'}
          </span>
          {data.publicSymbols?.length > 0 && (
            <span
              className="text-[9px] px-1 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shrink-0 font-mono"
              title={`Exported symbols: ${data.publicSymbols.join(', ')}`}
            >
              {data.publicSymbols.length} fx
            </span>
          )}
        </div>

        {isChanged ? (
          <span className="text-amber-400 font-bold shrink-0">Root</span>
        ) : isImpacted ? (
          <span className="text-cyan-400 font-bold shrink-0">Lv {depth}</span>
        ) : (
          <span className="text-slate-600 shrink-0">Clean</span>
        )}
      </div>
    </div>
  );
});

FileNode.displayName = 'FileNode';
