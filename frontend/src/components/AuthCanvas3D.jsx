import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ShieldCheck, Cpu, GitBranch, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

function createRoughStructureTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Fine anodized bead-blasted micro-grain + crisp woven contour lines
      const h1 = (((x * 374761393 + y * 668265263) ^ ((x + 17) * (y + 31))) >>> 0) % 256;
      const h2 = ((((x >> 1) * 1274126177 + (y >> 1) * 2654435761) ^ (x * 19 + y * 37)) >>> 0) % 256;
      const ridge =
        Math.sin((x / size) * Math.PI * 24) * 10 + Math.cos((y / size) * Math.PI * 20) * 8;
      const val = Math.max(0, Math.min(255, Math.round(118 + h1 * 0.26 + h2 * 0.2 + ridge)));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}

function createBranchTubeMesh(curve, startColorHex, endColorHex, radius, opacity) {
  const geo = new THREE.TubeGeometry(curve, 28, radius, 10, false);
  const uv = geo.attributes.uv;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const cStart = new THREE.Color(startColorHex);
  const cEnd = new THREE.Color(endColorHex);
  const cTmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const t = Math.max(0, Math.min(1, uv.getX(i)));
    cTmp.lerpColors(cStart, cEnd, t);
    colors[i * 3 + 0] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: endColorHex,
    emissiveIntensity: 0.26,
    roughness: 0.26,
    metalness: 0.2,
    transparent: true,
    opacity,
  });

  return new THREE.Mesh(geo, mat);
}

function getTierGeometry(kind, size) {
  switch (kind) {
    case 'critical':
      return new THREE.IcosahedronGeometry(size, 0);
    case 'high':
      return new THREE.TetrahedronGeometry(size * 1.15, 0);
    case 'module':
      return new THREE.BoxGeometry(size * 1.45, size * 1.45, size * 1.45);
    case 'cylinder':
      return new THREE.CylinderGeometry(size * 0.72, size * 0.92, size * 1.45, 14);
    default:
      return new THREE.SphereGeometry(size, 24, 18);
  }
}

