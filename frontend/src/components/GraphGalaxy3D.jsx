import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  disposeThreeResources,
  getOptimalPixelRatio,
  getPrefersReducedMotion,
  observeVisibility,
} from '../utils/threeHelpers.js';
import {
  Sparkles,
  RotateCw,
  Compass,
  Layers,
  Flame,
  Eye,
  Zap,
  Trash2,
  X,
  Play,
  Pause,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Focus,
  Move,
  HelpCircle,
  Split,
} from 'lucide-react';

/**
 * Exact 2D ReactFlow Fit View Icon (4-corner viewframe).
 * Matches the ReactFlow Controls 2D fit-view icon identically.
 */
function FitView2DIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 30"
      className={className}
      fill="currentColor"
    >
      <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
    </svg>
  );
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
// Scale factors for spreading nodes far apart in 3D space
const SPREAD_X = 54.0;   // wide horizontal spread
const SPREAD_Y = 36.0;   // tall vertical spread
const SPREAD_Z = 22.0;   // meaningful depth spread per tier

// ─── HELPER: HIGH-DPI LABEL TEXTURE ──────────────────────────────────────────
/**
 * Renders a crisp billboard label sprite using an off-screen HTML Canvas.
 * Keeps labels minimal so they don't clutter 3D space.
 */
