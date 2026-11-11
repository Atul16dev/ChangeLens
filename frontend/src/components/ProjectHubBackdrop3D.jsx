import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

const SILK_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Fluid liquid-silk undulation responsive to pointer hover
    float swellA = sin(pos.x * 0.36 + uTime * 0.42 + uMouse.x * 1.1) * 0.52;
    float swellB = cos(pos.y * 0.55 - uTime * 0.34 + uMouse.y * 0.9) * 0.38;
    float swellC = sin((pos.x * 0.25 - pos.y * 0.42) + uTime * 0.28) * 0.28;

    float displacement = swellA + swellB + swellC;
    pos.z += displacement;
    vElevation = displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const SILK_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uIsDark;
  varying vec2 vUv;
  varying float vElevation;

  // Crisp glowing flowing ribbon lines over clean obsidian black
  float silkCaustic(vec2 uv, float t, vec2 cursor) {
    vec2 p = uv * vec2(2.8, 1.9);
    p += cursor * 0.14;
    float w1 = sin(p.x * 1.45 + sin(p.y * 1.7 + t * 0.38) + t * 0.24);
    float w2 = cos(p.y * 2.1 - sin(p.x * 1.35 - t * 0.31) - t * 0.19);
    float ribbon = 1.0 - abs(sin((w1 + w2) * 1.15));
    return pow(clamp(ribbon, 0.0, 1.0), 3.6);
  }

  void main() {
    float silkPrimary = silkCaustic(vUv, uTime, uMouse);
    float silkSecondary = silkCaustic(vUv * 1.28 + vec2(0.35, -0.22), -uTime * 0.75, uMouse * 0.6);
    float combinedSilk = clamp(silkPrimary * 0.70 + silkSecondary * 0.48, 0.0, 1.0);
    float ridgeGlow = smoothstep(-0.32, 0.85, vElevation);

    // Dark Mode over Obsidian Black: Luminous electric cyan -> indigo -> amethyst lines
    vec3 darkCyan = vec3(0.16, 0.80, 1.00);
    vec3 darkIndigo = vec3(0.42, 0.44, 0.98);
    vec3 darkRose = vec3(0.78, 0.44, 0.98);
    vec3 darkColor = mix(darkIndigo, darkCyan, clamp(vUv.x * 0.65 + silkPrimary * 0.55, 0.0, 1.0));
    darkColor = mix(darkColor, darkRose, clamp(silkSecondary * 0.52 + (1.0 - vUv.y) * 0.25, 0.0, 1.0));

    // Light Mode: Translucent ice sky -> soft iris -> pastel quartz
    vec3 lightSky = vec3(0.05, 0.55, 0.90);
    vec3 lightIris = vec3(0.36, 0.38, 0.92);
    vec3 lightRose = vec3(0.84, 0.36, 0.72);
    vec3 lightColor = mix(lightSky, lightIris, clamp(vUv.x * 0.6 + ridgeGlow * 0.4, 0.0, 1.0));
    lightColor = mix(lightColor, lightRose, clamp(silkSecondary * 0.45, 0.0, 1.0));

    vec3 finalColor = mix(lightColor, darkColor, uIsDark);

    // Soft border vignette only so outer banner edges stay clean without interior haze
    float edgeX = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float edgeY = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
    float edgeFade = edgeX * edgeY;

    float themeStrength = mix(0.20, 0.40, uIsDark);
    float alpha = combinedSilk * themeStrength * edgeFade * (0.76 + 0.24 * ridgeGlow);

    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 0.46));
  }
`;

const GALAXY_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aPhase;
  attribute float aTwinkleSpeed;
  attribute float aFlare;
  attribute float aColorMix;
  attribute float aEnergy;
  varying float vTwinkle;
  varying float vFlare;
  varying float vColorMix;
  varying float vEnergy;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Sparkling specular shimmer + extra shine peak when scattered on hover
    float wave = 0.72 + 0.28 * sin(uTime * aTwinkleSpeed + aPhase);
    float glint = pow(max(0.0, sin(uTime * aTwinkleSpeed * 0.65 + aPhase * 1.3)), 4.0) * 0.42;
    vTwinkle = wave + glint + aEnergy * 0.45;
    vFlare = aFlare;
    vColorMix = aColorMix;
    vEnergy = aEnergy;

    float depthScale = 11.4 / max(2.2, -mvPosition.z);
    float energyScale = 1.0 + aEnergy * 0.22;
    gl_PointSize = aSize * uPixelRatio * depthScale * (0.90 + 0.22 * wave) * energyScale;
  }
`;

