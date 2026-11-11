import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
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
    camera.position.set(2.5, 1.9, 3.6);
    camera.lookAt(0, 0, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 1.5 : 2.1));
    const keyLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x0284c7, 2.2);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const rig = new THREE.Group();
    scene.add(rig);

    // 1. Outer architectural bounding wireframe cube
    const boxGeo = new THREE.BoxGeometry(1.72, 1.72, 1.72);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();
    const edgesMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x818cf8 : 0x334155,
      transparent: true,
      opacity: isDark ? 0.65 : 0.72,
    });
    const outerCube = new THREE.LineSegments(edgesGeo, edgesMat);
    rig.add(outerCube);

    // 2. Inner crystalline AST core + wireframe overlay
    const coreGeo = new THREE.IcosahedronGeometry(0.68, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0ea5e9 : 0x0284c7,
      emissive: isDark ? 0x0284c7 : 0x0369a1,
      emissiveIntensity: isDark ? 0.75 : 0.3,
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: isDark ? 0.55 : 0.65,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rig.add(coreMesh);

    const coreWireGeo = new THREE.EdgesGeometry(coreGeo);
    const coreWireMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x7dd3fc : 0x0c4a6e,
      transparent: true,
      opacity: 0.9,
    });
    const coreWire = new THREE.LineSegments(coreWireGeo, coreWireMat);
    coreMesh.add(coreWire);

    // 3. Oscillating laser scan slice plane + laser rim
    const scanGroup = new THREE.Group();
    const scanPlaneGeo = new THREE.PlaneGeometry(1.92, 1.92);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.22 : 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scanPlane.rotation.x = Math.PI / 2;
    scanGroup.add(scanPlane);

    const scanRimBox = new THREE.BoxGeometry(1.94, 0.03, 1.94);
    const scanRimGeo = new THREE.EdgesGeometry(scanRimBox);
    scanRimBox.dispose();
    const scanRimMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x38bdf8 : 0x0369a1,
    });
    const scanRim = new THREE.LineSegments(scanRimGeo, scanRimMat);
    scanGroup.add(scanRim);
    rig.add(scanGroup);

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
      rig.rotation.y = elapsed * 0.75;
      coreMesh.rotation.x = elapsed * 0.95;
      coreMesh.rotation.z = elapsed * 0.55;
      scanGroup.position.y = Math.sin(elapsed * 2.5) * 0.86;
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

    renderFrame(0.35);
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
      aria-label="Parsing AST graphs"
      className={`${className} relative select-none`}
    />
  );
}
