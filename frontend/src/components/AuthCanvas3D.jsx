import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ShieldCheck, Cpu, GitBranch } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

export function AuthCanvas3D({ variant = 'login' }) {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 560;
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
    renderer.toneMappingExposure = isDark ? 1.25 : 1.08;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);
    camera.lookAt(0, 0, 0);

    // Three-point studio lighting tailored to Light vs Dark
    scene.add(new THREE.AmbientLight(isDark ? 0x334155 : 0xffffff, isDark ? 1.9 : 2.3));
    const keyLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x0284c7, isDark ? 3.2 : 2.4);
    keyLight.position.set(8, 10, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0x818cf8 : 0x4f46e5, isDark ? 2.2 : 1.6);
    fillLight.position.set(-8, -6, 6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(isDark ? 0x10b981 : 0x059669, isDark ? 2.4 : 1.4, 25);
    rimLight.position.set(0, 6, -5);
    scene.add(rimLight);

    const rig = new THREE.Group();
    scene.add(rig);

    // 1. Centerpiece Glass / Metallic-Iridescent TorusKnot AST Lattice
    const knotGeo = new THREE.TorusKnotGeometry(1.38, 0.34, 140, 24, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x0ea5e9 : 0x0284c7,
      emissive: isDark ? 0x1e3a8a : 0x0369a1,
      emissiveIntensity: isDark ? 0.48 : 0.18,
      roughness: isDark ? 0.16 : 0.2,
      metalness: isDark ? 0.45 : 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      iridescence: 0.7,
      iridescenceIOR: 1.35,
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    rig.add(knotMesh);

    // 2. Subtle outer wireframe icosahedron cage
    const cageGeo = new THREE.IcosahedronGeometry(2.65, 1);
    const cageEdges = new THREE.EdgesGeometry(cageGeo);
    cageGeo.dispose();
    const cageMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x334155,
      transparent: true,
      opacity: isDark ? 0.2 : 0.22,
    });
    const cageWire = new THREE.LineSegments(cageEdges, cageMat);
    rig.add(cageWire);

    // 3. Concentric orbital AST shield rings with satellite nodes
    const orbitalConfigs = [
      { radius: 2.35, tiltX: 1.15, tiltY: 0.3, speed: 0.52, color: isDark ? 0x38bdf8 : 0x0284c7 },
      { radius: 2.75, tiltX: -0.75, tiltY: 0.85, speed: -0.38, color: isDark ? 0x818cf8 : 0x4f46e5 },
      { radius: 3.1, tiltX: 0.45, tiltY: -1.05, speed: 0.29, color: isDark ? 0x10b981 : 0x059669 },
    ];

    const satGeo = new THREE.OctahedronGeometry(0.14, 0);
    const orbitals = orbitalConfigs.map((cfg) => {
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.set(cfg.tiltX, cfg.tiltY, 0);

      const ringGeo = new THREE.TorusGeometry(cfg.radius, 0.016, 12, 84);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: isDark ? 0.5 : 0.55,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      orbitGroup.add(ringMesh);

      const satMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: isDark ? 0.9 : 0.4,
        roughness: 0.2,
      });
      const satA = new THREE.Mesh(satGeo, satMat);
      satA.position.set(cfg.radius, 0, 0);
      const satB = new THREE.Mesh(satGeo, satMat);
      satB.position.set(-cfg.radius, 0, 0);
      orbitGroup.add(satA, satB);

      rig.add(orbitGroup);
      return { orbitGroup, speed: cfg.speed };
    });

    // 4. Floating AST micro-stars
    const ptCount = 70;
    const ptGeo = new THREE.BufferGeometry();
    const ptPos = new Float32Array(ptCount * 3);
    for (let i = 0; i < ptCount; i++) {
      ptPos[i * 3 + 0] = (Math.random() - 0.5) * 9.5;
      ptPos[i * 3 + 1] = (Math.random() - 0.5) * 9.5;
      ptPos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    }
    ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
    const ptMat = new THREE.PointsMaterial({
      color: isDark ? 0x7dd3fc : 0x0284c7,
      size: 0.055,
      transparent: true,
      opacity: isDark ? 0.55 : 0.45,
    });
    const particles = new THREE.Points(ptGeo, ptMat);
    scene.add(particles);

    // Pointer interactive parallax
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.45;
      pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.35;
    };
    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

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
      knotMesh.rotation.x = elapsed * 0.24;
      knotMesh.rotation.y = elapsed * 0.36;
      cageWire.rotation.y = -elapsed * 0.12;
      cageWire.rotation.x = Math.sin(elapsed * 0.25) * 0.15;

      orbitals.forEach((o) => {
        o.orbitGroup.rotation.z = elapsed * o.speed;
      });

      particles.rotation.y = elapsed * 0.04;
      rig.rotation.y += (pointerX - rig.rotation.y) * 0.06;
      rig.rotation.x += (pointerY - rig.rotation.x) * 0.06;

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

    renderFrame(0.8);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, [isDark]);

  const isRegister = variant === 'register';

  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[560px] rounded-3xl overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-[#0c1426] dark:via-[#081020] dark:to-[#070b15] border border-slate-200 dark:border-slate-800/90 shadow-xl dark:shadow-2xl flex flex-col justify-between p-6 select-none">
      {/* Subtle CSS ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 blur-[90px] rounded-full pointer-events-none" />

      {/* Top Glass Header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AST ENGINE v1.0 • 3D CORE
        </span>
        <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400">
          Hover to tilt
        </span>
      </div>

      {/* 3D WebGL Canvas Centerpiece */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Bottom Trust & Telemetry Card */}
      <div className="relative z-10 mt-auto rounded-2xl bg-white/90 dark:bg-slate-950/85 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-md p-4 shadow-md space-y-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {isRegister ? 'Start Mapping Multi-Hop Impact in Seconds' : 'Deterministic Pre-Merge Confidence'}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          {isRegister
            ? 'Analyze JavaScript, TypeScript, Python & Go dependencies via local CLI, GitHub PRs, or interactive 2D/3D blast graphs.'
            : 'Trace exact breaking symbol calls, inspect AI risk assessments, and simulate refactor safety before opening any PR.'}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Tree-Sitter AST
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            <GitBranch className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Zero Source Leak
          </span>
        </div>
      </div>
    </div>
  );
}
