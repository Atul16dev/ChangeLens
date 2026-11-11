import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GitBranch, Layers, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../../utils/threeHelpers.js';

const NODE_COUNT = 32;
const EDGE_COUNT = 44;

const STORY_STEPS = [
  {
    id: 'chaos',
    min: 0,
    max: 0.34,
    badge: '01 • Raw Diff Chaos',
    title: 'Blind Refactoring Risk',
    desc: 'Without AST lineage, re-exported utilities and hidden callers hide inside tangled imports.',
    colorDark: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
    colorLight: 'text-rose-700 border-rose-300 bg-rose-50',
  },
  {
    id: 'resolving',
    min: 0.34,
    max: 0.72,
    badge: '02 • Multi-Hop BFS Sorting',
    title: 'Deterministic Graph Pass',
    desc: 'Tree-Sitter extracts exported symbols and untangles transitive call chains by hop depth.',
    colorDark: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
    colorLight: 'text-amber-700 border-amber-300 bg-amber-50',
  },
  {
    id: 'ordered',
    min: 0.72,
    max: 1.01,
    badge: '03 • Ordered Blast Radius',
    title: 'Surgical Change Visibility',
    desc: 'Changed roots, direct dependents, and downstream entrypoints snap into crystal-clear tiers.',
    colorDark: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/30',
    colorLight: 'text-cyan-800 border-cyan-300 bg-cyan-50',
  },
];

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function ChaosToOrderScroll3D() {
  const sectionRef = useRef(null);
  const canvasHostRef = useRef(null);
  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);

  const [mode, setMode] = useState('scroll'); // 'scroll' | 'manual'
  const [manualValue, setManualValue] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  const modeRef = useRef('scroll');
  const targetMorphRef = useRef(0);
  const renderOnceRef = useRef(null);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    modeRef.current = mode;
    if (mode === 'manual') {
      targetMorphRef.current = manualValue / 100;
      if (renderOnceRef.current) renderOnceRef.current();
    }
  }, [mode, manualValue]);

  useEffect(() => {
    const section = sectionRef.current;
    const container = canvasHostRef.current;
    if (!section || !container) return;

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 400;
    const reducedMotion = getPrefersReducedMotion();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(getOptimalPixelRatio(width));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.2 : 1.05;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
    camera.position.set(0, 1.4, 15.8);
    camera.lookAt(0, 0, 0);

    // Responsive zoom pull-back on narrow screens
    const updateCameraForAspect = (w, h) => {
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      camera.position.z = aspect < 1.25 ? 19.2 : 15.8;
      camera.updateProjectionMatrix();
    };
    updateCameraForAspect(width, height);

    // Lighting
    scene.add(new THREE.AmbientLight(isDark ? 0x334155 : 0xffffff, isDark ? 2.0 : 2.3));
    const keyLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x0284c7, isDark ? 2.6 : 1.9);
    keyLight.position.set(10, 12, 14);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0xa78bfa : 0x6366f1, isDark ? 1.7 : 1.2);
    fillLight.position.set(-12, -8, -8);
    scene.add(fillLight);

    const rig = new THREE.Group();
    scene.add(rig);

    // Tier guide plates (fade in when ordered!)
    const tierGuides = [];
    const tierX = [-5.1, -1.7, 1.7, 5.1];
    const tierColors = isDark
      ? [0xf43f5e, 0xf59e0b, 0x38bdf8, 0x818cf8]
      : [0xe11d48, 0xd97706, 0x0284c7, 0x4f46e5];

    const guideGeo = new THREE.RingGeometry(1.45, 1.56, 36);
    tierX.forEach((tx, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        color: tierColors[idx],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const ring = new THREE.Mesh(guideGeo, mat);
      ring.position.set(tx, 0, -1.2);
      rig.add(ring);
      tierGuides.push({ mesh: ring, mat });
    });

    // Build deterministic dual-state AST nodes (Chaos pos <-> Ordered layered pos)
    const nodeGeo = new THREE.IcosahedronGeometry(0.28, 1);
    const rootGeo = new THREE.OctahedronGeometry(0.38, 0);
    const nodes = [];

    const tierCounts = [3, 8, 11, 10]; // Sums to 32 nodes
    let cursor = 0;

    for (let t = 0; t < tierCounts.length; t++) {
      const count = tierCounts[t];
      for (let i = 0; i < count; i++) {
        const idx = cursor++;
        const angle = idx * 2.39996; // Golden angle spiral
        const radius = 2.0 + ((idx * 7) % 10) * 0.34;
        const chaosPos = new THREE.Vector3(
          Math.cos(angle) * radius * 1.15,
          Math.sin(angle * 1.37) * radius * 0.72,
          Math.sin(angle * 0.8 + idx) * 2.6
        );

        const rowSpread = (count - 1) * 0.78;
        const ordY = rowSpread * 0.5 - i * 0.78;
        const ordZ = ((i % 3) - 1) * 0.75;
        const orderPos = new THREE.Vector3(tierX[t], ordY, ordZ);

        const isRoot = t === 0 && i === 0;
        const chaosCol = new THREE.Color(
          isDark
            ? (idx % 3 === 0 ? 0xfb7185 : idx % 3 === 1 ? 0xfbbf24 : 0xa78bfa)
            : (idx % 3 === 0 ? 0xe11d48 : idx % 3 === 1 ? 0xd97706 : 0x4f46e5)
        );
        const orderCol = new THREE.Color(tierColors[t]);

        const mat = new THREE.MeshStandardMaterial({
          color: chaosCol.clone(),
          emissive: chaosCol.clone(),
          emissiveIntensity: isDark ? 0.55 : 0.25,
          roughness: 0.25,
          metalness: 0.55,
        });

        const mesh = new THREE.Mesh(isRoot ? rootGeo : nodeGeo, mat);
        mesh.position.copy(chaosPos);
        rig.add(mesh);

        nodes.push({
          idx,
          tier: t,
          chaosPos,
          orderPos,
          chaosCol,
          orderCol,
          phase: idx * 0.57,
          mesh,
          mat,
        });
      }
    }

    // Build Edges with preallocated LineSegments buffer (1 draw call for all 44 edges!)
    const edges = [];
    for (let i = 0; i < EDGE_COUNT; i++) {
      // Deterministic source -> downstream target
      const srcIdx = i < 16 ? i % 3 : 3 + (i % 19);
      const tgtTierBase = srcIdx < 3 ? 3 : srcIdx < 11 ? 11 : 22;
      const tgtSpan = srcIdx < 3 ? 8 : srcIdx < 11 ? 11 : 10;
      const tgtIdx = tgtTierBase + ((i * 5 + srcIdx) % tgtSpan);

      // Chaotic shuffled endpoints
      const chaosA = (i * 7) % NODE_COUNT;
      const chaosB = (i * 13 + 5) % NODE_COUNT;

      edges.push({
        orderA: srcIdx,
        orderB: tgtIdx,
        chaosA,
        chaosB,
      });
    }

    const linePositions = new Float32Array(EDGE_COUNT * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.42 : 0.52,
    });
    const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    rig.add(lineSegments);

    // Subtle pointer tilt on canvas
    let targetTiltX = 0;
    let targetTiltY = 0;
    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetTiltY = (((e.clientX - rect.left) / rect.width) - 0.5) * 0.28;
      targetTiltX = (((e.clientY - rect.top) / rect.height) - 0.5) * 0.16;
    };
    const onPointerLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // Scroll progress tracker
    const updateScrollProgress = () => {
      if (modeRef.current !== 'scroll') return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // Maps section entering bottom (0.85 * vh) -> centered (0.28 * vh) cleanly to 0..1
      const raw = (vh * 0.78 - rect.top) / (vh * 0.55);
      targetMorphRef.current = THREE.MathUtils.clamp(raw, 0, 1);
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      updateCameraForAspect(w, h);
      renderer.setPixelRatio(getOptimalPixelRatio(w));
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation state
    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;
    let smoothMorph = reducedMotion ? 1.0 : targetMorphRef.current;
    let lastReportedPct = -1;

    const _pA = new THREE.Vector3();
    const _pB = new THREE.Vector3();
    const chaosEdgeCol = new THREE.Color(isDark ? 0xf43f5e : 0xe11d48);
    const orderEdgeCol = new THREE.Color(isDark ? 0x38bdf8 : 0x0284c7);

    const renderScene = (elapsed) => {
      const target = targetMorphRef.current;
      smoothMorph += (target - smoothMorph) * (reducedMotion ? 1 : 0.085);
      const t = easeInOutCubic(THREE.MathUtils.clamp(smoothMorph, 0, 1));

      const pct = Math.round(t * 100);
      if (pct !== lastReportedPct) {
        lastReportedPct = pct;
        setDisplayProgress(pct);
      }

      // Subtle gentle swirl in chaos mode, serene stability in ordered mode
      const swirlAmp = (1 - t) * 0.24;
      rig.rotation.y += (targetTiltY + Math.sin(elapsed * 0.5) * (0.08 + (1 - t) * 0.14) - rig.rotation.y) * 0.06;
      rig.rotation.x += (targetTiltX - rig.rotation.x) * 0.06;

      // Update nodes
      nodes.forEach((n) => {
        n.mesh.position.lerpVectors(n.chaosPos, n.orderPos, t);
        if (!reducedMotion) {
          n.mesh.position.y += Math.sin(elapsed * 1.4 + n.phase) * (0.04 + swirlAmp * 0.4);
          n.mesh.position.z += Math.cos(elapsed * 1.1 + n.phase) * swirlAmp;
        }
        n.mat.color.copy(n.chaosCol).lerp(n.orderCol, t);
        n.mat.emissive.copy(n.mat.color);
        n.mesh.rotation.y = elapsed * (n.idx === 0 ? 0.9 : 0.35);
      });

      // Update single-draw-call LineSegments vertices smoothly
      const posAttr = lineGeo.attributes.position;
      edges.forEach((e, idx) => {
        const cA = nodes[e.chaosA].mesh.position;
        const cB = nodes[e.chaosB].mesh.position;
        const oA = nodes[e.orderA].mesh.position;
        const oB = nodes[e.orderB].mesh.position;

        _pA.lerpVectors(cA, oA, t);
        _pB.lerpVectors(cB, oB, t);

        const base = idx * 6;
        posAttr.array[base + 0] = _pA.x;
        posAttr.array[base + 1] = _pA.y;
        posAttr.array[base + 2] = _pA.z;
        posAttr.array[base + 3] = _pB.x;
        posAttr.array[base + 4] = _pB.y;
        posAttr.array[base + 5] = _pB.z;
      });
      posAttr.needsUpdate = true;

      lineMat.color.copy(chaosEdgeCol).lerp(orderEdgeCol, t);
      lineMat.opacity = isDark ? 0.32 + t * 0.32 : 0.42 + t * 0.30;

      // Reveal tier guide rings smoothly near ordered state
      tierGuides.forEach((g, idx) => {
        g.mat.opacity = Math.max(0, (t - 0.55) / 0.45) * (isDark ? 0.35 : 0.45);
        g.mesh.rotation.z = elapsed * 0.2 * (idx % 2 === 0 ? 1 : -1);
      });

      renderer.render(scene, camera);
    };

    const tick = (timestamp) => {
      if (!isVisible) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(tick);
      timer.update(timestamp);
      renderScene(timer.getElapsed());
    };

    const stopVisibility = observeVisibility(container, (visible) => {
      isVisible = visible;
      if (visible && !reducedMotion && animId === null) {
        animId = requestAnimationFrame(tick);
      } else if (!visible && animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    });

    renderOnceRef.current = () => {
      renderScene(0);
    };

    renderScene(0);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      renderOnceRef.current = null;
      stopVisibility();
      window.removeEventListener('scroll', updateScrollProgress);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, [isDark]);

  // Also ensure manual slider updates render a frame when reduced-motion is on
  const activeStepIndex = STORY_STEPS.findIndex(
    (s) => displayProgress / 100 >= s.min && displayProgress / 100 <= s.max
  );

  return (
    <section
      ref={sectionRef}
      id="chaos-to-order"
      className="py-14 sm:py-20 relative bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-[#0b0f19] dark:via-[#070c17] dark:to-[#0b0f19] border-t border-slate-200 dark:border-slate-800/80 overflow-hidden transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/30 font-mono">
              <GitBranch className="w-3 h-3" />
              Scroll-Linked 3D AST Storytelling
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              From Tangled Imports to{' '}
              <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Ordered Hierarchy
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Scroll through this section—or scrub the interactive timeline—to watch ChangeLens untangle chaotic cross-file dependencies into a clean, multi-tier blast radius graph.
            </p>
          </div>

          {/* Interactive Control Pill (Scroll Sync vs Manual Scrub) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMode('scroll')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                mode === 'scroll'
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Scroll Sync
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setManualValue(0);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                mode === 'manual' && manualValue < 35
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400/50'
              }`}
            >
              0% Chaos
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setManualValue(100);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                mode === 'manual' && manualValue >= 80
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
              }`}
            >
              100% Ordered
            </button>
          </div>
        </div>

        {/* Main Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
          {/* 3D Morph Viewport */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-100 via-sky-50/60 to-indigo-50/70 dark:from-[#0a101d] dark:via-[#0d1526] dark:to-[#090e1a] border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl overflow-hidden">
              <div
                ref={canvasHostRef}
                className="w-full h-[300px] sm:h-[380px] lg:h-[430px]"
              />

              {/* Top-left Phase Indicator */}
              <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
                <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                  {displayProgress < 35
                    ? 'UNSORTED COUPLINGS'
                    : displayProgress < 75
                    ? 'AST SYMBOL RESOLUTION'
                    : 'DETERMINISTIC 4-TIER DAG'}
                </span>
              </div>

              {/* Top-right Resolution Progress Pill */}
              <div className="absolute top-3 right-3 pointer-events-none px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                {displayProgress}% Resolved
              </div>

              {/* Bottom Morph Slider Bar */}
              <div className="px-3.5 py-2.5 bg-white/90 dark:bg-slate-950/85 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-md flex items-center gap-3">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0 hidden sm:inline">
                  Chaos
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mode === 'manual' ? manualValue : displayProgress}
                  aria-label="Morph AST topology from chaos to ordered hierarchy"
                  onChange={(e) => {
                    setMode('manual');
                    setManualValue(Number(e.target.value));
                  }}
                  className="w-full accent-cyan-600 dark:accent-cyan-400 cursor-pointer h-1.5"
                />
                <span className="text-[10px] font-mono font-semibold text-cyan-700 dark:text-cyan-400 shrink-0 hidden sm:inline">
                  Ordered AST
                </span>
              </div>
            </div>
          </div>

          {/* Synchronized Storytelling Cards */}
          <div className="lg:col-span-5 space-y-3">
            {STORY_STEPS.map((step, idx) => {
              const isActive = activeStepIndex === idx;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setMode('manual');
                    setManualValue(idx === 0 ? 0 : idx === 1 ? 52 : 100);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-slate-900/95 border-cyan-500/50 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/20'
                        : 'bg-white border-cyan-500 shadow-lg shadow-cyan-100 ring-1 ring-cyan-500/20'
                      : 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        isDark ? step.colorDark : step.colorLight
                      }`}
                    >
                      {step.badge}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                        <Sparkles className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
