import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

const SIZE_CLASSES = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
  xl: 'w-16 h-16 rounded-2xl',
};

const SIZE_PIXELS = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const ICON_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// ─── SHARED SINGLETON THREE.JS EMBLEM ENGINE ───────────────────────────────────
// Uses a single offscreen WebGLRenderer blitted to mounted 2D canvases so the app
// never exhausts browser WebGL context limits across Navbar/Footer/Auth badges.
let sharedEngine = null;

function createSharedLogoEngine() {
  const RESOLUTION = 128;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.setSize(RESOLUTION, RESOLUTION, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 0, 4.95);
  camera.lookAt(0, 0, 0);

  // Studio Three-Point Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x7dd3fc, 2.8);
  keyLight.position.set(4, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x818cf8, 2.0);
  fillLight.position.set(-5, -3, 3);
  scene.add(fillLight);

  const warmRimLight = new THREE.PointLight(0xfbbf24, 1.8, 15);
  warmRimLight.position.set(2.2, -2.2, 3);
  scene.add(warmRimLight);

  // Emblem Hierarchy
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // 1. Precision Optical Lens Aperture Bezel + 4 Calibration Ticks
  const lensGroup = new THREE.Group();
  rootGroup.add(lensGroup);

  const bezelGeo = new THREE.TorusGeometry(0.84, 0.135, 22, 56);
  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    metalness: 0.55,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    iridescence: 0.65,
  });
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  lensGroup.add(bezelMesh);

  const tickGeo = new THREE.BoxGeometry(0.12, 0.065, 0.22);
  const tickMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.45,
    metalness: 0.65,
    roughness: 0.2,
  });
  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((angle) => {
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(Math.cos(angle) * 0.84, Math.sin(angle) * 0.84, 0);
    tick.rotation.z = angle;
    lensGroup.add(tick);
  });

  // 2. Central Faceted AST Blast Prism Crystal
  const prismGroup = new THREE.Group();
  rootGroup.add(prismGroup);

  const prismGeo = new THREE.OctahedronGeometry(0.49, 0);
  const prismMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    emissive: 0x4f46e5,
    emissiveIntensity: 0.45,
    metalness: 0.35,
    roughness: 0.12,
    clearcoat: 1.0,
    iridescence: 0.85,
    flatShading: true,
  });
  const prismMesh = new THREE.Mesh(prismGeo, prismMat);
  prismGroup.add(prismMesh);

  const prismEdgesGeo = new THREE.EdgesGeometry(prismGeo);
  const prismEdgesMat = new THREE.LineBasicMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.9,
  });
  prismGroup.add(new THREE.LineSegments(prismEdgesGeo, prismEdgesMat));

  // 3. Tilted AST Dependency Orbit + Impact/Clean Satellite Beads
  const orbitTiltGroup = new THREE.Group();
  orbitTiltGroup.rotation.set(1.04, 0.18, -0.52);
  rootGroup.add(orbitTiltGroup);

  const orbitRingGeo = new THREE.TorusGeometry(1.08, 0.042, 12, 56);
  const orbitRingMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.78,
  });
  orbitTiltGroup.add(new THREE.Mesh(orbitRingGeo, orbitRingMat));

  const beadGeo = new THREE.SphereGeometry(0.155, 14, 14);
  const changedBeadMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const changedBead = new THREE.Mesh(beadGeo, changedBeadMat);
  changedBead.position.set(1.08, 0, 0);
  orbitTiltGroup.add(changedBead);

  const cleanBeadMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const cleanBead = new THREE.Mesh(beadGeo, cleanBeadMat);
  cleanBead.position.set(-1.08, 0, 0);
  orbitTiltGroup.add(cleanBead);

  // State & Subscribers
  const subscribers = new Map();
  const timer = new THREE.Timer();
  const reducedMotion = getPrefersReducedMotion();

  let animId = null;
  let spinAccum = 0.65;
  let speedFactor = 1.0;
  let lastThemeIsDark = null;

  const syncTheme = (isDark) => {
    if (lastThemeIsDark === isDark) return;
    lastThemeIsDark = isDark;
    if (isDark) {
      bezelMat.color.setHex(0x38bdf8);
      bezelMat.emissive.setHex(0x0284c7);
      bezelMat.emissiveIntensity = 0.38;
      tickMat.color.setHex(0xe0f2fe);
      prismMat.color.setHex(0x22d3ee);
      prismMat.emissive.setHex(0x4f46e5);
      prismEdgesMat.color.setHex(0xa5f3fc);
      orbitRingMat.color.setHex(0x7dd3fc);
    } else {
      bezelMat.color.setHex(0xf8fafc);
      bezelMat.emissive.setHex(0x38bdf8);
      bezelMat.emissiveIntensity = 0.22;
      tickMat.color.setHex(0xffffff);
      prismMat.color.setHex(0x38bdf8);
      prismMat.emissive.setHex(0x0369a1);
      prismEdgesMat.color.setHex(0xffffff);
      orbitRingMat.color.setHex(0xe0f2fe);
    }
  };

  const renderOnce = (dt) => {
    let anyHovered = false;
    let latestIsDark = true;

    subscribers.forEach((meta) => {
      if (meta.hovered) anyHovered = true;
      latestIsDark = meta.isDark;
    });

    syncTheme(latestIsDark);

    const targetSpeed = anyHovered ? 2.5 : 1.0;
    speedFactor += (targetSpeed - speedFactor) * 0.1;
    spinAccum += dt * speedFactor;

    if (!reducedMotion) {
      lensGroup.rotation.x = Math.sin(spinAccum * 0.75) * 0.28;
      lensGroup.rotation.y = Math.cos(spinAccum * 0.55) * 0.34;
      prismGroup.rotation.y = spinAccum * 1.15;
      prismGroup.rotation.x = Math.sin(spinAccum * 0.85) * 0.42;
      orbitTiltGroup.rotation.z = -0.52 + spinAccum * 0.95;
    } else {
      lensGroup.rotation.set(0.24, -0.28, 0);
      prismGroup.rotation.set(0.32, 0.78, 0);
      orbitTiltGroup.rotation.z = -0.52;
    }

    renderer.render(scene, camera);

    // Blit synchronously to every currently visible 2D canvas badge
    subscribers.forEach((meta, canvas) => {
      if (!meta.visible) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
    });
  };

  const tick = (timestamp) => {
    let anyVisible = false;
    subscribers.forEach((meta) => {
      if (meta.visible) anyVisible = true;
    });

    if (!anyVisible || subscribers.size === 0) {
      animId = null;
      return;
    }

    animId = requestAnimationFrame(tick);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05) || 0.016;
    renderOnce(dt);
  };

  const ensureRunning = () => {
    let anyVisible = false;
    subscribers.forEach((meta) => {
      if (meta.visible) anyVisible = true;
    });

    if (!anyVisible) {
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      return;
    }

    if (reducedMotion) {
      renderOnce(0);
      return;
    }

    if (animId === null) {
      renderOnce(0.016);
      animId = requestAnimationFrame(tick);
    }
  };

  return {
    register(canvas, meta) {
      subscribers.set(canvas, meta);
      ensureRunning();
    },
    update(canvas, patch) {
      const existing = subscribers.get(canvas);
      if (!existing) return;
      Object.assign(existing, patch);
      ensureRunning();
    },
    unregister(canvas) {
      subscribers.delete(canvas);
      if (subscribers.size === 0) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        timer.dispose();
        disposeThreeResources(scene, renderer, null, null);
        sharedEngine = null;
      } else {
        ensureRunning();
      }
    },
  };
}

