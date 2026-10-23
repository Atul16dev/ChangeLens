import React, { useState, memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  MarkerType,
} from '@xyflow/react';
import { ArrowRight, Info, ShieldAlert, Sparkles } from 'lucide-react';

export const ImpactEdge = memo(({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data = {},
  markerEnd,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const {
    importer = source,
    imported = target,
    specifier = '',
    mode = 'impact',
    isImpacted = false,
    isDirectImpact = false,
    severity = 'NONE',
    isHighlighted = false,
    isDimmed = false,
  } = data;

  // Determine edge color and stroke width based on visual priority
  let strokeColor = '#475569'; // Clean / background dependency
  let strokeWidth = 1.5;
  let labelBadgeBg = 'bg-[#0f172a]/95 text-slate-300 border-slate-700/80';
  let labelText = specifier ? `${specifier}` : 'import';

  if (severity === 'CRITICAL') {
    strokeColor = '#f43f5e';
    strokeWidth = 2.5;
    labelBadgeBg = 'bg-rose-950/95 text-rose-200 border-rose-500/80 shadow-rose-500/20';
    labelText = '⚡ breaking';
  } else if (isDirectImpact || severity === 'HIGH') {
    strokeColor = '#fb923c';
    strokeWidth = 2.5;
    labelBadgeBg = 'bg-orange-950/95 text-orange-200 border-orange-500/80 shadow-orange-500/20';
    labelText = mode === 'impact' ? '⚡ direct impact' : 'imports';
  } else if (isImpacted) {
    strokeColor = '#facc15';
    strokeWidth = 2;
    labelBadgeBg = 'bg-yellow-950/95 text-yellow-200 border-yellow-500/70';
    labelText = mode === 'impact' ? '↳ transitive' : 'imports';
  }

  if (isHighlighted || isHovered) {
    strokeWidth += 1.5;
    strokeColor = isImpacted ? '#38bdf8' : '#cbd5e1';
  }

  const opacity = isDimmed && !isHovered && !isHighlighted ? 0.15 : 1;

  const importerBasename = importer.split('/').pop();
  const importedBasename = imported.split('/').pop();

  return (
    <>
      {/* Invisible wider stroke for easy hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Visible Edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          opacity,
          transition: 'all 0.2s ease',
        }}
      />

      {/* Edge Label with Progressive Disclosure Tooltip */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            opacity,
            zIndex: isHovered || isHighlighted ? 35 : 10,
          }}
          className="relative transition-opacity duration-200"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Compact Pill Label */}
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border shadow-lg backdrop-blur-md cursor-pointer transition-transform ${
              isHovered || isHighlighted ? 'scale-110 ring-1 ring-cyan-400' : ''
            } ${labelBadgeBg}`}
          >
            {labelText}
          </div>

          {/* Detailed Floating Tooltip on Hover */}
          {isHovered && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-left text-xs pointer-events-none select-text z-50">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  {mode === 'impact' ? 'Impact Propagation' : 'Code Dependency'}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${labelBadgeBg}`}>
                  {severity !== 'NONE' ? severity : 'CLEAN'}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500">From:</span>
                  <strong className="text-amber-300 truncate" title={mode === 'impact' ? imported : importer}>
                    {mode === 'impact' ? importedBasename : importerBasename}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-500">To:</span>
                  <strong className="text-cyan-300 truncate" title={mode === 'impact' ? importer : imported}>
                    {mode === 'impact' ? importerBasename : importedBasename}
                  </strong>
                </div>

                {specifier && (
                  <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                    <span className="text-slate-500">Specifier: </span>
                    <code className="text-slate-200 bg-slate-950 px-1 py-0.5 rounded">{specifier}</code>
                  </div>
                )}

                {data.importedNames && data.importedNames.length > 0 && (
                  <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
                    <span className="text-slate-500">Symbols: </span>
                    <span className="text-indigo-300 font-semibold">{data.importedNames.join(', ')}</span>
                  </div>
                )}

                <div className="pt-1 text-[10px] text-slate-400 leading-tight">
                  {mode === 'impact'
                    ? `Change in ${importedBasename} affects ${importerBasename} because ${importerBasename} imports it.`
                    : `${importerBasename} imports ${importedBasename}.`}
                </div>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ImpactEdge.displayName = 'ImpactEdge';
