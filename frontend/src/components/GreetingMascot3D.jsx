import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';

/** Static accessible SVG fallback matching the white teddy mascot when WebGL is unavailable. */
function WhiteTeddyFallbackSvg() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="w-full h-full drop-shadow-[0_3px_8px_rgba(15,23,42,0.16)]"
      aria-hidden="true"
    >
      {/* Outer white ears */}
      <circle cx="20" cy="21" r="10.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="60" cy="21" r="10.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
      {/* Soft sakura inner ears */}
      <circle cx="20" cy="21" r="6" fill="#fbcfe8" />
      <circle cx="60" cy="21" r="6" fill="#fbcfe8" />
      {/* Snowy white rounded head */}
      <ellipse cx="40" cy="43" rx="26" ry="23.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
      {/* Muzzle & rosy cheeks */}
      <ellipse cx="40" cy="48.5" rx="11.5" ry="8.5" fill="#ffffff" />
      <ellipse cx="24" cy="46.5" rx="4.6" ry="2.8" fill="#fb7185" opacity="0.82" />
      <ellipse cx="56" cy="46.5" rx="4.6" ry="2.8" fill="#fb7185" opacity="0.82" />
      {/* Glossy eyes & catchlights */}
      <circle cx="30" cy="38.5" r="3.8" fill="#0f172a" />
      <circle cx="50" cy="38.5" r="3.8" fill="#0f172a" />
      <circle cx="28.7" cy="37.1" r="1.35" fill="#ffffff" />
      <circle cx="48.7" cy="37.1" r="1.35" fill="#ffffff" />
      {/* Cute nose & happy smile */}
      <ellipse cx="40" cy="44" rx="4.2" ry="2.9" fill="#1e293b" />
      <path
        d="M34.2 50 Q40 56.2 45.8 50"
        fill="none"
        stroke="#1e293b"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="53.6" rx="2.6" ry="1.8" fill="#f43f5e" />
      {/* Little waving paw */}
      <circle cx="63.5" cy="61" r="6.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
      <circle cx="63.5" cy="61.2" r="3.4" fill="#fbcfe8" />
    </svg>
  );
}

/**
 * Build a stylized, cute 3D white plush teddy-bear mascot head with articulating ears,
 * eyebrows, glossy catchlight eyes, rosy cheeks, curved smile, and waving paw.
 */