const GALAXY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsDark;
  varying float vTwinkle;
  varying float vFlare;
  varying float vColorMix;
  varying float vEnergy;

  vec3 galaxyPalette(float t, float darkMode) {
    // Dark Mode: Brilliant diamond white, glacier cyan, cobalt indigo, nebula amethyst
    vec3 darkA = vec3(0.58, 0.94, 1.00);
    vec3 darkB = vec3(0.97, 0.99, 1.00);
    vec3 darkC = vec3(0.56, 0.64, 1.00);
    vec3 darkD = vec3(0.94, 0.58, 1.00);

    vec3 darkCol = mix(darkA, darkB, smoothstep(0.0, 0.35, t));
    darkCol = mix(darkCol, darkC, smoothstep(0.32, 0.68, t));
    darkCol = mix(darkCol, darkD, smoothstep(0.65, 1.0, t));

    // Light Mode: Crisp saturated cyan, cerulean sapphire, royal indigo, violet
    vec3 lightA = vec3(0.01, 0.52, 0.84);
    vec3 lightB = vec3(0.06, 0.66, 0.94);
    vec3 lightC = vec3(0.28, 0.34, 0.88);
    vec3 lightD = vec3(0.66, 0.24, 0.86);

    vec3 lightCol = mix(lightA, lightB, smoothstep(0.0, 0.35, t));
    lightCol = mix(lightCol, lightC, smoothstep(0.32, 0.68, t));
    lightCol = mix(lightCol, lightD, smoothstep(0.65, 1.0, t));

    return mix(lightCol, darkCol, darkMode);
  }

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float d = length(centered) * 2.0;
    if (d > 1.0) discard;

    // Crisp dotted specular core + bright inner gem gleam + subtle diamond twinkle
    float core = exp(-d * d * 24.0) * 1.50;
    float gleam = exp(-d * d * 7.5) * 0.65;
    float softSpark = max(
      exp(-abs(centered.x) * 34.0) * exp(-abs(centered.y) * 14.0),
      exp(-abs(centered.y) * 34.0) * exp(-abs(centered.x) * 14.0)
    ) * vFlare * 0.42;

    float intensity = clamp(core + gleam + softSpark, 0.0, 1.55);
    vec3 baseCol = galaxyPalette(vColorMix, uIsDark);

    vec3 specularWhite = vec3(1.0);
    vec3 finalCol = mix(baseCol, specularWhite, clamp(core * mix(0.30, 0.88, uIsDark) + vEnergy * 0.32, 0.0, 1.0));

    float themeAlpha = mix(0.84, 1.0, uIsDark);
    float alpha = clamp(intensity * vTwinkle * themeAlpha, 0.0, 1.0);
    if (alpha < 0.02) discard;

    gl_FragColor = vec4(finalCol, alpha);
  }