function createLabelTexture(label, isDark) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pill background
  const pad = 10;
  const rr = 16;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  ctx.beginPath();
  ctx.moveTo(pad + rr, pad);
  ctx.lineTo(pad + w - rr, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + rr);
  ctx.lineTo(pad + w, pad + h - rr);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - rr, pad + h);
  ctx.lineTo(pad + rr, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - rr);
  ctx.lineTo(pad, pad + rr);
  ctx.quadraticCurveTo(pad, pad, pad + rr, pad);
  ctx.closePath();
  ctx.fillStyle = isDark ? 'rgba(8, 12, 24, 0.90)' : 'rgba(248, 250, 252, 0.95)';
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(100, 116, 139, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Filename text
  let text = label;
  if (text.length > 24) text = text.slice(0, 22) + '…';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark ? '#e2e8f0' : '#0f172a';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ─── HELPER: NODE GEOMETRY FACTORY ────────────────────────────────────────────
/**
 * Returns a distinctive 3D geometry for each node tier.
 * Different shapes make tiers immediately recognizable in 3D space.
 *
 * ROOT CHANGED  → Octahedron  (diamond gem – unique, eye-catching)
 * CRITICAL      → Icosahedron (spiky – visually alarming)
 * HIGH          → Tetrahedron (pyramid – stable but urgent)
 * MEDIUM        → Box (cube)  (structured, medium risk)
 * IMPACTED      → Cylinder    (column – supporting structure)
 * CLEAN         → Sphere      (smooth, baseline)
 */
function getNodeGeometry(tier, radius) {
  switch (tier) {
    case 'root':
      return new THREE.OctahedronGeometry(radius, 1);
    case 'critical':
      return new THREE.IcosahedronGeometry(radius, 0);
    case 'high':
      return new THREE.TetrahedronGeometry(radius * 1.1, 0);
    case 'medium':
      return new THREE.BoxGeometry(radius * 1.6, radius * 1.6, radius * 1.6);
    case 'impacted':
      return new THREE.CylinderGeometry(radius * 0.75, radius, radius * 1.6, 8);
    default:
      return new THREE.SphereGeometry(radius, 22, 16);
  }
}

function createDarkSpaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(256, 180, 10, 256, 256, 360);
  grad.addColorStop(0, '#152136');
  grad.addColorStop(0.6, '#0d1527');
  grad.addColorStop(1, '#080d19');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── HELPER: NODE THEME ───────────────────────────────────────────────────────
function getNodeTheme(node, isSimulating, simulatedFile, simulatedChangeType, isDark) {
  const isDeleted =
    node.data?.isDeleted ||
    (isSimulating && simulatedFile === node.id && simulatedChangeType === 'deleted');
  const isChanged = node.data?.isChanged;
  const severity = node.data?.severity;

  if (isDeleted) return { color: 0xf43f5e, glow: 0xe11d48, radius: 0.65, tier: 'critical', label: '✕ DELETED', labelColor: '#f43f5e' };
  if (isChanged) return { color: 0xf59e0b, glow: 0xd97706, radius: 0.70, tier: 'root', label: '★ ROOT', labelColor: '#f59e0b' };
  if (severity === 'CRITICAL') return { color: 0xef4444, glow: 0xbe123c, radius: 0.60, tier: 'critical', label: '! CRITICAL', labelColor: '#ef4444' };
  if (severity === 'HIGH' || node.data?.depth === 1) return { color: 0xf97316, glow: 0xc2410c, radius: 0.52, tier: 'high', label: '▲ HIGH', labelColor: '#f97316' };
  if (severity === 'MEDIUM' || node.data?.depth === 2) return { color: 0x06b6d4, glow: 0x0284c7, radius: 0.44, tier: 'medium', label: '■ MED', labelColor: '#06b6d4' };
  if (node.data?.isImpacted) return { color: 0x10b981, glow: 0x047857, radius: 0.38, tier: 'impacted', label: '● IMP', labelColor: '#10b981' };
  return { color: isDark ? 0x64748b : 0x475569, glow: isDark ? 0x334155 : 0x334155, radius: 0.28, tier: 'clean', label: '○', labelColor: isDark ? '#64748b' : '#475569' };
}

// ─── MAIN 3D GRAPH COMPONENT ──────────────────────────────────────────────────
export function GraphGalaxy3D({
  graphData,
  layoutNodes = [],
  layoutEdges = [],
  selectedNodeId,
  onSelectNode,
  isSimulating,
  simulatedFile,
  simulatedChangeType = 'modified',
  filterMode = 'all',
  onFilterToggle,
  semanticMode = 'impact',
  onSemanticModeToggle,
  viewDimension = '3D',
  onToggleDimension,
  onExitSimulation,
  isFullscreen,
  onToggleFullscreen,
}) {
  const containerRef = useRef(null);
  const gizmoRef = useRef(null);
  const { isDark } = useTheme();

  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeSelectedNode, setActiveSelectedNode] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIsolated, setIsIsolated] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Live refs so hot animation loop reads hover/selection/search/autoRotate without rebuilding the scene
  const hoveredIdRef = useRef(null);
  const selectedIdRef = useRef(null);
  const searchQueryRef = useRef('');
  const autoRotateRef = useRef(false);

  useEffect(() => {
    hoveredIdRef.current = hoveredNode?.id || null;
  }, [hoveredNode]);

  useEffect(() => {
    selectedIdRef.current = activeSelectedNode?.id || null;
  }, [activeSelectedNode]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Sync external selection prop
  useEffect(() => {
    if (!graphData?.nodes) return;
    if (selectedNodeId) {
      const m = graphData.nodes.find((n) => n.id === selectedNodeId);
      if (m) setActiveSelectedNode(m);
    } else {
      setActiveSelectedNode(null);
      setIsIsolated(false);
    }
  }, [selectedNodeId, graphData]);

  // Source data resolution
  const sourceNodes = useMemo(() => {
    if (layoutNodes?.length > 0) return layoutNodes;
    return graphData?.nodes || [];
  }, [layoutNodes, graphData]);

  const sourceEdges = useMemo(() => {
    if (layoutEdges?.length > 0) return layoutEdges;
    return graphData?.edges || [];
  }, [layoutEdges, graphData]);

  // Visible nodes after filter + isolation
  const visibleNodes = useMemo(() => {
    let r = sourceNodes;
    if (filterMode === 'blast_only') r = r.filter((n) => n.data?.isChanged || n.data?.isImpacted);
    if (isIsolated && activeSelectedNode) {
      const nb = new Set([activeSelectedNode.id]);
      sourceEdges.forEach((e) => {
        if (e.source === activeSelectedNode.id) nb.add(e.target);
        if (e.target === activeSelectedNode.id) nb.add(e.source);
      });
      r = r.filter((n) => nb.has(n.id));
    }
    return r;
  }, [sourceNodes, sourceEdges, filterMode, isIsolated, activeSelectedNode]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => sourceEdges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [sourceEdges, visibleNodeIds]
  );

  // Camera action bridge refs (set inside useEffect, called from JSX buttons)
  const camRef = useRef({ reset: null, fit: null, focus: null, zoomIn: null, zoomOut: null, resetLayout: null });

  // ─── MAIN THREE.JS EFFECT ─────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Scene Setup ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    // Matches 2D graph background gradient tone seamlessly
    scene.fog = new THREE.FogExp2(isDark ? 0x080d19 : 0xb5c2d3, 0.003);

    const W = container.clientWidth || 900;
    const H = container.clientHeight || 650;
    const reducedMotion = getPrefersReducedMotion();
    const isMobile = W < 768;

    let darkSpaceTex = null;
    if (isDark) {
      darkSpaceTex = createDarkSpaceTexture();
      scene.background = darkSpaceTex;
    }

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1200);
    const DEFAULT_CAM = new THREE.Vector3(0, 12, 55);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.position.copy(DEFAULT_CAM);
    camera.lookAt(cameraTarget);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: !isDark, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(getOptimalPixelRatio(W));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.15 : 1.08;

    // Clean mount
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    // Selective Post-Processing Bloom (Dark Mode only, preserves crisp high-contrast Light Mode)
    let composer = null;
    if (isDark && !reducedMotion) {
      try {
        composer = new EffectComposer(renderer);
        composer.setPixelRatio(getOptimalPixelRatio(W));
        composer.setSize(W, H);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.34, 0.5, 0.72);
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
      } catch {
        composer = null;
      }
    }

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(isDark ? 0x334155 : 0xffffff, isDark ? 1.65 : 2.35));
    const keyLight = new THREE.DirectionalLight(0xf0f9ff, isDark ? 2.8 : 2.1);
    keyLight.position.set(25, 40, 30);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xa78bfa, isDark ? 2.0 : 1.2);
    fillLight.position.set(-25, -15, -20);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xf59e0b, isDark ? 2.0 : 1.0, 120);
    rimLight.position.set(10, -20, 15);
    scene.add(rimLight);

    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Subtle reference grid + concentric architectural tier rings
    const grid = new THREE.GridHelper(200, 60,
      isDark ? 0x1e293b : 0x7e92ab,
      isDark ? 0x0f172a : 0xa4b4c7
    );
    grid.position.y = -14;
    scene.add(grid);

    const floorRingRadii = [14, 28, 44];
    floorRingRadii.forEach((rad, idx) => {
      const rGeo = new THREE.RingGeometry(rad, rad + 0.14, 72);
      const rMat = new THREE.MeshBasicMaterial({
        color: isDark ? (idx === 0 ? 0x0284c7 : 0x334155) : (idx === 0 ? 0x0369a1 : 0x64748b),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isDark ? 0.28 - idx * 0.05 : 0.34 - idx * 0.06,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -13.94;
      scene.add(ring);
    });

    // Ambient particle field (scaled cleanly for mobile/desktop)
    const ptCount = isMobile ? 140 : 280;
    const ptGeo = new THREE.BufferGeometry();
    const ptPos = new Float32Array(ptCount * 3);
    for (let i = 0; i < ptCount; i++) {
      ptPos[i * 3 + 0] = (Math.random() - 0.5) * 160;
      ptPos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      ptPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
    const ptMat = new THREE.PointsMaterial({ color: isDark ? 0x38bdf8 : 0x475569, size: 0.18, transparent: true, opacity: isDark ? 0.4 : 0.35 });
    scene.add(new THREE.Points(ptGeo, ptMat));

    // ── 3D Spatial Layout Engine ─────────────────────────────────────────────
    const posMap = new Map();   // id → THREE.Vector3  (live, can be dragged)
    const defMap = new Map();   // id → THREE.Vector3  (default, for reset)
    const meshMap = new Map();  // id → { mesh, halo, label, theme }
    const hitMeshes = [];       // meshes intersectable by raycaster
    const edgeObjs = [];        // edge descriptors

    const has2DPos = visibleNodes.some((n) => n.position && (n.position.x !== 0 || n.position.y !== 0));

    if (has2DPos) {
      // ── Mode A: Use ELK 2D coordinates, map into 3D with wide spread ──────
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      visibleNodes.forEach((n) => {
        const px = n.position?.x ?? 0;
        const py = n.position?.y ?? 0;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      });

      const spanX = Math.max(maxX - minX, 100);
      const spanY = Math.max(maxY - minY, 100);
      const scaleX = SPREAD_X / spanX;
      const scaleY = SPREAD_Y / spanY;
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      visibleNodes.forEach((node, idx) => {
        const rawX = node.position?.x ?? midX;
        const rawY = node.position?.y ?? midY;
        const x = (rawX - midX) * scaleX;
        const y = -(rawY - midY) * scaleY; // flip Y for 3D

        // Z-axis: meaningful architectural depth per tier
        const isChanged = node.data?.isChanged || node.data?.isDeleted;
        const severity = node.data?.severity;
        let z = 0;
        if (isChanged) z = SPREAD_Z * 0.9;
        else if (severity === 'CRITICAL') z = SPREAD_Z * 0.65;
        else if (severity === 'HIGH' || node.data?.depth === 1) z = SPREAD_Z * 0.38;
        else if (severity === 'MEDIUM' || node.data?.depth === 2) z = SPREAD_Z * 0.08;
        else if (node.data?.isImpacted) z = -SPREAD_Z * 0.22;
        else z = -SPREAD_Z * 0.55 - (idx % 4) * 1.8;

        // Slight parabolic arch (nodes near center elevated more)
        const dist = Math.sqrt(x * x + y * y);
        z += Math.max(0, 2.5 - dist * 0.06);

        const pos = new THREE.Vector3(x, y, z);
        posMap.set(node.id, pos);
        defMap.set(node.id, pos.clone());
      });
    } else {
      // ── Mode B: Deterministic layered 3D DAG (no randomness) ─────────────
      const tiers = [
        visibleNodes.filter((n) => n.data?.isChanged || n.data?.isDeleted),
        visibleNodes.filter((n) => !n.data?.isChanged && !n.data?.isDeleted && (n.data?.severity === 'CRITICAL' || n.data?.severity === 'HIGH' || n.data?.depth === 1)),
        visibleNodes.filter((n) => !n.data?.isChanged && !n.data?.isDeleted && n.data?.depth !== 1 && n.data?.severity !== 'CRITICAL' && n.data?.severity !== 'HIGH' && (n.data?.depth === 2 || n.data?.severity === 'MEDIUM')),
        visibleNodes.filter((n) => n.data?.isImpacted && !n.data?.isChanged && !n.data?.isDeleted && n.data?.depth !== 1 && n.data?.depth !== 2),
        visibleNodes.filter((n) => !n.data?.isImpacted && !n.data?.isChanged && !n.data?.isDeleted),
      ];
      const layerXPositions = [-22, -10, 2, 14, 26];
      const layerZPositions = [18, 10, 2, -6, -14];

      tiers.forEach((tierNodes, ti) => {
        const count = tierNodes.length;
        if (count === 0) return;
        const yStep = Math.min(6.0, 32.0 / Math.max(count, 1));
        const startY = ((count - 1) * yStep) / 2;
        tierNodes.forEach((node, i) => {
          const x = layerXPositions[ti];
          const y = startY - i * yStep;
          const z = layerZPositions[ti] + Math.sin(i * 1.1) * 1.5;
          const pos = new THREE.Vector3(x, y, z);
          posMap.set(node.id, pos);
          defMap.set(node.id, pos.clone());
        });
      });
    }

    // ── Architectural Z-Tier Layer Frames (spatial depth visualizers) ──────────
    if (has2DPos && visibleNodes.length > 0) {
      const zLayers = [
        { z: SPREAD_Z * 0.9, color: isDark ? 0xf59e0b : 0xd97706 },
        { z: SPREAD_Z * 0.38, color: isDark ? 0x38bdf8 : 0x0284c7 },
        { z: -SPREAD_Z * 0.22, color: isDark ? 0x818cf8 : 0x4f46e5 },
      ];
      zLayers.forEach((layer) => {
        const frameBox = new THREE.PlaneGeometry(SPREAD_X * 0.92, SPREAD_Y * 0.85);
        const frameEdges = new THREE.EdgesGeometry(frameBox);
        frameBox.dispose();
        const frameMat = new THREE.LineBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: isDark ? 0.14 : 0.2,
        });
        const frameWire = new THREE.LineSegments(frameEdges, frameMat);
        frameWire.position.set(0, 0, layer.z);
        graphGroup.add(frameWire);
      });
    }

    // ── Simulation BFS Hop Depth Map (for sequential wave pulses) ─────────────
    const hopDepthById = new Map();
    if (isSimulating && simulatedFile) {
      hopDepthById.set(simulatedFile, 0);
      const adj = new Map();
      visibleEdges.forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
      });
      const qIds = [simulatedFile];
      while (qIds.length > 0) {
        const curr = qIds.shift();
        const d = hopDepthById.get(curr);
        (adj.get(curr) || []).forEach((nxt) => {
          if (!hopDepthById.has(nxt)) {
            hopDepthById.set(nxt, d + 1);
            qIds.push(nxt);
          }
        });
      }
    }

    // ── Shared Geometry Pool (cuts GPU buffers 10x+ on large repos) ───────────
    const geoCache = new Map();
    const getCachedNodeGeo = (tier, radius) => {
      const key = `${tier}:${radius}`;
      if (!geoCache.has(key)) geoCache.set(key, getNodeGeometry(tier, radius));
      return geoCache.get(key);
    };

    // ── Build Node Meshes ─────────────────────────────────────────────────────
    visibleNodes.forEach((node) => {
      const pos = posMap.get(node.id) || new THREE.Vector3(0, 0, 0);
      const theme = getNodeTheme(node, isSimulating, simulatedFile, simulatedChangeType, isDark);
      const geo = getCachedNodeGeo(theme.tier, theme.radius);
      const isHeroTier =
        theme.tier === 'root' ||
        theme.tier === 'critical' ||
        theme.tier === 'high' ||
        theme.tier === 'medium';
      const mat = new THREE.MeshPhysicalMaterial({
        color: theme.color,
        emissive: theme.glow,
        emissiveIntensity: isDark ? 0.44 : 0.24,
        roughness: isHeroTier ? 0.12 : 0.18,
        metalness: isDark ? 0.36 : 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        iridescence: isHeroTier ? 0.85 : 0.45,
        iridescenceIOR: 1.38,
        specularIntensity: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.userData = { node, theme };
      graphGroup.add(mesh);
      hitMeshes.push(mesh);

      // Impact / selection halo ring (always present for changed/impacted)
      let halo = null;
      if (node.data?.isChanged || node.data?.isImpacted) {
        const haloGeo = new THREE.RingGeometry(theme.radius * 1.4, theme.radius * 1.75, 36);
        const haloMat = new THREE.MeshBasicMaterial({
          color: theme.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        });
        halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.copy(pos);
        graphGroup.add(halo);
      }

      // Billboard label (lean & crisp)
      const fileName = node.id.split('/').pop() || node.id;
      const labelTex = createLabelTexture(fileName, isDark);
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false });
      const label = new THREE.Sprite(labelMat);
      label.scale.set(5.5, 1.1, 1.0);
      label.position.set(pos.x, pos.y + theme.radius + 1.1, pos.z);
      graphGroup.add(label);

      meshMap.set(node.id, { node, mesh, halo, label, theme, pos });
    });

    // ── Build 3D Edges ────────────────────────────────────────────────────────
    const rebuildEdgeCurves = () => {
      edgeObjs.forEach((eo) => {
        const p1 = posMap.get(eo.source);
        const p2 = posMap.get(eo.target);
        if (!p1 || !p2) return;
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        const dist = p1.distanceTo(p2);
        // Arch outward in 3D so edges don't lie flat
        mid.y += Math.min(3.0, dist * 0.20);
        mid.z += Math.min(2.5, dist * 0.14);
        eo.curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const pts = eo.curve.getPoints(32);
        eo.lineMesh.geometry.setFromPoints(pts);
        // Update arrow
        if (eo.arrow) {
          const t = eo.curve.getTangentAt(0.58).normalize();
          eo.arrow.position.copy(eo.curve.getPointAt(0.58));
          eo.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
        }
      });
    };

    // ── Simulation Epicenter Shockwave Rings ──────────────────────────────────
    const simShockwaves = [];
    if (isSimulating && simulatedFile && posMap.has(simulatedFile)) {
      const epiPos = posMap.get(simulatedFile);
      const shockColor = isDark ? 0xf43f5e : 0xdc2626;
      for (let i = 0; i < 2; i++) {
        const sGeo = new THREE.RingGeometry(0.9, 1.12, 42);
        const sMat = new THREE.MeshBasicMaterial({
          color: shockColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const sRing = new THREE.Mesh(sGeo, sMat);
        sRing.position.copy(epiPos);
        graphGroup.add(sRing);
        simShockwaves.push({ mesh: sRing, mat: sMat, phaseOffset: i * 0.5, epiPos });
      }
    }

    const sharedArrowGeo = new THREE.ConeGeometry(0.16, 0.45, 10);
    const sharedPhotonGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const sharedWavePulseGeo = new THREE.SphereGeometry(0.22, 12, 12);

    visibleEdges.forEach((edge) => {
      const p1 = posMap.get(edge.source);
      const p2 = posMap.get(edge.target);
      if (!p1 || !p2) return;
      const isImpact = Boolean(edge.data?.isImpactPath || edge.data?.isImpacted || edge.animated);

      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y += Math.min(3.0, dist * 0.20);
      mid.z += Math.min(2.5, dist * 0.14);
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const pts = curve.getPoints(32);
      const lGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const edgeColor = isImpact ? (isDark ? 0x06b6d4 : 0x0284c7) : isDark ? 0x334155 : 0x475569;
      const lMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: isImpact ? (isDark ? 0.75 : 0.85) : (isDark ? 0.22 : 0.38),
        linewidth: 1,
      });
      const lineMesh = new THREE.Line(lGeo, lMat);
      graphGroup.add(lineMesh);

      // Directional arrowhead cone (shared geometry)
      const aMat = new THREE.MeshBasicMaterial({ color: edgeColor, transparent: true, opacity: isImpact ? 0.9 : 0.5 });
      const arrow = new THREE.Mesh(sharedArrowGeo, aMat);
      const t = curve.getTangentAt(0.58).normalize();
      arrow.position.copy(curve.getPointAt(0.58));
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
      graphGroup.add(arrow);

      // Animated photon for impact edges (shared geometry)
      let photon = null;
      if (isImpact) {
        const pMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x38bdf8 : 0x0284c7 });
        photon = new THREE.Mesh(sharedPhotonGeo, pMat);
        graphGroup.add(photon);
      }

      // Sequential Hop-by-Hop Blast Surge Pulse during What-If Simulation
      const d1 = hopDepthById.has(edge.source) ? hopDepthById.get(edge.source) : 99;
      const d2 = hopDepthById.has(edge.target) ? hopDepthById.get(edge.target) : 99;
      const edgeHop = Math.min(d1, d2);
      const waveReverse = d2 < d1;
      let simPulse = null;
      if (isSimulating && edgeHop < 8 && (isImpact || edgeHop <= 2)) {
        const spColor = edgeHop === 0 ? (isDark ? 0xf43f5e : 0xdc2626) : (isDark ? 0xfbbf24 : 0xd97706);
        const spMat = new THREE.MeshBasicMaterial({ color: spColor, transparent: true, opacity: 0.95 });
        simPulse = new THREE.Mesh(sharedWavePulseGeo, spMat);
        graphGroup.add(simPulse);
      }

      edgeObjs.push({
        edge,
        source: edge.source,
        target: edge.target,
        curve,
        lineMesh,
        arrow,
        photon,
        simPulse,
        edgeHop,
        waveReverse,
        isImpact,
        speed: 0.003 + Math.random() * 0.002,
        progress: Math.random(),
      });
    });

    // ── Spherical Camera Controller ───────────────────────────────────────────
    const sph = new THREE.Spherical();
    sph.setFromVector3(camera.position.clone().sub(cameraTarget));
    const sphDelta = { r: 0, phi: 0, theta: 0 };

    let isDown = false, mode = 'none';
    let prev = { x: 0, y: 0 }, start = { x: 0, y: 0 };
    let dragMesh = null;
    const dragPlane = new THREE.Plane();
    const planeHit = new THREE.Vector3();
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();

    let tweening = false, tweenPos = null, tweenLook = null;
    const tween = (toPos, toLook = new THREE.Vector3()) => {
      tweening = true;
      tweenPos = toPos.clone();
      tweenLook = toLook.clone();
    };

    const getPointerNDC = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onDown = (e) => {
      if (e.target !== renderer.domElement) return;
      getPointerNDC(e);
      start = prev = { x: e.clientX, y: e.clientY };
      isDown = true;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(hitMeshes);
      if (e.button === 0 && hits.length > 0 && !e.shiftKey) {
        mode = 'dragNode';
        dragMesh = hits[0].object;
        const n = camera.getWorldDirection(new THREE.Vector3()).negate();
        dragPlane.setFromNormalAndCoplanarPoint(n, dragMesh.position);
        container.style.cursor = 'grabbing';
      } else if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        mode = 'pan'; container.style.cursor = 'move';
      } else {
        mode = 'rotate'; container.style.cursor = 'grabbing';
      }
    };

    const onMove = (e) => {
      getPointerNDC(e);
      if (isDown) {
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        prev = { x: e.clientX, y: e.clientY };
        if (mode === 'dragNode' && dragMesh) {
          ray.setFromCamera(ptr, camera);
          if (ray.ray.intersectPlane(dragPlane, planeHit)) {
            dragMesh.position.copy(planeHit);
            const nid = dragMesh.userData.node?.id;
            if (nid) {
              posMap.set(nid, planeHit.clone());
              const ent = meshMap.get(nid);
              if (ent) {
                if (ent.halo) ent.halo.position.copy(planeHit);
                if (ent.label) ent.label.position.set(planeHit.x, planeHit.y + ent.theme.radius + 1.1, planeHit.z);
              }
              rebuildEdgeCurves();
            }
          }
        } else if (mode === 'pan') {
          const spd = sph.radius * 0.0012;
          const right = new THREE.Vector3(), up = new THREE.Vector3();
          camera.matrix.extractBasis(right, up, new THREE.Vector3());
          const off = right.multiplyScalar(-dx * spd).add(up.multiplyScalar(dy * spd));
          cameraTarget.add(off); camera.position.add(off);
        } else if (mode === 'rotate') {
          sphDelta.theta -= dx * 0.004;
          sphDelta.phi -= dy * 0.004;
        }
      } else {
        // Hover raycasting
        ray.setFromCamera(ptr, camera);
        const hits = ray.intersectObjects(hitMeshes);
        if (hits.length > 0) {
          setHoveredNode(hits[0].object.userData?.node || null);
          container.style.cursor = 'pointer';
        } else {
          setHoveredNode(null);
          container.style.cursor = 'grab';
        }
      }
    };

    const onUp = (e) => {
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dist < 5) {
        // Click
        ray.setFromCamera(ptr, camera);
        const hits = ray.intersectObjects(hitMeshes);
        if (hits.length > 0) {
          const clicked = hits[0].object.userData?.node;
          if (clicked) { setActiveSelectedNode(clicked); if (onSelectNode) onSelectNode(clicked.id); }
        } else {
          setActiveSelectedNode(null); if (onSelectNode) onSelectNode(null);
        }
      }
      isDown = false; mode = 'none'; dragMesh = null;
      container.style.cursor = 'grab';
    };

    const onDblClick = (e) => {
      getPointerNDC(e);
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(hitMeshes);
      if (hits.length > 0) {
        const tn = hits[0].object.userData?.node;
        const p = posMap.get(tn?.id);
        if (p) {
          setActiveSelectedNode(tn); if (onSelectNode) onSelectNode(tn.id);
          const dir = camera.position.clone().sub(cameraTarget).normalize();
          tween(p.clone().add(dir.multiplyScalar(14)), p);
        }
      }
    };

    const onWheel = (e) => { e.preventDefault(); sphDelta.r += e.deltaY * 0.018; };
    const onCtx = (e) => e.preventDefault();

    // Mobile / tablet single-touch drag-to-orbit support
    let touchLast = null;
    const onTouchStart = (e) => {
      if (e.touches.length === 1 && e.target === renderer.domElement) {
        touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDown = true;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && touchLast) {
        const dx = e.touches[0].clientX - touchLast.x;
        const dy = e.touches[0].clientY - touchLast.y;
        touchLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        sphDelta.theta -= dx * 0.005;
        sphDelta.phi -= dy * 0.005;
      }
    };
    const onTouchEnd = () => {
      touchLast = null;
      isDown = false;
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('dblclick', onDblClick);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('contextmenu', onCtx);

    const obs = new ResizeObserver(() => {
      const nW = container.clientWidth, nH = container.clientHeight;
      if (!nW || !nH) return;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      const dpr = getOptimalPixelRatio(nW);
      renderer.setPixelRatio(dpr);
      renderer.setSize(nW, nH);
      if (composer) {
        composer.setPixelRatio(dpr);
        composer.setSize(nW, nH);
      }
    });
    obs.observe(container);

    // ── Camera Action Bridge ─────────────────────────────────────────────────
    camRef.current.reset = () => tween(DEFAULT_CAM, new THREE.Vector3(0, 0, 0));
    camRef.current.fit = () => {
      if (!visibleNodes.length) return;
      const box = new THREE.Box3();
      posMap.forEach((p) => box.expandByPoint(p));
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const r = Math.max(sphere.radius, 10);
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (camera.aspect || 1));
      const effectiveFov = Math.min(vFov, hFov);
      const dist = (r / Math.sin(effectiveFov / 2)) * 1.25;
      const dir = camera.position.clone().sub(cameraTarget).normalize();
      tween(center.clone().add(dir.multiplyScalar(dist)), center);
    };
    camRef.current.focus = (id) => {
      const p = posMap.get(id);
      if (!p) return;
      const dir = camera.position.clone().sub(cameraTarget).normalize();
      tween(p.clone().add(dir.multiplyScalar(14)), p);
    };
    camRef.current.zoomIn = () => { sphDelta.r -= 5; };
    camRef.current.zoomOut = () => { sphDelta.r += 5; };
    camRef.current.resetLayout = () => {
      defMap.forEach((orig, id) => {
        posMap.set(id, orig.clone());
        const ent = meshMap.get(id);
        if (ent) {
          ent.mesh.position.copy(orig);
          if (ent.halo) ent.halo.position.copy(orig);
          if (ent.label) ent.label.position.set(orig.x, orig.y + ent.theme.radius + 1.1, orig.z);
        }
      });
      rebuildEdgeCurves();
    };

    // ── Gizmo Drawing ─────────────────────────────────────────────────────────
    const drawGizmo = () => {
      const gc = gizmoRef.current;
      if (!gc) return;
      const ctx = gc.getContext('2d');
      const sz = gc.width, cx = sz / 2, r = sz * 0.33;
      ctx.clearRect(0, 0, sz, sz);
      ctx.beginPath(); ctx.arc(cx, cx, r * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(10,16,32,0.80)' : 'rgba(248,250,252,0.85)'; ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(56,189,248,0.4)' : 'rgba(100,116,139,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

      const rot = new THREE.Matrix4().extractRotation(camera.matrixWorldInverse);
      const axes = [
        { d: new THREE.Vector3(1,0,0), l:'X', c:'#ef4444' },
        { d: new THREE.Vector3(0,1,0), l:'Y', c:'#10b981' },
        { d: new THREE.Vector3(0,0,1), l:'Z', c:'#06b6d4' },
      ];
      const proj = axes.map((a) => { const v=a.d.clone().applyMatrix4(rot); return {...a,px:v.x,py:-v.y,pz:v.z}; });
      proj.sort((a,b) => a.pz - b.pz);
      proj.forEach(({ px,py,c,l }) => {
        const ex=cx+px*r, ey=cx+py*r;
        ctx.beginPath(); ctx.moveTo(cx,cx); ctx.lineTo(ex,ey); ctx.strokeStyle=c; ctx.lineWidth=2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(ex,ey,4.5,0,Math.PI*2); ctx.fillStyle=c; ctx.fill();
        ctx.fillStyle=isDark?'#f1f5f9':'#0f172a'; ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(l, ex+px*8, ey+py*8);
      });
    };

    // ── Animation Loop (viewport-aware & reduced-motion friendly) ──────────────
    let animId = null;
    let isVisible = true;
    const timer = new THREE.Timer();
    const _v3 = new THREE.Vector3();

    const animate = (timestamp) => {
      if (!isVisible) {
        animId = null;
        return;
      }
      animId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const t = timer.getElapsed();

      // Camera tweening
      if (tweening && tweenPos && tweenLook) {
        camera.position.lerp(tweenPos, 0.07);
        cameraTarget.lerp(tweenLook, 0.07);
        camera.lookAt(cameraTarget);
        if (camera.position.distanceTo(tweenPos) < 0.08 && cameraTarget.distanceTo(tweenLook) < 0.08) {
          tweening = false;
          sph.setFromVector3(camera.position.clone().sub(cameraTarget));
        }
      } else {
        if (autoRotateRef.current && !isDown && !reducedMotion) sphDelta.theta += 0.0018;
        sph.theta += sphDelta.theta;
        sph.phi += sphDelta.phi;
        sph.radius += sphDelta.r;
        sph.phi = THREE.MathUtils.clamp(sph.phi, 0.08, Math.PI - 0.08);
        sph.radius = THREE.MathUtils.clamp(sph.radius, 8, 90);
        sphDelta.theta *= 0.90;
        sphDelta.phi *= 0.90;
        sphDelta.r *= 0.88;
        camera.position.setFromSpherical(sph).add(cameraTarget);
        camera.lookAt(cameraTarget);
      }

      // Simulation epicenter shockwaves
      simShockwaves.forEach((sw) => {
        sw.mesh.lookAt(camera.position);
        const phase = (t * 0.55 + sw.phaseOffset) % 1;
        const sScale = 1.0 + phase * 3.8;
        sw.mesh.scale.set(sScale, sScale, sScale);
        sw.mat.opacity = (1 - phase) * (isDark ? 0.75 : 0.85);
      });

      // Photon packets + sequential hop-by-hop simulation wave pulses
      edgeObjs.forEach((eo) => {
        if (eo.photon && eo.curve) {
          eo.progress = (eo.progress + eo.speed) % 1;
          eo.photon.position.copy(eo.curve.getPointAt(eo.progress));
        }
        if (eo.simPulse && eo.curve) {
          const cycle = (t * 0.48 - eo.edgeHop * 0.24 + 10) % 1;
          const u = eo.waveReverse ? 1 - cycle : cycle;
          eo.simPulse.position.copy(eo.curve.getPointAt(u));
          const pulseScale = 0.8 + Math.sin(cycle * Math.PI) * 0.65;
          eo.simPulse.scale.setScalar(pulseScale);
        }
      });

      // Determine active focus node from live refs
      const currentSelectedId = selectedIdRef.current;
      const currentHoveredId = hoveredIdRef.current;
      const activeId = currentSelectedId || currentHoveredId;
      const q = (searchQueryRef.current || '').trim().toLowerCase();

      // Per-node visual update
      meshMap.forEach((ent, id) => {
        const isSelected = id === currentSelectedId;
        const isHovered = id === currentHoveredId;
        const isConnected = activeId && visibleEdges.some((e) => (e.source === activeId && e.target === id) || (e.target === activeId && e.source === id));
        const matchesSearch = q ? id.toLowerCase().includes(q) : true;

        // Target scale
        let targetUniform = 1.0;
        if (isSelected) targetUniform = 1.5;
        else if (isHovered) targetUniform = 1.3;
        else if (activeId && !isConnected && id !== activeId) targetUniform = 0.75;

        _v3.set(targetUniform, targetUniform, targetUniform);
        ent.mesh.scale.lerp(_v3, 0.14);

        // Opacity for search / neighbor dimming
        const dimmed = (q && !matchesSearch) || (activeId && id !== activeId && !isConnected);
        ent.mesh.material.transparent = dimmed;
        ent.mesh.material.opacity = dimmed ? 0.22 : 1.0;
        if (ent.label) ent.label.material.opacity = dimmed ? 0.15 : 0.95;

        // Emissive boost for selected / hovered (preserve clearcoat sheen at rest)
        if (isSelected || isHovered) {
          ent.mesh.material.emissiveIntensity = isDark ? 1.18 : 0.82;
        } else {
          ent.mesh.material.emissiveIntensity = isDark ? 0.44 : 0.24;
        }

        // Halo billboard + pulse
        if (ent.halo) {
          ent.halo.lookAt(camera.position);
          const pulse = (Math.sin(t * 3.2 + id.length) + 1) * 0.5;
          const hs = 1.0 + (isSelected ? 0.45 : isHovered ? 0.25 : 0.12) * pulse;
          ent.halo.scale.set(hs, hs, hs);
          if (isSelected) {
            ent.halo.material.color.setHex(0x38bdf8);
            ent.halo.material.opacity = 0.90;
          } else {
            ent.halo.material.color.setHex(ent.theme.color);
            ent.halo.material.opacity = 0.65;
          }
        }

        // Slow spin for root/critical nodes
        if (!reducedMotion && (ent.theme.tier === 'root' || ent.theme.tier === 'critical')) {
          ent.mesh.rotation.y = t * 0.6;
          ent.mesh.rotation.x = t * 0.3;
        }
      });

      // Edge highlight
      edgeObjs.forEach((eo) => {
        const isConnected = activeId && (eo.source === activeId || eo.target === activeId);
        if (activeId) {
          if (isConnected) {
            eo.lineMesh.material.opacity = 0.98;
            eo.lineMesh.material.color.setHex(0x38bdf8);
            if (eo.arrow) { eo.arrow.material.opacity = 1.0; eo.arrow.material.color.setHex(0x38bdf8); }
          } else {
            eo.lineMesh.material.opacity = 0.07;
            if (eo.arrow) eo.arrow.material.opacity = 0.07;
          }
        } else {
          eo.lineMesh.material.opacity = eo.isImpact ? (isDark ? 0.75 : 0.82) : (isDark ? 0.22 : 0.36);
          eo.lineMesh.material.color.setHex(eo.isImpact ? (isDark ? 0x06b6d4 : 0x0284c7) : isDark ? 0x334155 : 0x475569);
          if (eo.arrow) { eo.arrow.material.opacity = eo.isImpact ? 0.9 : 0.5; }
        }
      });

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      drawGizmo();
    };

    const stopVisibility = observeVisibility(container, (visible) => {
      isVisible = visible;
      if (visible && animId === null) {
        animId = requestAnimationFrame(animate);
      } else if (!visible && animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    });

    animId = requestAnimationFrame(animate);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      stopVisibility();
      timer.dispose();
      container.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('dblclick', onDblClick);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('contextmenu', onCtx);
      obs.disconnect();

      if (darkSpaceTex) darkSpaceTex.dispose();
      geoCache.forEach((g) => g.dispose());
      sharedArrowGeo.dispose();
      sharedPhotonGeo.dispose();
      sharedWavePulseGeo.dispose();
      disposeThreeResources(scene, renderer, composer, container);
    };
  }, [visibleNodes, visibleEdges, isDark, isSimulating, simulatedFile, simulatedChangeType]);

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const m = visibleNodes.find((n) => n.id.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    if (m) {
      setActiveSelectedNode(m);
      if (onSelectNode) onSelectNode(m.id);
      if (camRef.current.focus) camRef.current.focus(m.id);
    }
  };

  // ── JSX Layout ────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full min-h-[500px] select-none overflow-hidden transition-all duration-300"
      style={{
        background: isDark
          ? 'radial-gradient(circle at 50% 35%, #152136 0%, #0d1527 60%, #080d19 100%)'
          : 'radial-gradient(circle at 50% 35%, #dee5ed 0%, #ccd5e2 50%, #9aa9bd 100%)',
      }}
    >

      {/* Ambient subtle depth glows */}
      <div className={`absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none ${isDark ? 'bg-cyan-500/12' : 'bg-slate-400/20'}`} />
      <div className={`absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[160px] pointer-events-none ${isDark ? 'bg-violet-500/10' : 'bg-slate-500/20'}`} />

      {/* WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* ── TOP BAR: Left side – Dimension switch + Filters + Search ───────── */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[calc(100%-200px)]">

        {/* 2D/3D Toggle */}
        {onToggleDimension && (
          <div className="flex items-center bg-white/95 dark:bg-slate-900/95 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md">
            <button type="button" onClick={() => onToggleDimension('2D')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <Layers className="w-3 h-3" /><span>2D</span>
            </button>
            <button type="button" onClick={() => onToggleDimension('3D')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm">
              <Sparkles className="w-3 h-3" /><span>3D</span>
              <span className="w-1 h-1 rounded-full bg-cyan-300 animate-ping" />
            </button>
          </div>
        )}

        {/* Full Repo / Blast Only */}
        {onFilterToggle && (
          <div className="flex items-center bg-white/95 dark:bg-slate-900/95 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md">
            <button type="button" onClick={() => onFilterToggle('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${filterMode === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              <Eye className="w-3 h-3" /><span>All ({sourceNodes.length})</span>
            </button>
            <button type="button" onClick={() => onFilterToggle('blast_only')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${filterMode === 'blast_only' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300'}`}>
              <Flame className="w-3 h-3" /><span>Blast ({sourceNodes.filter((n) => n.data?.isChanged || n.data?.isImpacted).length})</span>
            </button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch}
          className="flex items-center bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-lg backdrop-blur-md">
          <Search className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search node…"
            className="bg-transparent outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 w-24 sm:w-32 text-xs font-mono" />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-3 h-3" />
            </button>
          )}
        </form>

        {/* Isolate subgraph */}
        {activeSelectedNode && (
          <button type="button" onClick={() => setIsIsolated((p) => !p)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer ${isIsolated ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40' : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title={isIsolated ? 'Show full graph' : 'Isolate node & neighbours'}>
            <Split className="w-3 h-3 text-amber-500" />
            <span>{isIsolated ? 'Show All' : 'Isolate'}</span>
          </button>
        )}

        {/* Simulation badge */}
        {isSimulating && (
          <div className={`flex items-center gap-1 border px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md ${simulatedChangeType === 'deleted' ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/60 text-rose-800 dark:text-rose-200' : 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-500/50 text-purple-800 dark:text-purple-200'}`}>
            {simulatedChangeType === 'deleted' ? <Trash2 className="w-3 h-3 text-rose-500 animate-pulse shrink-0" /> : <Zap className="w-3 h-3 text-amber-500 animate-pulse shrink-0" />}
            <span className="font-mono truncate max-w-[100px]">{simulatedFile?.split('/').pop()}</span>
            {onExitSimulation && (
              <button type="button" onClick={onExitSimulation} className="ml-1 p-0.5 rounded text-current opacity-60 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── LEFT VERTICAL CAMERA TOOLBAR ───────────────────────────────────── */}
      {/* Placed on left-center so it never overlaps AI chat on the right */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto flex flex-col items-center gap-1.5">
        <div className="flex flex-col items-center bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-1 gap-0.5">

          <button type="button" onClick={() => camRef.current.zoomIn?.()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>

          <button type="button" onClick={() => camRef.current.zoomOut?.()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-700/80 my-0.5" />

          {/* 1. Fit All Nodes (2D ReactFlow 4-Corner Viewframe Icon) */}
          <button type="button" onClick={() => camRef.current.fit?.()}
            className="p-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 transition-colors cursor-pointer"
            title="Fit View (Screen pe Fit Karein)">
            <FitView2DIcon className="w-3.5 h-3.5" />
          </button>

          {/* 2. Cover Whole Screen (YouTube Style Fullscreen - Maximize2 / Minimize2) */}
          {onToggleFullscreen && (
            <button type="button" onClick={onToggleFullscreen}
              className="p-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Cover Whole Screen (YouTube Style)'}>
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-cyan-500" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-cyan-500" />
              )}
            </button>
          )}

          {activeSelectedNode && (
            <button type="button" onClick={() => camRef.current.focus?.(activeSelectedNode.id)}
              className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-100 transition-colors cursor-pointer"
              title="Focus Selected Node">
              <Focus className="w-4 h-4" />
            </button>
          )}

          <div className="w-full h-px bg-slate-200 dark:bg-slate-700/80 my-0.5" />

          <button type="button" onClick={() => setAutoRotate((p) => !p)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${autoRotate ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            title={autoRotate ? 'Stop Auto Rotate' : 'Start Auto Rotate'}>
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button type="button" onClick={() => camRef.current.reset?.()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Reset Camera">
            <RotateCw className="w-4 h-4" />
          </button>

          <button type="button" onClick={() => camRef.current.resetLayout?.()}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
            title="Reset Node Positions">
            <Move className="w-4 h-4" />
          </button>

          <div className="w-full h-px bg-slate-200 dark:bg-slate-700/80 my-0.5" />

          <button type="button" onClick={() => setShowHelp((p) => !p)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            title="Help & Controls">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* XYZ Orientation Gizmo (below toolbar) */}
        <div className="mt-1 w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md flex items-center justify-center p-1" title="Camera Orientation">
          <canvas ref={gizmoRef} width={52} height={52} className="w-full h-full" />
        </div>
      </div>

      {/* ── BOTTOM-LEFT: Horizontal Node Shapes & Tiers Legend (Matches 2D Graph Style) ── */}
      <div className="absolute bottom-4 left-20 right-[185px] z-20 pointer-events-none hidden sm:flex items-end">
        <div className="bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg dark:shadow-2xl flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-400 flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3 text-[11px] shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Node Shapes &amp; Tiers</span>
          </span>
          {[
            { shape: '◆', label: 'Root Changed', color: 'text-amber-500' },
            { shape: '✦', label: 'Critical', color: 'text-rose-500' },
            { shape: '▲', label: 'High Impact', color: 'text-orange-500' },
            { shape: '■', label: 'Medium Risk', color: 'text-cyan-500' },
            { shape: '⬤', label: 'Impacted File', color: 'text-emerald-500' },
            { shape: '●', label: 'Clean / Stable', color: 'text-slate-500' },
          ].map(({ shape, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] shrink-0">
              <span className={`${color} text-xs leading-none`}>{shape}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HELP MODAL ──────────────────────────────────────────────────────── */}
      {showHelp && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm pointer-events-auto">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xs w-full space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-500" /> 3D Controls
              </h4>
              <button type="button" onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
              {[
                ['Left Drag', 'Rotate camera 360°'],
                ['Shift + Drag / Right Drag', 'Pan the canvas'],
                ['Scroll Wheel', 'Zoom in / out'],
                ['Fit View [ ]', 'Fit all nodes on screen'],
                ['Fullscreen', 'Cover entire display (YouTube style)'],
                ['Click node', 'Select & highlight edges'],
                ['Double-click node', 'Focus camera on node'],
                ['Drag node', 'Reposition in 3D'],
                ['Click empty space', 'Clear selection'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{k}</span>
                  <span className="text-right ml-2 text-slate-600 dark:text-slate-300">{v}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowHelp(false)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-colors">
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ── SELECTED / HOVERED NODE INFO CARD – TOP-RIGHT (Zero conflict with ChangeLens AI button) ── */}
      {(activeSelectedNode || hoveredNode) && (
        <div className="absolute top-14 sm:top-4 right-3 sm:right-4 z-20 pointer-events-auto w-72 max-w-[calc(100vw-32px)] animate-fade-in">
          {(() => {
            const target = activeSelectedNode || hoveredNode;
            const isTargetSelected = activeSelectedNode?.id === target.id;
            const d = target.data || {};
            const isRoot = d.isChanged || d.isDeleted;
            const severity = d.severity;
            const theme = getNodeTheme(target, isSimulating, simulatedFile, simulatedChangeType, isDark);
            return (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-2 border-l-4"
                style={{ borderLeftColor: theme.labelColor }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                        {isRoot ? 'Root Changed' : `Depth ${d.depth ?? 1}`}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                        {isTargetSelected ? 'Selected' : 'Hovered'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-1 truncate" title={target.id}>
                      {target.id?.split('/').pop()}
                    </h4>
                    <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate" title={target.id}>{target.id}</p>
                  </div>
                  {activeSelectedNode && (
                    <button type="button" onClick={() => { setActiveSelectedNode(null); setIsIsolated(false); if (onSelectNode) onSelectNode(null); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Deselect node">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[9px] text-slate-500 block uppercase">Risk Tier</span>
                    <strong style={{ color: theme.labelColor }}>{severity || (isRoot ? 'ROOT MUTATION' : 'CLEAN')}</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                    <span className="text-[9px] text-slate-500 block uppercase">Language</span>
                    <strong className="text-cyan-600 dark:text-cyan-400">{d.language || 'Code'}</strong>
                  </div>
                </div>
                {d.metrics && (
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 dark:text-slate-400 px-0.5 pt-0.5">
                    <span>Direct: <strong className="text-slate-900 dark:text-white">{d.metrics.directDependents ?? 0}</strong></span>
                    <span>Transitive: <strong className="text-slate-900 dark:text-white">{d.metrics.transitiveDependents ?? 0}</strong></span>
                    <span>Exports: <strong className="text-slate-900 dark:text-white">{d.metrics.exportsCount ?? 0}</strong></span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