function createTeddyCharacter() {
  const root = new THREE.Group();
  const headGroup = new THREE.Group();
  root.add(headGroup);

  const plushMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f7fb,
    roughness: 0.68,
    metalness: 0.02,
    sheen: 0.85,
    sheenRoughness: 0.50,
    sheenColor: 0xe0f2fe,
  });

  const muzzleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.0,
    sheen: 0.6,
    sheenColor: 0xf1f5f9,
  });

  const innerEarMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbcfe8,
    roughness: 0.72,
    metalness: 0.0,
    sheen: 0.55,
    sheenColor: 0xfdf2f8,
  });

  const noseMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.14,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const eyeBlackMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b101b,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const eyeSparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    roughness: 0.62,
    metalness: 0.0,
  });

  const browMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.60,
    metalness: 0.0,
  });

  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    roughness: 0.45,
    metalness: 0.0,
  });

  // Main chubby head
  const headGeo = new THREE.SphereGeometry(0.92, 36, 28);
  const headMesh = new THREE.Mesh(headGeo, plushMat);
  headMesh.scale.set(1.07, 0.98, 0.96);
  headGroup.add(headMesh);

  // Cute round ears with soft pastel pink inner pads
  const outerEarGeo = new THREE.SphereGeometry(0.35, 24, 18);
  const innerEarGeo = new THREE.SphereGeometry(0.20, 20, 14);
  const ears = [];

  for (const side of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.72, 0.70, -0.06);

    const outerEar = new THREE.Mesh(outerEarGeo, plushMat);
    outerEar.scale.set(1.0, 1.0, 0.70);
    earPivot.add(outerEar);

    const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEar.position.set(0, 0, 0.12);
    innerEar.scale.set(1.0, 1.0, 0.55);
    earPivot.add(innerEar);

    headGroup.add(earPivot);
    ears.push({ pivot: earPivot, side, baseZ: earPivot.rotation.z });
  }

  // Soft snow-white snout/muzzle + glossy dark button nose
  const muzzleGeo = new THREE.SphereGeometry(0.41, 28, 22);
  const muzzleMesh = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzleMesh.position.set(0, -0.18, 0.69);
  muzzleMesh.scale.set(1.25, 0.88, 0.82);
  headGroup.add(muzzleMesh);

  const noseGeo = new THREE.SphereGeometry(0.145, 22, 16);
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.set(0, -0.04, 1.01);
  noseMesh.scale.set(1.30, 0.90, 0.80);
  headGroup.add(noseMesh);

  // Expressive glossy eyes with dual Pixar-style catchlights & blinking groups
  const eyeBallGeo = new THREE.SphereGeometry(0.155, 22, 18);
  const bigSparkGeo = new THREE.SphereGeometry(0.052, 12, 10);
  const smallSparkGeo = new THREE.SphereGeometry(0.025, 10, 8);
  const eyeGroups = [];
  const pupilGroups = [];

  for (const side of [-1, 1]) {
    const blinkGroup = new THREE.Group();
    blinkGroup.position.set(side * 0.34, 0.17, 0.79);

    const eyeMesh = new THREE.Mesh(eyeBallGeo, eyeBlackMat);
    eyeMesh.scale.set(0.95, 1.08, 0.75);
    blinkGroup.add(eyeMesh);

    const pupilTrack = new THREE.Group();
    const bigSpark = new THREE.Mesh(bigSparkGeo, eyeSparkMat);
    bigSpark.position.set(-0.042, 0.052, 0.105);
    pupilTrack.add(bigSpark);

    const smallSpark = new THREE.Mesh(smallSparkGeo, eyeSparkMat);
    smallSpark.position.set(0.046, -0.042, 0.108);
    pupilTrack.add(smallSpark);

    blinkGroup.add(pupilTrack);
    headGroup.add(blinkGroup);
    eyeGroups.push(blinkGroup);
    pupilGroups.push(pupilTrack);
  }

  // Cute expressive curved eyebrows
  const browGeo = new THREE.CapsuleGeometry(0.032, 0.16, 6, 12);
  const brows = [];
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(side * 0.35, 0.41, 0.76);
    brow.rotation.z = side * -0.22 + Math.PI * 0.5;
    brow.rotation.x = 0.18;
    headGroup.add(brow);
    brows.push({ mesh: brow, baseY: 0.41 });
  }

  // Rosy blushing cheeks
  const blushGeo = new THREE.SphereGeometry(0.15, 20, 14);
  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(blushGeo, blushMat);
    blush.position.set(side * 0.54, -0.06, 0.72);
    blush.scale.set(1.28, 0.78, 0.38);
    headGroup.add(blush);
  }

  // Cheerful U-shaped 3D smile + happy tongue accent
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, -0.19, 0.96),
    new THREE.Vector3(-0.11, -0.31, 1.00),
    new THREE.Vector3(0.0, -0.34, 1.01),
    new THREE.Vector3(0.11, -0.31, 1.00),
    new THREE.Vector3(0.22, -0.19, 0.96),
  ]);
  const smileGeo = new THREE.TubeGeometry(smileCurve, 28, 0.032, 10, false);
  const smileMesh = new THREE.Mesh(smileGeo, noseMat);
  headGroup.add(smileMesh);

  const tongueGeo = new THREE.SphereGeometry(0.088, 16, 12);
  const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
  tongueMesh.position.set(0, -0.33, 0.99);
  tongueMesh.scale.set(1.15, 0.75, 0.65);
  headGroup.add(tongueMesh);

  // Cute tiny plush paw waving warmly beside the cheek
  const pawGroup = new THREE.Group();
  pawGroup.position.set(0.86, -0.68, 0.42);
  const pawGeo = new THREE.SphereGeometry(0.23, 20, 16);
  const pawMesh = new THREE.Mesh(pawGeo, plushMat);
  pawMesh.scale.set(1.0, 1.15, 0.78);
  pawGroup.add(pawMesh);

  const pawPadGeo = new THREE.SphereGeometry(0.12, 16, 12);
  const pawPad = new THREE.Mesh(pawPadGeo, innerEarMat);
  pawPad.position.set(0, -0.02, 0.13);
  pawPad.scale.set(1.0, 1.0, 0.5);
  pawGroup.add(pawPad);
  root.add(pawGroup);

  return {
    root,
    headGroup,
    ears,
    eyeGroups,
    pupilGroups,
    brows,
    pawGroup,
  };
}