`;

const CAMERA_FOV = 40;
const CAMERA_Z = 10.0;
const HALF_TAN_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));

/** Create the sparkling dotted galaxy particles with randomized scatter vectors. */
function createGalaxyParticleSystem(count, pixelRatio, initialIsDark) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkleSpeeds = new Float32Array(count);
  const flares = new Float32Array(count);
  const colorMixes = new Float32Array(count);
  const energies = new Float32Array(count);

  const meta = {
    count,
    normX: new Float32Array(count),
    normY: new Float32Array(count),
    baseZ: new Float32Array(count),
    baseVx: new Float32Array(count),
    baseVy: new Float32Array(count),
    dragVx: new Float32Array(count),
    dragVy: new Float32Array(count),
    swirlBias: new Float32Array(count),
    randAngle: new Float32Array(count),
    randSpeed: new Float32Array(count),
    phase: phases,
  };

  for (let i = 0; i < count; i++) {
    const nx = (Math.random() * 2 - 1) * 1.05;
    const bandBias = Math.random() < 0.65 ? nx * 0.16 + (Math.random() - 0.5) * 0.96 : (Math.random() * 2 - 1) * 1.02;
    const ny = Math.max(-1.04, Math.min(1.04, bandBias));
    const bz = -3.3 + Math.random() * 2.8;

    meta.normX[i] = nx;
    meta.normY[i] = ny;
    meta.baseZ[i] = bz;

    meta.baseVx[i] = 0.0045 + Math.random() * 0.0085;
    meta.baseVy[i] = (Math.random() - 0.5) * 0.004;
    meta.swirlBias[i] = (Math.random() - 0.5) * 1.15;
    meta.randAngle[i] = Math.random() * Math.PI * 2;
    meta.randSpeed[i] = 0.65 + Math.random() * 0.95;

    const isBrightStar = Math.random() < 0.25;
    sizes[i] = isBrightStar ? 10.5 + Math.random() * 4.5 : 5.0 + Math.random() * 5.8;
    phases[i] = Math.random() * Math.PI * 2;
    twinkleSpeeds[i] = 1.2 + Math.random() * 2.2;
    flares[i] = isBrightStar ? 0.8 + Math.random() * 0.4 : 0.0;
    colorMixes[i] = Math.random();
    energies[i] = 0.0;

    positions[i * 3 + 0] = nx * 6.0;
    positions[i * 3 + 1] = ny * 2.2;
    positions[i * 3 + 2] = bz;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
  geo.setAttribute('aFlare', new THREE.BufferAttribute(flares, 1));
  geo.setAttribute('aColorMix', new THREE.BufferAttribute(colorMixes, 1));
  geo.setAttribute('aEnergy', new THREE.BufferAttribute(energies, 1));

  const uniforms = {
    uTime: { value: 0 },
    uIsDark: { value: initialIsDark ? 1.0 : 0.0 },
    uPixelRatio: { value: pixelRatio },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: GALAXY_VERTEX_SHADER,
    fragmentShader: GALAXY_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  return { points, geo, mat, uniforms, meta, positions, energies };
}

/**
 * Advance cosmic drift and slow-motion random scatter physics when hovered.
 * Dots disperse in varied random directions at comfortable speed and settle where they scatter.
 */
function stepGalaxyPhysics(galaxy, elapsed, dt, aspect, pointerState, snapIdle) {
  const { meta, positions, energies, geo } = galaxy;
  const count = meta.count;
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const frameNorm = safeDt * 60;
  const viscousDecay = Math.pow(0.955, frameNorm);
  const hoverStrength = pointerState.activeSmooth;
  const repelRadius = 2.45;

  for (let i = 0; i < count; i++) {
    const bz = meta.baseZ[i];
    const distFromCam = CAMERA_Z - bz;
    const halfH = HALF_TAN_FOV * distFromCam;
    const halfW = halfH * aspect;

    if (snapIdle) {
      meta.dragVx[i] = 0;
      meta.dragVy[i] = 0;
      energies[i] = 0;
      positions[i * 3 + 0] = meta.normX[i] * halfW;
      positions[i * 3 + 1] = meta.normY[i] * halfH;
      positions[i * 3 + 2] = bz;
      continue;
    }

    const wx = meta.normX[i] * halfW;
    const wy = meta.normY[i] * halfH;

    let energyTarget = 0;
    if (hoverStrength > 0.01) {
      const targetX = pointerState.normX * halfW;
      const targetY = pointerState.normY * halfH;
      const dx = wx - targetX;
      const dy = wy - targetY;
      const distSq = dx * dx + dy * dy;

      if (distSq < repelRadius * repelRadius) {
        const dist = Math.max(0.10, Math.sqrt(distSq));
        const falloff = 1 - dist / repelRadius;
        const smoothForce = Math.pow(falloff, 1.45) * hoverStrength;

        const invD = 1 / dist;
        const dirX = dx * invD;
        const dirY = dy * invD;
        const swirl = meta.swirlBias[i];

        // Blend radial away + per-particle evolving random angle + tangential swirl so dots scatter unpredictably
        const rAng = meta.randAngle[i] + elapsed * 0.4 * swirl;
        const rDirX = Math.cos(rAng);
        const rDirY = Math.sin(rAng);

        const scatterX = dirX * 0.42 + rDirX * 0.58 - dirY * swirl * 0.35;
        const scatterY = dirY * 0.42 + rDirY * 0.58 + dirX * swirl * 0.35;

        const accelScale = 9.8 * meta.randSpeed[i] * smoothForce * safeDt;
        const wakeScale = 4.2 * smoothForce * safeDt;

        meta.dragVx[i] += scatterX * accelScale + pointerState.smoothVelX * wakeScale;
        meta.dragVy[i] += scatterY * accelScale + pointerState.smoothVelY * wakeScale;
        energyTarget = Math.min(1.0, smoothForce * 1.25);
      }
    }

    // Clamp max slow-mo dispersion speed and coast softly via viscous damping (zero snap-back)
    meta.dragVx[i] = THREE.MathUtils.clamp(meta.dragVx[i] * viscousDecay, -2.35, 2.35);
    meta.dragVy[i] = THREE.MathUtils.clamp(meta.dragVy[i] * viscousDecay, -2.35, 2.35);

    const waveY = Math.sin(elapsed * 0.35 + meta.phase[i]) * 0.0045;
    meta.normX[i] += (meta.baseVx[i] + meta.dragVx[i] / Math.max(1.0, halfW)) * safeDt;
    meta.normY[i] += (meta.baseVy[i] + waveY + meta.dragVy[i] / Math.max(1.0, halfH)) * safeDt;

    if (meta.normX[i] > 1.07) meta.normX[i] -= 2.14;
    else if (meta.normX[i] < -1.07) meta.normX[i] += 2.14;
    if (meta.normY[i] > 1.07) meta.normY[i] -= 2.14;
    else if (meta.normY[i] < -1.07) meta.normY[i] += 2.14;

    energies[i] += (energyTarget - energies[i]) * Math.min(1.0, safeDt * 6.0);

    positions[i * 3 + 0] = meta.normX[i] * halfW;
    positions[i * 3 + 1] = meta.normY[i] * halfH;
    positions[i * 3 + 2] = bz;
  }

  geo.attributes.position.needsUpdate = true;
  geo.attributes.aEnergy.needsUpdate = true;
}

/**
 * Spatial 3D ambient backdrop for the ProjectHub hero greeting card.
 * Keeps responsive flowing silk color lines while allowing shiny dotted galaxy
 * stardust to randomly scatter in smooth slow motion on hover.
 */
export function ProjectHubBackdrop3D() {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);
  const renderThemeFrameRef = useRef(null);

  useEffect(() => {
    isDarkRef.current = isDark;
    if (renderThemeFrameRef.current) {
      renderThemeFrameRef.current();
    }
  }, [isDark]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 360;
    const reducedMotion = getPrefersReducedMotion();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      return undefined;
    }

    const initialPixelRatio = getOptimalPixelRatio(width);
    renderer.setPixelRatio(initialPixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    let currentAspect = width / Math.max(height, 1);
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, currentAspect, 0.1, 80);
    camera.position.set(0, 0, CAMERA_Z);

    // Layer 1: Responsive shiny wave of color lines
    const isMobile = width < 640;
    const silkUniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uIsDark: { value: isDarkRef.current ? 1.0 : 0.0 },
    };

    const silkGeo = new THREE.PlaneGeometry(48, 18, isMobile ? 36 : 64, isMobile ? 18 : 32);
    const silkMat = new THREE.ShaderMaterial({
      vertexShader: SILK_VERTEX_SHADER,
      fragmentShader: SILK_FRAGMENT_SHADER,
      uniforms: silkUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const silkMesh = new THREE.Mesh(silkGeo, silkMat);
    silkMesh.position.set(0, 0, -4.6);
    scene.add(silkMesh);

    // Layer 2: Crisp shiny dotted galaxy particles with slow-mo random hover scatter
    const particleCount = isMobile ? 95 : 175;
    const galaxy = createGalaxyParticleSystem(particleCount, initialPixelRatio, isDarkRef.current);
    scene.add(galaxy.points);

    const targetMouse = new THREE.Vector2(0, 0);
    const currentMouse = new THREE.Vector2(0, 0);
    const pointerState = {
      normX: 0,
      normY: 0,
      prevNormX: 0,
      prevNormY: 0,
      rawVelX: 0,
      rawVelY: 0,
      smoothVelX: 0,
      smoothVelY: 0,
      isInside: false,
      activeSmooth: 0,
    };

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const inside = nx >= -1.04 && nx <= 1.04 && ny >= -1.04 && ny <= 1.04;
      const wasInside = pointerState.isInside;
      pointerState.isInside = inside;

      if (inside) {
        const clampedX = Math.max(-1, Math.min(1, nx));
        const clampedY = Math.max(-1, Math.min(1, ny));
        pointerState.prevNormX = wasInside ? pointerState.normX : clampedX;
        pointerState.prevNormY = wasInside ? pointerState.normY : clampedY;
        pointerState.normX = clampedX;
        pointerState.normY = clampedY;

        pointerState.rawVelX = THREE.MathUtils.clamp((pointerState.normX - pointerState.prevNormX) * 4.5, -1.5, 1.5);
        pointerState.rawVelY = THREE.MathUtils.clamp((pointerState.normY - pointerState.prevNormY) * 2.8, -1.5, 1.5);

        targetMouse.x = pointerState.normX;
        targetMouse.y = pointerState.normY;
      } else {
        targetMouse.set(0, 0);
      }
    };

    const onPointerLeaveWindow = () => {
      pointerState.isInside = false;
      targetMouse.set(0, 0);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', onPointerLeaveWindow, { passive: true });
    document.addEventListener('mouseleave', onPointerLeaveWindow, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      currentAspect = w / Math.max(h, 1);
      camera.aspect = currentAspect;
      camera.updateProjectionMatrix();
      const pr = getOptimalPixelRatio(w);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h);
      galaxy.uniforms.uPixelRatio.value = pr;
    });
    resizeObserver.observe(container);

    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;
    let smoothTheme = isDarkRef.current ? 1.0 : 0.0;
    let lastElapsed = 0;

    const renderFrame = (elapsed, snapState = false) => {
      const dt = snapState ? 0 : Math.max(0.001, elapsed - lastElapsed);
      lastElapsed = elapsed;

      const themeTarget = isDarkRef.current ? 1.0 : 0.0;
      smoothTheme = snapState
        ? themeTarget
        : THREE.MathUtils.lerp(smoothTheme, themeTarget, 0.08);

      silkUniforms.uIsDark.value = smoothTheme;
      silkUniforms.uTime.value = elapsed;
      currentMouse.lerp(targetMouse, 0.05);
      silkUniforms.uMouse.value.copy(currentMouse);

      pointerState.activeSmooth += ((pointerState.isInside ? 1 : 0) - pointerState.activeSmooth) * 0.12;
      pointerState.smoothVelX += (pointerState.rawVelX - pointerState.smoothVelX) * 0.18;
      pointerState.smoothVelY += (pointerState.rawVelY - pointerState.smoothVelY) * 0.18;
      pointerState.rawVelX *= 0.80;
      pointerState.rawVelY *= 0.80;

      galaxy.uniforms.uIsDark.value = smoothTheme;
      galaxy.uniforms.uTime.value = elapsed;
      stepGalaxyPhysics(galaxy, elapsed, dt, currentAspect, pointerState, snapState);

      renderer.render(scene, camera);
    };

    renderThemeFrameRef.current = () => {
      if (reducedMotion || !isVisible) {
        renderFrame(lastElapsed, true);
      }
    };

    const tick = (timestamp) => {
      if (!isVisible || reducedMotion) {
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

    // Draw initial frame immediately (supports reduced motion as well)
    renderFrame(0, true);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeaveWindow);
      document.removeEventListener('mouseleave', onPointerLeaveWindow);
      renderThemeFrameRef.current = null;
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden rounded-3xl z-0"
    />
  );
}
