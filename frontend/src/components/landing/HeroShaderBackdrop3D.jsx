import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../../utils/threeHelpers.js';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float distToMouse = distance(uv, uMouse * 0.5 + 0.5);
    float mouseWave = exp(-distToMouse * 3.2) * sin(uTime * 2.2 - distToMouse * 8.0) * 0.65;

    float wave1 = sin(pos.x * 0.28 + uTime * 0.55) * cos(pos.y * 0.35 + uTime * 0.42) * 1.15;
    float wave2 = sin(pos.x * 0.52 - uTime * 0.38 + pos.y * 0.4) * 0.48;
    float elevation = wave1 + wave2 + mouseWave;

    pos.z += elevation;
    vElevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIsDark;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    // Edge vignette so shader dissolves cleanly into surrounding section background
    float edgeX = smoothstep(0.0, 0.22, vUv.x) * (1.0 - smoothstep(0.78, 1.0, vUv.x));
    float edgeY = smoothstep(0.0, 0.26, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
    float mask = edgeX * edgeY;

    // Subtle contour wireframe ribbons inside shader without requiring derivative extensions
    float gridX = 1.0 - smoothstep(0.0, 0.045, abs(fract(vUv.x * 24.0) - 0.5));
    float gridY = 1.0 - smoothstep(0.0, 0.045, abs(fract(vUv.y * 14.0) - 0.5));
    float line = max(gridX, gridY);

    float ridge = clamp((vElevation + 1.4) * 0.38, 0.0, 1.0);

    // Dark theme: deep cyan -> indigo aurora
    vec3 darkLow = vec3(0.03, 0.22, 0.42);
    vec3 darkHigh = vec3(0.22, 0.74, 0.97);
    vec3 darkAccent = vec3(0.51, 0.55, 0.97);
    vec3 darkCol = mix(darkLow, darkHigh, ridge);
    darkCol = mix(darkCol, darkAccent, sin(vUv.x * 3.14159 + uTime * 0.25) * 0.35 + 0.25);

    // Light theme: crisp sky cerulean -> azure slate wash (high contrast, zero washout)
    vec3 lightLow = vec3(0.38, 0.68, 0.92);
    vec3 lightHigh = vec3(0.01, 0.52, 0.78);
    vec3 lightAccent = vec3(0.31, 0.27, 0.90);
    vec3 lightCol = mix(lightLow, lightHigh, ridge);
    lightCol = mix(lightCol, lightAccent, sin(vUv.x * 3.14159 + uTime * 0.25) * 0.3 + 0.2);

    vec3 finalColor = mix(lightCol, darkCol, uIsDark);

    float fillAlpha = mix(0.075, 0.14, ridge) * (uIsDark > 0.5 ? 1.0 : 0.85);
    float lineAlpha = line * (uIsDark > 0.5 ? 0.24 : 0.16);
    float alpha = (fillAlpha + lineAlpha) * mask;

    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 0.42));
  }
`;

export function HeroShaderBackdrop3D() {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);
  const shaderUniformsRef = useRef(null);
  const particleMatRef = useRef(null);

  // Sync theme changes dynamically without tearing down the WebGL context
  useEffect(() => {
    isDarkRef.current = isDark;
    if (shaderUniformsRef.current) {
      shaderUniformsRef.current.uIsDark.value = isDark ? 1.0 : 0.0;
    }
    if (particleMatRef.current) {
      particleMatRef.current.color.setHex(isDark ? 0x38bdf8 : 0x0284c7);
      particleMatRef.current.opacity = isDark ? 0.42 : 0.34;
    }
  }, [isDark]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 620;
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

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, -1.8, 13.5);
    camera.lookAt(0, 0.4, 0);

    // 1. Custom GLSL undulating aurora wave mesh
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uIsDark: { value: isDarkRef.current ? 1.0 : 0.0 },
    };
    shaderUniformsRef.current = uniforms;

    const segsX = isMobile ? 42 : 76;
    const segsY = isMobile ? 22 : 38;
    const waveGeo = new THREE.PlaneGeometry(36, 19, segsX, segsY);
    const waveMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -0.52;
    waveMesh.position.set(0, 0.6, -1.5);
    scene.add(waveMesh);

    // 2. Subtle architectural AST particle dust
    const ptCount = isMobile ? 45 : 95;
    const ptGeo = new THREE.BufferGeometry();
    const ptPos = new Float32Array(ptCount * 3);
    const ptBaseY = new Float32Array(ptCount);
    for (let i = 0; i < ptCount; i++) {
      ptPos[i * 3 + 0] = (Math.random() - 0.5) * 28;
      ptBaseY[i] = (Math.random() - 0.5) * 12;
      ptPos[i * 3 + 1] = ptBaseY[i];
      ptPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));

    const ptMat = new THREE.PointsMaterial({
      color: isDarkRef.current ? 0x38bdf8 : 0x0284c7,
      size: isMobile ? 0.14 : 0.11,
      transparent: true,
      opacity: isDarkRef.current ? 0.42 : 0.34,
      depthWrite: false,
    });
    particleMatRef.current = ptMat;
    const particles = new THREE.Points(ptGeo, ptMat);
    scene.add(particles);

    // 3. Pointer parallax (subtle smoothed target)
    const targetMouse = new THREE.Vector2(0, 0);
    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 4. ResizeObserver
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

    // 5. Animation loop gated by viewport visibility & reduced-motion
    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;

    const renderFrame = (elapsed) => {
      uniforms.uTime.value = elapsed;
      uniforms.uMouse.value.lerp(targetMouse, 0.045);

      const posAttr = ptGeo.attributes.position;
      for (let i = 0; i < ptCount; i++) {
        posAttr.array[i * 3 + 1] = ptBaseY[i] + Math.sin(elapsed * 0.65 + i * 0.7) * 0.45;
      }
      posAttr.needsUpdate = true;

      waveMesh.rotation.z = uniforms.uMouse.value.x * 0.035;
      renderer.render(scene, camera);
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

    // Draw first frame immediately (essential when reducedMotion is enabled)
    renderFrame(0.6);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      timer.dispose();
      shaderUniformsRef.current = null;
      particleMatRef.current = null;
      disposeThreeResources(scene, renderer, null, container);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden"
    />
  );
}