/**
 * Interactive 3D white teddy-bear smiley mascot placed beside the ProjectHub greeting.
 * Smoothly turns its head and eyes toward the user's cursor anywhere on screen,
 * blinks naturally, performs a happy celebration spin on click, and falls back to SVG if WebGL fails.
 */
export function GreetingMascot3D() {
  const containerRef = useRef(null);
  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);
  const rimLightRef = useRef(null);
  const spinTriggerRef = useRef(null);
  const [webglFailed, setWebglFailed] = useState(() => {
    try {
      const testCanvas = document.createElement('canvas');
      return !(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));
    } catch {
      return true;
    }
  });

  useEffect(() => {
    isDarkRef.current = isDark;
    if (rimLightRef.current) {
      rimLightRef.current.color.setHex(isDark ? 0x38bdf8 : 0x64748b);
      rimLightRef.current.intensity = isDark ? 0.92 : 0.68;
    }
  }, [isDark]);

  useEffect(() => {
    if (webglFailed) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || 72;
    const height = container.clientHeight || 72;
    const reducedMotion = getPrefersReducedMotion();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch {
      requestAnimationFrame(() => setWebglFailed(true));
      return undefined;
    }

    renderer.setPixelRatio(getOptimalPixelRatio(width));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / Math.max(height, 1), 0.1, 30);
    camera.position.set(0.05, 0.04, 4.45);
    camera.lookAt(0, 0.02, 0);

    // Balanced studio lighting with theme-aware rim contrast on snowy white fur
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x64748b, 1.10);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.24);
    keyLight.position.set(-2.5, 3.2, 4.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(
      isDarkRef.current ? 0x38bdf8 : 0x64748b,
      isDarkRef.current ? 0.92 : 0.68
    );
    rimLight.position.set(3.2, 1.8, -2.5);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const teddy = createTeddyCharacter();
    teddy.root.position.set(-0.04, -0.02, 0);
    scene.add(teddy.root);

    // Cursor tracking state relative to teddy's viewport center
    const lookTarget = { x: 0.08, y: -0.04 };
    const lookCurrent = { x: 0.08, y: -0.04 };
    let directHoverTarget = 0;
    let directHoverSmooth = 0;
    let spinStartAt = -1;
    let lastElapsed = 0;

    spinTriggerRef.current = () => {
      if (!reducedMotion) {
        spinStartAt = lastElapsed;
      }
    };

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const spanX = Math.max(240, window.innerWidth * 0.42);
      const spanY = Math.max(180, window.innerHeight * 0.42);

      lookTarget.x = THREE.MathUtils.clamp((event.clientX - cx) / spanX, -1, 1);
      lookTarget.y = THREE.MathUtils.clamp((event.clientY - cy) / spanY, -1, 1);

      const isOverMascot =
        Math.abs(event.clientX - cx) <= rect.width * 0.75 &&
        Math.abs(event.clientY - cy) <= rect.height * 0.75;
      directHoverTarget = isOverMascot ? 1 : 0;
    };

    const onPointerLeave = () => {
      lookTarget.x = 0.08;
      lookTarget.y = -0.04;
      directHoverTarget = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', onPointerLeave, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getOptimalPixelRatio(w));
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const timer = new THREE.Timer();
    let animId = null;
    let isVisible = true;
    let nextBlinkAt = 2.6;
    let blinkEndAt = -1;

    const renderFrame = (elapsed, staticPose = false) => {
      lastElapsed = elapsed;
      if (staticPose) {
        teddy.headGroup.rotation.set(0.05, 0.10, -0.04);
        renderer.render(scene, camera);
        return;
      }

      lookCurrent.x += (lookTarget.x - lookCurrent.x) * 0.11;
      lookCurrent.y += (lookTarget.y - lookCurrent.y) * 0.11;
      directHoverSmooth += (directHoverTarget - directHoverSmooth) * 0.14;

      // Click celebration spin (1.0s eased 360° twist + double bounce)
      let spinAngle = 0;
      let celebrateBoost = 0;
      if (spinStartAt >= 0) {
        const sp = (elapsed - spinStartAt) / 0.95;
        if (sp >= 1.0) {
          spinStartAt = -1;
        } else {
          const eased = 1 - Math.pow(1 - sp, 3);
          spinAngle = eased * Math.PI * 2;
          celebrateBoost = Math.sin(sp * Math.PI);
        }
      }

      const yaw = lookCurrent.x * 0.62 + spinAngle;
      const pitch = lookCurrent.y * 0.42;
      const roll = -lookCurrent.x * 0.14 + Math.sin(elapsed * 2.1) * 0.03 * (1 + directHoverSmooth + celebrateBoost);

      teddy.headGroup.rotation.set(pitch, yaw, roll);
      teddy.root.position.y =
        -0.02 +
        Math.sin(elapsed * 2.4) * (0.04 + directHoverSmooth * 0.045) +
        celebrateBoost * 0.16;

      for (const pupil of teddy.pupilGroups) {
        pupil.position.x = lookCurrent.x * 0.028;
        pupil.position.y = -lookCurrent.y * 0.022;
      }

      for (const brow of teddy.brows) {
        brow.mesh.position.y = brow.baseY + (directHoverSmooth + celebrateBoost) * 0.045 + Math.sin(elapsed * 2.4) * 0.008;
      }

      for (const ear of teddy.ears) {
        ear.pivot.rotation.z =
          ear.baseZ + ear.side * Math.sin(elapsed * (5.5 + celebrateBoost * 8.0)) * (0.04 + (directHoverSmooth + celebrateBoost) * 0.14);
      }
      teddy.pawGroup.rotation.z =
        0.25 + Math.sin(elapsed * (3.6 + (directHoverSmooth + celebrateBoost) * 4.5)) * (0.28 + (directHoverSmooth + celebrateBoost) * 0.16);
      teddy.pawGroup.position.y = -0.68 + Math.sin(elapsed * 2.4 + 0.6) * 0.04 + celebrateBoost * 0.08;

      if (elapsed >= nextBlinkAt && blinkEndAt < 0) {
        blinkEndAt = elapsed + 0.15;
      }
      let blinkScaleY = 1.0;
      if (blinkEndAt > 0) {
        const progress = 1.0 - (blinkEndAt - elapsed) / 0.15;
        if (progress >= 1.0) {
          blinkEndAt = -1;
          nextBlinkAt = elapsed + 2.8 + Math.random() * 1.9;
        } else {
          blinkScaleY = 1.0 - Math.sin(Math.max(0, progress) * Math.PI) * 0.90;
        }
      }
      for (const eye of teddy.eyeGroups) {
        eye.scale.y = blinkScaleY;
      }

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

    renderFrame(0, reducedMotion);
    if (!reducedMotion && isVisible) {
      animId = requestAnimationFrame(tick);
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
      rimLightRef.current = null;
      spinTriggerRef.current = null;
      timer.dispose();
      disposeThreeResources(scene, renderer, null, container);
    };
  }, [webglFailed]);

  return (
    <span
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={() => spinTriggerRef.current?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          spinTriggerRef.current?.();
        }
      }}
      title="Hi! Move your mouse or click me"
      aria-label="Cute interactive 3D white smiley teddy mascot"
      className="inline-block w-14 h-14 sm:w-16 sm:h-16 lg:w-[74px] lg:h-[74px] -my-2 align-middle shrink-0 cursor-pointer select-none focus:outline-none drop-shadow-[0_4px_10px_rgba(15,23,42,0.16)] dark:drop-shadow-[0_4px_14px_rgba(56,189,248,0.22)]"
    >
      {webglFailed && <WhiteTeddyFallbackSvg />}
    </span>
  );
}
