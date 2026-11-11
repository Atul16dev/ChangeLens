/**
 * Shared Three.js lifecycle, performance, accessibility, and disposal helpers.
 * Centralizes viewport-visibility pausing, reduced-motion detection, mobile DPR
 * capping, and recursive GPU resource cleanup across all 3D components.
 */

/**
 * Observe whether a DOM element is visible in the viewport AND the tab is active.
 * Automatically pauses offscreen / background-tab WebGL loops to save GPU/battery.
 *
 * @param {HTMLElement | null} element
 * @param {(visible: boolean) => void} onChange
 * @param {number} [threshold=0.05]
 * @returns {() => void} Cleanup function
 */
export function observeVisibility(element, onChange, threshold = 0.05) {
  if (!element || typeof window === 'undefined') {
    onChange(true);
    return () => {};
  }

  let isIntersecting = true;
  let isTabActive = typeof document === 'undefined' ? true : !document.hidden;

  const notify = () => {
    onChange(isIntersecting && isTabActive);
  };

  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isIntersecting = entry.isIntersecting;
        notify();
      },
      { threshold }
    );
    observer.observe(element);
  }

  const handleVisibility = () => {
    isTabActive = !document.hidden;
    notify();
  };

  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    if (observer) observer.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/**
 * Detect OS/browser reduced-motion preference safely.
 *
 * @returns {boolean}
 */
export function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Clamp WebGL devicePixelRatio cleanly for responsive mobile vs desktop screens.
 *
 * @param {number} [width]
 * @returns {number}
 */
export function getOptimalPixelRatio(width = typeof window !== 'undefined' ? window.innerWidth : 1280) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const maxDpr = width < 768 ? 1.5 : 2;
  return Math.min(dpr, maxDpr);
}

/**
 * Draw a rounded rectangle path onto a 2D Canvas context (used for 3D badges/sprites).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
export function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Recursively dispose Three.js scene geometries, materials, textures, composer, and renderer.
 *
 * @param {import('three').Scene | null} scene
 * @param {import('three').WebGLRenderer | null} renderer
 * @param {import('three/examples/jsm/postprocessing/EffectComposer.js').EffectComposer | null} [composer=null]
 * @param {HTMLElement | null} [container=null]
 */
export function disposeThreeResources(scene, renderer, composer = null, container = null) {
  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          if (m.map) m.map.dispose();
          if (m.emissiveMap) m.emissiveMap.dispose();
          if (m.alphaMap) m.alphaMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.bumpMap) m.bumpMap.dispose();
          if (m.normalMap) m.normalMap.dispose();
          m.dispose();
        });
      }
    });
  }

  if (composer && typeof composer.dispose === 'function') {
    composer.dispose();
  }

  if (renderer) {
    if (container && renderer.domElement && container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
    renderer.dispose();
  }
}
