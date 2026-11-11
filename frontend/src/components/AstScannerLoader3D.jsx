import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

export function AstScannerLoader3D({ className = 'w-28 h-28 sm:w-32 sm:h-32' }) {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 128;
    const height = container.clientHeight || 128;
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

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(2.65, 2.05, 3.85);
    camera.lookAt(0, 0, 0);

    // Lighting tailored for Light & Dark themes
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 1.6 : 2.1));
    const keyLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x0284c7, 2.3);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);
    const blastLight = new THREE.PointLight(isDark ? 0xf43f5e : 0xd97706, isDark ? 2.0 : 1.4, 15);
    blastLight.position.set(-3, -2, 3);
    scene.add(blastLight);

    const rig = new THREE.Group();
    scene.add(rig);

    // 1. Outer architectural AST bounding wireframe cube
    const boxGeo = new THREE.BoxGeometry(1.66, 1.66, 1.66);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();
    const edgesMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x818cf8 : 0x334155,
      transparent: true,
      opacity: isDark ? 0.65 : 0.72,
    });
    const outerCube = new THREE.LineSegments(edgesGeo, edgesMat);
    rig.add(outerCube);

    // 2. Central Blast Root Diamond Core + Crisp Facet Cage
    const coreGeo = new THREE.OctahedronGeometry(0.62, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      emissive: isDark ? 0xf59e0b : 0x0369a1,
      emissiveIntensity: isDark ? 0.55 : 0.28,
      roughness: 0.18,
      metalness: 0.58,
      flatShading: true,
      transparent: true,
      opacity: isDark ? 0.78 : 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rig.add(coreMesh);

    const coreWireGeo = new THREE.EdgesGeometry(coreGeo);
    const coreWireMat = new THREE.LineBasicMaterial({
      color: isDark ? 0xe0f2fe : 0x0c4a6e,
      transparent: true,
      opacity: 0.92,
    });
    coreMesh.add(new THREE.LineSegments(coreWireGeo, coreWireMat));

    // 3. Oscillating Laser Scan Slice Plane + Rim
    const scanGroup = new THREE.Group();
    const scanPlaneGeo = new THREE.PlaneGeometry(1.88, 1.88);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.24 : 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scanPlane.rotation.x = Math.PI / 2;
    scanGroup.add(scanPlane);

    const scanRimBox = new THREE.BoxGeometry(1.9, 0.032, 1.9);
    const scanRimGeo = new THREE.EdgesGeometry(scanRimBox);
    scanRimBox.dispose();
    const scanRimMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0369a1,
    });
    scanGroup.add(new THREE.LineSegments(scanRimGeo, scanRimMat));
    rig.add(scanGroup);

    // 4. Expanding Blast Radius Shockwave Ring (horizontal pulse)
    const shockGeo = new THREE.RingGeometry(0.7, 0.84, 40);
    const shockMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xf43f5e : 0xdc2626,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const shockRing = new THREE.Mesh(shockGeo, shockMat);
    shockRing.rotation.x = -Math.PI / 2;
    rig.add(shockRing);

    // 5. Tilted AST Dependency Orbit Ring + 3 Orbiting File Satellites
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.set(0.65, 0.25, -0.35);
    rig.add(orbitGroup);

    const orbitRingGeo = new THREE.TorusGeometry(1.38, 0.022, 10, 48);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.45 : 0.55,
    });
    orbitGroup.add(new THREE.Mesh(orbitRingGeo, orbitRingMat));

    const satGeo = new THREE.SphereGeometry(0.095, 10, 10);
    const satColors = isDark
      ? [0xf43f5e, 0xfbbf24, 0x38bdf8]
      : [0xdc2626, 0xd97706, 0x0284c7];
    satColors.forEach((col, i) => {
      const ang = (i * Math.PI * 2) / satColors.length;
      const sat = new THREE.Mesh(
        satGeo,
        new THREE.MeshBasicMaterial({ color: col })
      );
      sat.position.set(Math.cos(ang) * 1.38, Math.sin(ang) * 1.38, 0);
      orbitGroup.add(sat);
    });

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getOptimalPixelRatio(w));
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop
    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;

    const renderFrame = (elapsed) => {
      rig.rotation.y = elapsed * 0.72;
      coreMesh.rotation.x = elapsed * 1.05;
      coreMesh.rotation.y = elapsed * 0.65;
      scanGroup.position.y = Math.sin(elapsed * 2.6) * 0.83;
      orbitGroup.rotation.z = elapsed * 1.15;

      const phase = (elapsed * 0.65) % 1;
      const s = 0.75 + phase * 1.65;
      shockRing.scale.set(s, s, s);
      shockMat.opacity = (1 - phase) * (isDark ? 0.65 : 0.72);

      renderer.render(scene, camera);
    };

    const tick = (timestamp) => {
      if (!isVisible) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(tick);
      timer.update(timestamp);
      renderFrame(timer.getElapsed());
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

    renderFrame(0.4);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      resizeObserver.disconnect();
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      aria-label="3D AST Blast Scanner"
      className={`${className} relative select-none`}
    />
  );
}

/**
 * Full-container or fullscreen frosted glass overlay wrapping AstScannerLoader3D
 * for Connect, Blast Radius, History Load, Simulation, and ELK Layout phases.
 */
export function AstBlastLoaderOverlay({
  badge = '3D AST BLAST LOADER',
  message = 'Scanning ASTs & Computing Blast Radius...',
  subMessage = 'Tracing multi-hop imports, broken symbols, and dependency waves',
  fullscreen = false,
  className = '',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        fullscreen ? 'fixed inset-0 z-[70]' : 'absolute inset-0 z-40'
      } flex flex-col items-center justify-center bg-white/88 dark:bg-[#070b14]/88 backdrop-blur-md transition-colors px-4 text-center select-none ${className}`}
    >
      <div className="max-w-md w-full rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 shadow-2xl px-6 py-7 flex flex-col items-center">
        <AstScannerLoader3D className="w-28 h-28 sm:w-32 sm:h-32 mb-2" />

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 mb-2.5">
          <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          {badge}
        </span>

        <p className="text-sm sm:text-base text-slate-900 dark:text-white font-bold leading-snug">
          {message}
        </p>

        {subMessage && (
          <p className="text-[11px] sm:text-xs font-mono text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            {subMessage}
          </p>
        )}

        {/* Deterministic Pipeline Progress Pills */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-semibold">
            1. Diff / Fetch
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-semibold">
            2. Tree-Sitter AST
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
            3. Blast Graph
          </span>
        </div>
      </div>
    </div>
  );
}
