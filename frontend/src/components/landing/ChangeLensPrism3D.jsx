import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Sparkles, Move, Zap, ShieldAlert, GitBranch, RefreshCw } from 'lucide-react';

export function ChangeLensPrism3D() {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const shockwaveIntensity = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    // --- 1. SCENE, CAMERA, RENDERER ---
    const scene = new THREE.Scene();

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.25 : 1.15;

    // Ensure no stale canvas remains from previous renders or React StrictMode
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // --- 2. LIGHTING ---
    const ambientLight = new THREE.AmbientLight(isDark ? 0x0f172a : 0xffffff, isDark ? 1.6 : 2.4);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, isDark ? 4.5 : 3.2, 15);
    pointLightCyan.position.set(-4, 3, 4);
    scene.add(pointLightCyan);

    const pointLightIndigo = new THREE.PointLight(0x6366f1, isDark ? 4.0 : 2.8, 15);
    pointLightIndigo.position.set(4, -3, 3);
    scene.add(pointLightIndigo);

    const pointLightRose = new THREE.PointLight(0xf43f5e, isDark ? 3.5 : 2.2, 12);
    pointLightRose.position.set(3, 3, -2);
    scene.add(pointLightRose);

    // --- 3. PRISM GROUP (Central Anchor) ---
    const prismGroup = new THREE.Group();
    scene.add(prismGroup);

    // Outer Crystal (Faceted Octahedron Dual Pyramid)
    const crystalGeo = new THREE.OctahedronGeometry(1.65, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x1e293b : 0xe0f2fe,
      emissive: isDark ? 0x0284c7 : 0x0284c7,
      emissiveIntensity: isDark ? 0.28 : 0.22,
      roughness: 0.1,
      metalness: 0.15,
      transmission: 0.82, // Glass refractive transmission
      ior: 1.52, // Glass index of refraction
      thickness: 1.8,
      transparent: true,
      opacity: isDark ? 0.88 : 0.92,
      wireframe: false,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    prismGroup.add(crystalMesh);

    // Crystal Wireframe Cage (Gives sharp high-tech futuristic facets)
    const wireframeGeo = new THREE.WireframeGeometry(crystalGeo);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.75 : 0.85,
      linewidth: 2,
    });
    const wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
    prismGroup.add(wireframeMesh);

    // Inner Glowing Core (AST Nucleus)
    const coreGeo = new THREE.IcosahedronGeometry(0.65, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x818cf8,
      emissiveIntensity: isDark ? 1.4 : 1.0,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    prismGroup.add(coreMesh);

    // Orbital Gyro Ring (Rotates in counter-angle)
    const ringGeo = new THREE.TorusGeometry(2.35, 0.022, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x818cf8 : 0x6366f1,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    prismGroup.add(ringMesh);

    // Secondary Orbital Gyro Ring (Orthogonal tilt)
    const ringGeo2 = new THREE.TorusGeometry(2.65, 0.015, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: isDark ? 0x22d3ee : 0x0891b2,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.z = Math.PI / 5;
    prismGroup.add(ringMesh2);

    // --- 4. INCIDENT LASER BEAM (Entering from Left: "Incoming Code Diff") ---
    const laserCurve = new THREE.LineCurve3(
      new THREE.Vector3(-4.8, 1.8, 0),
      new THREE.Vector3(0, 0, 0)
    );
    const laserGeo = new THREE.TubeGeometry(laserCurve, 32, 0.038, 8, false);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    scene.add(laserMesh);

    // Incident Beam Entry Marker (Pulsing entry point)
    const entryMarkerGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const entryMarkerMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const entryMarker = new THREE.Mesh(entryMarkerGeo, entryMarkerMat);
    entryMarker.position.set(-4.8, 1.8, 0);
    scene.add(entryMarker);

    // --- 5. REFRACTED BLAST RADIUS BEAMS (Emerging from Right into Multi-Tiers) ---
    const spectrumData = [
      {
        target: new THREE.Vector3(3.6, 2.2, 0.4),
        color: 0xf43f5e, // Critical / Breaking (Rose)
        label: 'Tier 0: Root Mutation',
        tier: 'CRITICAL',
      },
      {
        target: new THREE.Vector3(4.1, 0.8, -0.6),
        color: 0xf59e0b, // Direct Consumer (Amber)
        label: 'Tier 1: Direct Consumer',
        tier: 'HIGH RISK',
      },
      {
        target: new THREE.Vector3(3.8, -0.9, 0.8),
        color: 0x06b6d4, // Transitive Route (Cyan)
        label: 'Tier 2: API Route',
        tier: 'TRANSITIVE',
      },
      {
        target: new THREE.Vector3(3.2, -2.3, -0.3),
        color: 0x10b981, // Added Symbol (Emerald)
        label: 'Tier 3: Client Component',
        tier: 'CLEAN',
      },
    ];

    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const beamMeshes = [];
    const nodeSpheres = [];

    spectrumData.forEach((spec) => {
      // Beam Tube
      const beamCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), spec.target);
      const beamGeo = new THREE.TubeGeometry(beamCurve, 24, 0.026, 8, false);
      const beamMat = new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.88,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      nodesGroup.add(beam);
      beamMeshes.push(beam);

      // Terminal Dependency Node (Glowing Sphere)
      const nodeGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: isDark ? 1.2 : 0.8,
        roughness: 0.2,
        metalness: 0.8,
      });
      const nodeSphere = new THREE.Mesh(nodeGeo, nodeMat);
      nodeSphere.position.copy(spec.target);
      nodesGroup.add(nodeSphere);

      // Outer Halo Ring on Node
      const haloGeo = new THREE.RingGeometry(0.24, 0.3, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: spec.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(spec.target);
      halo.lookAt(camera.position);
      nodesGroup.add(halo);

      nodeSpheres.push({ mesh: nodeSphere, halo, targetPos: spec.target, baseColor: spec.color });
    });

    // --- 6. BACKGROUND AST CODE PARTICLE CLOUD ---
    const particlesCount = 140;
    const particlePositions = new Float32Array(particlesCount * 3);
    const particleColors = new Float32Array(particlesCount * 3);

    const palette = [
      new THREE.Color(isDark ? 0x38bdf8 : 0x0284c7),
      new THREE.Color(isDark ? 0x818cf8 : 0x4f46e5),
      new THREE.Color(isDark ? 0xf43f5e : 0xe11d48),
      new THREE.Color(isDark ? 0x34d399 : 0x059669),
    ];

    for (let i = 0; i < particlesCount; i++) {
      // Scatter particles in a cylindrical sphere volume around the prism
      const radius = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      particlePositions[i * 3] = radius * Math.cos(phi) * Math.sin(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi) * Math.cos(theta);

      const col = palette[Math.floor(Math.random() * palette.length)];
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: isDark ? 0.065 : 0.075,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.75 : 0.85,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // --- 7. MOUSE INTERACTION & DAMPING (SCOPED TO CARD ONLY) ---
    const mouse = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };
    let isPointerInside = false;

    const handleMouseEnter = () => {
      isPointerInside = true;
    };

    const handleMouseMove = (event) => {
      if (!isPointerInside) return;
      const rect = card.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;

      targetRotation.y = mouse.x * 0.85;
      targetRotation.x = -mouse.y * 0.65;
    };

    const handleMouseLeave = () => {
      isPointerInside = false;
      targetRotation.x = 0;
      targetRotation.y = 0;
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    // --- 8. RESIZE OBSERVER ---
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- 9. ANIMATION LOOP ---
    let animationFrameId;
    const timer = new THREE.Timer();

    const animate = (timestamp) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const elapsedTime = timer.getElapsed();

      // Conditional Movement:
      // When mouse is inside the box -> tilt dynamically with user's cursor
      // When mouse is outside the box -> regular natural organic idle floating movement
      if (isPointerInside) {
        prismGroup.rotation.y += (targetRotation.y - prismGroup.rotation.y) * 0.06;
        prismGroup.rotation.x += (targetRotation.x - prismGroup.rotation.x) * 0.06;
      } else {
        // Natural regular idle rotation loop (never responds to mouse outside box)
        const naturalIdleY = Math.sin(elapsedTime * 0.75) * 0.32;
        const naturalIdleX = Math.cos(elapsedTime * 0.55) * 0.14;
        prismGroup.rotation.y += (naturalIdleY - prismGroup.rotation.y) * 0.04;
        prismGroup.rotation.x += (naturalIdleX - prismGroup.rotation.x) * 0.04;
      }

      // Natural subtle continuous vertical floating & axial roll
      prismGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12;
      prismGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.08;

      // Real-time dynamic shockwave pulse (interpolated without remounting scene)
      if (shockwaveIntensity.current > 0.01) {
        shockwaveIntensity.current *= 0.91; // Smooth damping
        const impulseScale = 1 + shockwaveIntensity.current * 0.35;
        prismGroup.scale.set(impulseScale, impulseScale, impulseScale);
        ringMesh.rotation.z += shockwaveIntensity.current * 0.08;
        ringMesh2.rotation.y += shockwaveIntensity.current * 0.08;
      } else if (prismGroup.scale.x !== 1) {
        prismGroup.scale.set(1, 1, 1);
      }

      // Inner Core Independent Counter-Spin
      coreMesh.rotation.x = elapsedTime * 0.6;
      coreMesh.rotation.y = elapsedTime * 0.9;

      // Orbital Gyro Rings Dynamic Precession
      ringMesh.rotation.z += 0.008;
      ringMesh2.rotation.y += 0.006;

      // Laser entry pulsation
      const laserPulse = (Math.sin(elapsedTime * 4.0) + 1) * 0.5;
      laserMat.opacity = 0.75 + laserPulse * 0.25;
      entryMarker.scale.setScalar(1 + laserPulse * 0.35);

      // Node Halo billboard orientation and pulsing
      nodeSpheres.forEach((node, idx) => {
        const offsetPulse = (Math.sin(elapsedTime * 3.5 + idx * 1.2) + 1) * 0.5;
        node.mesh.scale.setScalar(1 + offsetPulse * 0.15);
        node.halo.scale.setScalar(1 + offsetPulse * 0.25);
        node.halo.lookAt(camera.position);
      });

      // Background particle slow drift
      particleSystem.rotation.y = elapsedTime * 0.04;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      timer.dispose();
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();

      // Deep recursive disposal of all geometries and materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark]);

  const triggerPulse = () => {
    shockwaveIntensity.current = 1.0;
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full rounded-3xl bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/30 p-3.5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-cyan-950/20 overflow-hidden group transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Laser beam ambient backdrop glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info Banner above 3D Scene */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800/80 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shadow-inner shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-mono">
                Interactive 3D Simulation
              </span>
              <span className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${isHovered ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                <Move className={`w-3 h-3 ${isHovered ? 'text-cyan-600 dark:text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{isHovered ? 'Hover Active • Tilting 3D View' : 'Hover inside box to tilt 3D view'}</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
              ChangeLens 3D Blast Radius Refraction Prism
            </h3>
          </div>
        </div>

        {/* Trigger Pulse Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={triggerPulse}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer group active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>Pulse Shockwave</span>
          </button>
        </div>
      </div>

      {/* ─── WEBGL 3D CANVAS VIEWPORT ─────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full h-[320px] sm:h-[400px] lg:h-[440px] relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none bg-gradient-to-b from-slate-100/70 via-sky-50/40 to-slate-100/80 dark:from-slate-950/60 dark:via-[#09101f]/80 dark:to-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 shadow-inner"
      >
        {/* Optical Simulation HUD Overlays */}
        {/* Left Side: Incident Diff Entry */}
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 p-2 sm:p-2.5 rounded-xl bg-white/95 dark:bg-[#0d1627]/95 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md max-w-[170px] sm:max-w-[210px] text-left pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-0.5 sm:mb-1">
            <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Incident Code Diff</span>
          </div>
          <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
            server/models/user.js
          </div>
          <p className="hidden xs:block text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
            Single modified export entering the optical AST parser.
          </p>
        </div>

        {/* Right Side: Refracted Multi-Tier Spectrum */}
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 z-10 p-2 sm:p-2.5 rounded-xl bg-white/95 dark:bg-[#0d1627]/95 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-md max-w-[180px] sm:max-w-[240px] text-left pointer-events-none space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-bold">
              <GitBranch className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Blast Radius
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[9px] sm:text-[10px] font-bold">4 TIERS</span>
          </div>

          <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[10px] font-mono">
            <div className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">Tier 0: Root</span>
              </span>
              <span className="text-rose-700 dark:text-rose-400 font-bold shrink-0">Breaking</span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">Tier 1: Controller</span>
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-bold shrink-0">High</span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 shrink-0" />
                <span className="truncate">Tier 2: Routes</span>
              </span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold shrink-0">Transitive</span>
            </div>
            <div className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Tier 3: Styles</span>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">Clean</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Subtitle Caption */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-slate-600 dark:text-slate-400 text-xs gap-2">
        <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 text-center sm:text-left">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
          Real-time WebGL 3D engine refracting commit AST differences into downstream consumer nodes.
        </span>
        <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 font-bold shrink-0">
          100% Client-side 60 FPS
        </span>
      </div>
    </div>
  );
}