function acquireLogoEngine() {
  if (!sharedEngine && typeof document !== 'undefined') {
    sharedEngine = createSharedLogoEngine();
  }
  return sharedEngine;
}

export function BrandLogo({ size = 'md', className = '' }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);
  const theme = useTheme();
  const isDark = theme?.isDark ?? true;
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    isDarkRef.current = isDark;
    const canvas = canvasRef.current;
    if (sharedEngine && canvas) {
      sharedEngine.update(canvas, { isDark });
    }
  }, [isDark]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!host || !canvas) return;

    const px = SIZE_PIXELS[size] || SIZE_PIXELS.md;
    const dpr = getOptimalPixelRatio();
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);

    const engine = acquireLogoEngine();
    if (!engine) {
      canvas.style.display = 'none';
      if (fallback) fallback.style.display = 'block';
      return;
    }

    if (fallback) fallback.style.display = 'none';
    canvas.style.display = 'block';

    engine.register(canvas, {
      visible: true,
      hovered: false,
      isDark: isDarkRef.current,
    });

    const stopVisibility = observeVisibility(host, (visible) => {
      engine.update(canvas, { visible });
    });

    const onEnter = () => engine.update(canvas, { hovered: true });
    const onLeave = () => engine.update(canvas, { hovered: false });

    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);

    return () => {
      stopVisibility();
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      engine.unregister(canvas);
    };
  }, [size]);

  return (
    <div
      ref={hostRef}
      className={`relative shrink-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 dark:from-[#0c1428] dark:via-[#111c3a] dark:to-[#1e1b4b] border border-sky-300/60 dark:border-cyan-400/35 shadow-lg shadow-blue-600/20 dark:shadow-cyan-500/20 transition-transform group-hover:scale-105 hover:scale-105 duration-200 ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
    >
      {/* Bespoke Optical Lens + Prism SVG fallback if WebGL is unavailable */}
      <svg
        ref={fallbackRef}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`${ICON_SIZES[size] || ICON_SIZES.md} text-white`}
      >
        <ellipse cx="32" cy="32" rx="23" ry="9" transform="rotate(-28 32 32)" stroke="#7dd3fc" strokeOpacity="0.8" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="4" />
        <polygon points="32,20 42,32 32,44 22,32" fill="#38bdf8" fillOpacity="0.45" stroke="#e0f2fe" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="50.5" cy="21.5" r="4.5" fill="#fb7185" />
        <circle cx="13.5" cy="42.5" r="3.8" fill="#22d3ee" />
      </svg>

      {/* High-DPI Three.js 3D Lens & Prism Canvas */}
      <canvas
        ref={canvasRef}
        aria-label="ChangeLens 3D Symbol"
        className="w-full h-full relative z-10 pointer-events-none"
      />

      {/* Subtle glass highlight overlay */}
      <div className="absolute inset-0 z-20 rounded-[inherit] bg-gradient-to-t from-black/15 via-transparent to-white/20 pointer-events-none" />
    </div>
  );
}