export function AuthCanvas3D({ variant = 'login' }) {
  const panelRef = useRef(null);
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const panel = panelRef.current;
    const container = containerRef.current;
    if (!panel || !container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 760;
    const reducedMotion = getPrefersReducedMotion();
    const isMobile = width < 768;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(getOptimalPixelRatio(width));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.24 : 1.08;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.18, 8.8);
    camera.lookAt(0, 0, 0);

    // Balanced studio lighting for rough root gradient + glossy clearcoat child nodes
    scene.add(new THREE.AmbientLight(isDark ? 0xe2e8f0 : 0xffffff, isDark ? 1.55 : 2.15));
    const keyLight = new THREE.DirectionalLight(0xf8fafc, isDark ? 2.7 : 2.25);
    keyLight.position.set(8, 10, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x06b6d4, isDark ? 1.7 : 1.15);
    fillLight.position.set(-8, -6, 6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(isDark ? 0xc084fc : 0x818cf8, isDark ? 2.1 : 1.25, 25);
    rimLight.position.set(0, 6, -5);
    scene.add(rimLight);

    const rig = new THREE.Group();
    rig.position.y = height >= 560 ? 0.4 : 0.46;
    scene.add(rig);

    const clusterGroup = new THREE.Group();
    rig.add(clusterGroup);

    // ─── 1. CENTRAL CHANGED ROOT NODE (Anodized Satin-Rough Octahedron + Theme Gradient) ───
    const rootColorHex = isDark ? 0xf43f5e : 0xe11d48;
    const rootGeo = new THREE.OctahedronGeometry(0.54, 2);
    const rootPos = rootGeo.attributes.position;
    const rootCount = rootPos.count;
    const rootColors = new Float32Array(rootCount * 3);

    // Harmonized UI-linked gradient: Cyan -> Royal Indigo -> Impact Coral-Rose
    const cBottom = new THREE.Color(isDark ? 0x22d3ee : 0x0284c7);
    const cMid = new THREE.Color(isDark ? 0x6366f1 : 0x4f46e5);
    const cTop = new THREE.Color(isDark ? 0xf43f5e : 0xe11d48);
    const cWork = new THREE.Color();

    for (let i = 0; i < rootCount; i++) {
      const yNorm = Math.max(0, Math.min(1, (rootPos.getY(i) / 0.54 + 1) * 0.5));
      if (yNorm < 0.5) {
        cWork.lerpColors(cBottom, cMid, yNorm * 2);
      } else {
        cWork.lerpColors(cMid, cTop, (yNorm - 0.5) * 2);
      }
      rootColors[i * 3 + 0] = cWork.r;
      rootColors[i * 3 + 1] = cWork.g;
      rootColors[i * 3 + 2] = cWork.b;
    }
    rootGeo.setAttribute('color', new THREE.BufferAttribute(rootColors, 3));

    const roughTex = createRoughStructureTexture();
    const rootMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: isDark ? 0x312e81 : 0x1e1b4b,
      emissiveIntensity: isDark ? 0.22 : 0.08,
      roughness: isDark ? 0.64 : 0.68,
      metalness: 0.24,
      flatShading: true,
      bumpMap: roughTex,
      bumpScale: 0.026,
      roughnessMap: roughTex,
    });
    const rootMesh = new THREE.Mesh(rootGeo, rootMat);
    clusterGroup.add(rootMesh);

    // Crisp outer architectural facet cage around Root Node
    const cageGeo = new THREE.OctahedronGeometry(0.7, 0);
    const cageEdges = new THREE.EdgesGeometry(cageGeo);
    cageGeo.dispose();
    const cageMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x93c5fd : 0x4f46e5,
      transparent: true,
      opacity: isDark ? 0.45 : 0.36,
    });
    const rootCage = new THREE.LineSegments(cageEdges, cageMat);
    clusterGroup.add(rootCage);

    // Expanding horizontal Blast Radius Shockwave Ripple emanating from Root
    const shockGeo = new THREE.RingGeometry(0.56, 0.65, 56);
    const shockMat = new THREE.MeshBasicMaterial({
      color: rootColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const shockRing = new THREE.Mesh(shockGeo, shockMat);
    shockRing.rotation.x = -Math.PI / 2 + 0.22;
    clusterGroup.add(shockRing);

    // Inner 1-Hop boundary horizon ring inside cluster
    const hop1RingGeo = new THREE.TorusGeometry(1.62, 0.01, 10, 84);
    const hop1RingMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: 0.18,
    });
    const hop1Ring = new THREE.Mesh(hop1RingGeo, hop1RingMat);
    hop1Ring.rotation.set(1.18, 0.28, 0);
    clusterGroup.add(hop1Ring);

    // ─── 2. 1-HOP DIRECT & 2-HOP TRANSITIVE AST NODES + TUBE BRANCHES ───
    // Graded ChangeLens impact heatmap (Coral-Rose -> Amber -> Cyan) transitioning cleanly to cool downstream leaves
    const hop1Specs = [
      { pos: [1.46, 0.55, 0.39], kind: 'critical', size: 0.23, color: isDark ? 0xf43f5e : 0xe11d48 },
      { pos: [-1.38, 0.72, 0.41], kind: 'high', size: 0.24, color: isDark ? 0xf59e0b : 0xd97706 },
      { pos: [0.39, -1.2, 0.92], kind: 'module', size: 0.21, color: isDark ? 0x22d3ee : 0x0284c7 },
      { pos: [-1.0, -0.88, -0.82], kind: 'critical', size: 0.22, color: isDark ? 0xfb7185 : 0xe11d48 },
      { pos: [1.2, -0.39, -0.98], kind: 'high', size: 0.23, color: isDark ? 0xfbbf24 : 0xd97706 },
      { pos: [-0.2, 1.34, -0.72], kind: 'module', size: 0.21, color: isDark ? 0x38bdf8 : 0x0369a1 },
    ];

    const hop2Palette = isDark
      ? [0x38bdf8, 0x818cf8, 0x10b981, 0x22d3ee]
      : [0x0284c7, 0x4f46e5, 0x059669, 0x0891b2];
    const hop2Kinds = ['sphere', 'cylinder', 'sphere', 'module'];

    const animatedNodes = [];
    const pulses = [];
    const photonGeo = new THREE.SphereGeometry(0.052, 10, 10);
    const origin = new THREE.Vector3(0, 0, 0);

    const createJewelNodeMat = (hex) =>
      new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: isDark ? 0.26 : 0.12,
        roughness: 0.12,
        metalness: isDark ? 0.28 : 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        sheen: 0.35,
        iridescence: 0.72,
        iridescenceIOR: 1.38,
        specularIntensity: 1.0,
      });

    hop1Specs.forEach((spec, idx) => {
      const p1 = new THREE.Vector3(...spec.pos);
      const dir = p1.clone().normalize();
      const refAxis = Math.abs(dir.y) > 0.82 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const orthoA = new THREE.Vector3().crossVectors(dir, refAxis).normalize();
      const orthoB = new THREE.Vector3().crossVectors(dir, orthoA).normalize();

      // Root -> 1-Hop curved TubeGeometry branch
      const mid1 = p1
        .clone()
        .multiplyScalar(0.5)
        .addScaledVector(orthoA, 0.24)
        .addScaledVector(orthoB, -0.14);
      const curve1 = new THREE.CatmullRomCurve3([origin, mid1, p1]);
      const branch1 = createBranchTubeMesh(
        curve1,
        rootColorHex,
        spec.color,
        0.028,
        isDark ? 0.84 : 0.88
      );
      clusterGroup.add(branch1);

      // Travelling impact photon along Root -> Hop-1
      const photonMat1 = new THREE.MeshBasicMaterial({ color: spec.color });
      const photonMesh1 = new THREE.Mesh(photonGeo, photonMat1);
      clusterGroup.add(photonMesh1);
      pulses.push({
        curve: curve1,
        mesh: photonMesh1,
        speed: 0.36 + (idx % 3) * 0.05,
        offset: idx * 0.17,
      });

      // 1-Hop Jewel-Polished Node Mesh
      const nodeGeo1 = getTierGeometry(spec.kind, spec.size);
      const nodeMesh1 = new THREE.Mesh(nodeGeo1, createJewelNodeMat(spec.color));
      nodeMesh1.position.copy(p1);
      clusterGroup.add(nodeMesh1);
      animatedNodes.push({ mesh: nodeMesh1, speed: 0.45 + idx * 0.07 });

      // 2 Transitive Hop-2 File Leaf Nodes branching from each Hop-1 Node
      [
        { signA: 0.72, signB: 0.42, dist: 2.36 },
        { signA: -0.68, signB: -0.45, dist: 2.3 },
      ].forEach((fork, j) => {
        const leafColor = hop2Palette[(idx * 2 + j) % hop2Palette.length];
        const leafKind = hop2Kinds[(idx + j) % hop2Kinds.length];
        const leafDir = dir
          .clone()
          .multiplyScalar(0.86)
          .addScaledVector(orthoA, fork.signA * 0.56)
          .addScaledVector(orthoB, fork.signB * 0.56)
          .normalize();
        const p2 = leafDir.multiplyScalar(fork.dist);

        const mid2 = p1
          .clone()
          .lerp(p2, 0.5)
          .addScaledVector(orthoB, (j === 0 ? 1 : -1) * 0.16);
        const curve2 = new THREE.CatmullRomCurve3([p1, mid2, p2]);
        const branch2 = createBranchTubeMesh(
          curve2,
          spec.color,
          leafColor,
          0.017,
          isDark ? 0.72 : 0.78
        );
        clusterGroup.add(branch2);

        // One pulse photon per Hop-1 -> Hop-2 pair (keeps visual clean & lively)
        if (j === idx % 2) {
          const photonMat2 = new THREE.MeshBasicMaterial({ color: leafColor });
          const photonMesh2 = new THREE.Mesh(photonGeo, photonMat2);
          clusterGroup.add(photonMesh2);
          pulses.push({
            curve: curve2,
            mesh: photonMesh2,
            speed: 0.42,
            offset: (idx * 0.23 + 0.45) % 1,
          });
        }

        const nodeGeo2 = getTierGeometry(leafKind, 0.145);
        const nodeMesh2 = new THREE.Mesh(nodeGeo2, createJewelNodeMat(leafColor));
        nodeMesh2.position.copy(p2);
        clusterGroup.add(nodeMesh2);
        animatedNodes.push({ mesh: nodeMesh2, speed: -(0.35 + j * 0.14) });
      });
    });

    // ─── 3. SUBTLE SKY GEODESIC WIREFRAME CAGE ───
    const outerCageGeo = new THREE.IcosahedronGeometry(2.95, 1);
    const outerCageEdges = new THREE.EdgesGeometry(outerCageGeo);
    outerCageGeo.dispose();
    const outerCageMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x334155,
      transparent: true,
      opacity: isDark ? 0.16 : 0.18,
    });
    const outerCageWire = new THREE.LineSegments(outerCageEdges, outerCageMat);
    rig.add(outerCageWire);

    // ─── 4. FULL-CANVAS ATMOSPHERIC MICRO-STARS ───
    const ptCount = 95;
    const ptGeo = new THREE.BufferGeometry();
    const ptPos = new Float32Array(ptCount * 3);
    for (let i = 0; i < ptCount; i++) {
      ptPos[i * 3 + 0] = (Math.random() - 0.5) * 13;
      ptPos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      ptPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
    const ptMat = new THREE.PointsMaterial({
      color: isDark ? 0x7dd3fc : 0x0284c7,
      size: 0.05,
      transparent: true,
      opacity: isDark ? 0.5 : 0.4,
    });
    const particles = new THREE.Points(ptGeo, ptMat);
    scene.add(particles);

    // Interactive pointer parallax across the entire Left Half
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (e) => {
      const rect = panel.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.52;
      pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.36;
    };
    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };
    panel.addEventListener('pointermove', onPointerMove, { passive: true });
    panel.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // Responsive camera framing for AST cluster & outer sky geodesic cage
    const fitCameraToContainer = (w, h) => {
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const limitingFov = Math.min(vFov, hFov);
      const dist = 2.98 / Math.tan(limitingFov / 2);
      const minZ = h < 520 ? 9.6 : 8.6;
      camera.position.z = Math.max(minZ, dist);
      camera.updateProjectionMatrix();
      rig.position.y = h >= 560 ? 0.4 : 0.46;
    };
    fitCameraToContainer(width, height);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      fitCameraToContainer(w, h);
      renderer.setPixelRatio(getOptimalPixelRatio(w));
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation loop
    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;
    const tmpPoint = new THREE.Vector3();

    const renderFrame = (elapsed) => {
      // Whole 3D AST cluster moves calmly inside the surrounding orbital rings
      clusterGroup.rotation.y = elapsed * 0.2;
      clusterGroup.rotation.x = Math.sin(elapsed * 0.28) * 0.12;

      // Changed Root diamond & cage spin independently
      rootMesh.rotation.y = elapsed * 0.42;
      rootMesh.rotation.x = elapsed * 0.22;
      rootCage.rotation.y = -elapsed * 0.25;
      rootCage.rotation.z = elapsed * 0.16;
      hop1Ring.rotation.z = elapsed * 0.22;

      // Expanding Blast Radius shockwave pulse from Root core
      const phase = (elapsed * 0.42) % 1;
      const shockScale = 1.0 + phase * 2.55;
      shockRing.scale.set(shockScale, shockScale, shockScale);
      shockMat.opacity = (1 - phase) * (isDark ? 0.48 : 0.4);

      // Gentle spin on Hop-1 / Hop-2 jewel file nodes
      animatedNodes.forEach((n) => {
        n.mesh.rotation.y = elapsed * n.speed;
        n.mesh.rotation.x = elapsed * (n.speed * 0.55);
      });

      // Travelling impact photons flowing from Root -> 1-Hop -> 2-Hop along TubeGeometry curves
      pulses.forEach((p) => {
        const t = (elapsed * p.speed + p.offset) % 1;
        p.curve.getPointAt(t, tmpPoint);
        p.mesh.position.copy(tmpPoint);
      });

      // Outer geodesic wireframe enclosure slowly counter-rotates around the cluster
      outerCageWire.rotation.y = -elapsed * 0.11;
      outerCageWire.rotation.x = Math.sin(elapsed * 0.22) * 0.14;

      particles.rotation.y = elapsed * 0.035;
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

    renderFrame(0.9);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      panel.removeEventListener('pointermove', onPointerMove);
      panel.removeEventListener('pointerleave', onPointerLeave);
      resizeObserver.disconnect();
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, [isDark]);

  const isRegister = variant === 'register';

  return (
    <div
      ref={panelRef}
      className="relative w-full h-full min-h-[380px] sm:min-h-[420px] lg:min-h-screen overflow-hidden bg-gradient-to-br from-sky-100/80 via-slate-50 to-indigo-100/70 dark:from-[#040814] dark:via-[#071022] dark:to-[#0a1228] flex flex-col justify-between px-5 sm:px-8 xl:px-12 py-6 sm:py-8 select-none"
    >
      {/* Subtle Architectural Grid & Seamless Edge-to-Edge Atmospheric Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-35 dark:opacity-25 pointer-events-none" />
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] bg-rose-500/12 dark:bg-cyan-500/16 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[18%] right-[12%] w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] bg-indigo-500/15 dark:bg-indigo-500/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Minimal Status Strip (no heavy box framing) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-800 dark:text-cyan-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          AST ENGINE v1.0 • BLAST CLUSTER
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          Hover anywhere to tilt
        </span>
      </div>

      {/* Full-Half 3D WebGL Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Soft bottom vignette so editorial typography stays razor-sharp with zero boxed border */}
      <div className="absolute inset-x-0 bottom-0 h-44 sm:h-52 lg:h-64 bg-gradient-to-t from-slate-100/95 via-slate-50/55 to-transparent dark:from-[#040814]/95 dark:via-[#060d1c]/55 dark:to-transparent pointer-events-none z-[5]" />

      {/* Bottom Open Editorial Overlay */}
      <div className="relative z-10 mt-auto pt-28 sm:pt-36 lg:pt-16 max-w-lg">
        <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1.5 sm:mb-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{isRegister ? 'Multi-Language AST Graph' : 'Pre-Merge Intelligence'}</span>
        </div>

        <h2 className="text-xl sm:text-2xl xl:text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {isRegister
            ? 'Start Mapping Multi-Hop Impact in Seconds.'
            : 'Deterministic Pre-Merge Confidence.'}
        </h2>

        <p className="mt-2 sm:mt-2.5 text-xs xl:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {isRegister
            ? 'Analyze JavaScript, TypeScript, Python & Go dependencies via local CLI, GitHub PRs, or interactive 2D/3D blast graphs.'
            : 'Trace exact breaking symbol calls, inspect AI risk assessments, and simulate refactor safety before opening any PR.'}
        </p>

        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Tree-Sitter AST
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Zero Source Leak
          </span>
        </div>
      </div>
    </div>
  );
}
