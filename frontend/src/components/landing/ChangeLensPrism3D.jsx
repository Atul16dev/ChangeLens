import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Sparkles,
  Move,
  Zap,
  ShieldAlert,
  GitBranch,
  RefreshCw,
  Code2,
  Cpu,
  CheckCircle2,
  Trash2,
  Layers,
} from 'lucide-react';

// ─── INTERACTIVE PRISM SCENARIOS ──────────────────────────────────────────────
const PRISM_SCENARIOS = {
  modified: {
    id: 'modified',
    label: 'Modify Export',
    shortLabel: 'Modify',
    iconType: 'modify',
    inputFile: 'server/models/user.js',
    inputBadge: '-1 / +1 Export AST',
    diffRemoved: '- export function verifyUser(id)',
    diffAdded: '+ export function verifySession(uid, opts)',
    prismColorHex: '#38bdf8',
    prismColorNum: 0x38bdf8,
    accentGlowNum: 0x6366f1,
    verdictLabel: 'CRITICAL BREAK',
    verdictTone: 'rose',
    verdictText: 'Export rename breaks 1 direct caller & ripples across 6 downstream modules.',
    metrics: {
      astNodes: '48 Nodes',
      parseTime: '11 ms',
      hops: '3 Hops',
      brokenRefs: '2 Breaking',
    },
    tiers: [
      {
        id: 'tier-0',
        tierTag: 'Tier 0 • Critical',
        file: 'auth.service.js',
        badgeSub: 'CRITICAL • Line 14',
        status: 'Breaking',
        colorHex: '#f43f5e',
        colorNum: 0xf43f5e,
        snippet: 'import { verifyUser } // Missing export!',
        detail: 'Unresolved symbol reference will throw SyntaxError at startup.',
        subFiles: ['jwt.helper.js'],
      },
      {
        id: 'tier-1',
        tierTag: 'Tier 1 • Direct',
        file: 'auth.controller.js',
        badgeSub: 'HIGH RISK • Lv 1',
        status: 'High',
        colorHex: '#f59e0b',
        colorNum: 0xf59e0b,
        snippet: 'await authService.login(req.body)',
        detail: 'Direct consumer invokes broken verification path during login.',
        subFiles: ['oauth.ctrl.js', 'session.mw.js'],
      },
      {
        id: 'tier-2',
        tierTag: 'Tier 2 • Transitive',
        file: 'user.routes.js',
        badgeSub: 'TRANSITIVE • Lv 2',
        status: 'Route',
        colorHex: '#06b6d4',
        colorNum: 0x06b6d4,
        snippet: 'router.post("/login", authCtrl.login)',
        detail: 'Express route pipeline exposed to runtime auth failures.',
        subFiles: ['api.index.js'],
      },
      {
        id: 'tier-3',
        tierTag: 'Tier 3 • Safe Leaf',
        file: 'LoginModal.jsx',
        badgeSub: 'CLEAN LEAF • Lv 3',
        status: 'Clean',
        colorHex: '#10b981',
        colorNum: 0x10b981,
        snippet: 'fetch("/api/v1/auth/login")',
        detail: 'REST contract payload unchanged; UI layer isolated cleanly.',
        subFiles: [],
      },
    ],
  },
  deleted: {
    id: 'deleted',
    label: 'Delete File',
    shortLabel: 'Delete',
    iconType: 'delete',
    inputFile: 'server/utils/token.js',
    inputBadge: 'FILE DELETED',
    diffRemoved: '- DELETED server/utils/token.js',
    diffAdded: '! 5 ES import statements orphaned',
    prismColorHex: '#f43f5e',
    prismColorNum: 0xf43f5e,
    accentGlowNum: 0xe11d48,
    verdictLabel: 'BUILD FAILURE',
    verdictTone: 'rose',
    verdictText: 'Module removal triggers cascading MODULE_NOT_FOUND crashes across backend routes.',
    metrics: {
      astNodes: '64 Nodes',
      parseTime: '9 ms',
      hops: '4 Hops',
      brokenRefs: '5 Orphaned',
    },
    tiers: [
      {
        id: 'tier-0',
        tierTag: 'Tier 0 • Orphaned',
        file: 'authMiddleware.js',
        badgeSub: 'BROKEN IMPORT • L3',
        status: 'Broken',
        colorHex: '#f43f5e',
        colorNum: 0xf43f5e,
        snippet: 'import jwt from "../utils/token.js"',
        detail: 'Target file no longer exists on disk — Vite/Node bundle fails.',
        subFiles: ['guard.mw.js'],
      },
      {
        id: 'tier-1',
        tierTag: 'Tier 1 • Orphaned',
        file: 'session.service.js',
        badgeSub: 'BROKEN IMPORT • L8',
        status: 'Broken',
        colorHex: '#fb7185',
        colorNum: 0xfb7185,
        snippet: 'const t = signRefreshToken(user)',
        detail: 'Refresh token issuer loses core signing utility dependency.',
        subFiles: ['refresh.ctrl.js', 'logout.ctrl.js'],
      },
      {
        id: 'tier-2',
        tierTag: 'Tier 2 • Guard',
        file: 'admin.routes.js',
        badgeSub: 'HIGH RISK • Lv 2',
        status: 'Blocked',
        colorHex: '#f59e0b',
        colorNum: 0xf59e0b,
        snippet: 'router.use(authMiddleware)',
        detail: 'All protected admin endpoints fail to boot without middleware.',
        subFiles: ['server.js'],
      },
      {
        id: 'tier-3',
        tierTag: 'Tier 3 • Safe Leaf',
        file: 'HealthBanner.jsx',
        badgeSub: 'UNAFFECTED • Lv 3',
        status: 'Clean',
        colorHex: '#10b981',
        colorNum: 0x10b981,
        snippet: 'const status = "healthy"',
        detail: 'Zero AST edge dependency on deleted token module.',
        subFiles: [],
      },
    ],
  },
  safe: {
    id: 'safe',
    label: 'Safe Refactor',
    shortLabel: 'Safe',
    iconType: 'safe',
    inputFile: 'server/helpers/formatDate.js',
    inputBadge: 'Internal Only',
    diffRemoved: '- const tz = "UTC";',
    diffAdded: '+ const tz = normalizeTZ(opts);',
    prismColorHex: '#10b981',
    prismColorNum: 0x10b981,
    accentGlowNum: 0x06b6d4,
    verdictLabel: 'SAFE TO MERGE',
    verdictTone: 'emerald',
    verdictText: 'Public export signature unchanged; all 4 AST dependency tiers verified intact.',
    metrics: {
      astNodes: '31 Nodes',
      parseTime: '8 ms',
      hops: '2 Hops',
      brokenRefs: '0 Breaking',
    },
    tiers: [
      {
        id: 'tier-0',
        tierTag: 'Tier 0 • Verified',
        file: 'invoice.service.js',
        badgeSub: 'SIGNATURE MATCH',
        status: 'Intact',
        colorHex: '#10b981',
        colorNum: 0x10b981,
        snippet: 'formatDate(invoice.issuedAt)',
        detail: 'Exported function parameters and return contract verified identical.',
        subFiles: ['pdf.gen.js'],
      },
      {
        id: 'tier-1',
        tierTag: 'Tier 1 • Verified',
        file: 'report.controller.js',
        badgeSub: 'CONTRACT SAFE',
        status: 'Safe',
        colorHex: '#06b6d4',
        colorNum: 0x06b6d4,
        snippet: 'res.json(buildReport(rows))',
        detail: 'Controller JSON schema remains backwards-compatible.',
        subFiles: ['csv.export.js', 'audit.log.js'],
      },
      {
        id: 'tier-2',
        tierTag: 'Tier 2 • Verified',
        file: 'export.routes.js',
        badgeSub: 'ZERO DRIFT',
        status: 'Safe',
        colorHex: '#38bdf8',
        colorNum: 0x38bdf8,
        snippet: 'router.get("/exports", list)',
        detail: 'No broken transitive paths across API route tree.',
        subFiles: ['router.js'],
      },
      {
        id: 'tier-3',
        tierTag: 'Tier 3 • Safe Leaf',
        file: 'BillingCard.jsx',
        badgeSub: 'CLEAN UI',
        status: 'Clean',
        colorHex: '#34d399',
        colorNum: 0x34d399,
        snippet: '<time>{invoice.dateLabel}</time>',
        detail: 'Frontend rendering unaffected; ready for automated merge.',
        subFiles: [],
      },
    ],
  },
};

// Cross-browser rounded rectangle helper for offscreen CanvasTexture badges
function roundedRectPath(ctx, x, y, w, h, r) {
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

function createBadgeTexture(title, subtitle, hexColor, isDark, compact = false) {
  const canvas = document.createElement('canvas');
  canvas.width = compact ? 300 : 380;
  canvas.height = compact ? 64 : 84;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  roundedRectPath(ctx, 4, 4, w - 8, h - 8, compact ? 14 : 18);
  ctx.fillStyle = isDark ? 'rgba(10, 17, 32, 0.90)' : 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = hexColor;
  ctx.stroke();

  // Status dot
  ctx.beginPath();
  ctx.arc(compact ? 24 : 28, h / 2, compact ? 6 : 8, 0, Math.PI * 2);
  ctx.fillStyle = hexColor;
  ctx.fill();

  // Primary filename
  ctx.font = compact
    ? '700 21px ui-monospace, SFMono-Regular, Menlo, monospace'
    : '700 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, compact ? 40 : 48, subtitle ? h / 2 - 12 : h / 2);

  // Secondary subtitle
  if (subtitle) {
    ctx.font = '700 16px ui-monospace, SFMono-Regular, Menlo, sans-serif';
    ctx.fillStyle = hexColor;
    ctx.fillText(subtitle, compact ? 40 : 48, h / 2 + 15);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function ChangeLensPrism3D() {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  const [isHovered, setIsHovered] = useState(false);
  const [scenarioKey, setScenarioKey] = useState('modified');
  const [hoveredTierIdx, setHoveredTierIdx] = useState(null);

  const shockwaveIntensity = useRef(0);
  const scenarioKeyRef = useRef(scenarioKey);
  const hoveredTierIdxRef = useRef(hoveredTierIdx);
  const syncVisualsRef = useRef(null);

  useEffect(() => {
    scenarioKeyRef.current = scenarioKey;
    hoveredTierIdxRef.current = hoveredTierIdx;
  }, [scenarioKey, hoveredTierIdx]);

  const activeScenario = PRISM_SCENARIOS[scenarioKey];
  const inspectedTier =
    hoveredTierIdx !== null && activeScenario.tiers[hoveredTierIdx]
      ? activeScenario.tiers[hoveredTierIdx]
      : null;

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    const initialScenario = PRISM_SCENARIOS[scenarioKeyRef.current];

    // --- 1. SCENE, CAMERA, RENDERER ---
    const scene = new THREE.Scene();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(0, 0.25, aspect < 1.35 ? 10.8 : 9.1);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.25 : 1.15;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // --- 2. LIGHTING ---
    const ambientLight = new THREE.AmbientLight(isDark ? 0x1e293b : 0xffffff, isDark ? 1.8 : 2.5);
    scene.add(ambientLight);

    const pointLightCyan = new THREE.PointLight(initialScenario.prismColorNum, isDark ? 4.8 : 3.2, 16);
    pointLightCyan.position.set(-4.2, 2.5, 4);
    scene.add(pointLightCyan);

    const pointLightAccent = new THREE.PointLight(initialScenario.accentGlowNum, isDark ? 4.2 : 2.8, 16);
    pointLightAccent.position.set(4.2, -2.5, 3);
    scene.add(pointLightAccent);

    const pointLightRose = new THREE.PointLight(0xf43f5e, isDark ? 3.0 : 1.8, 12);
    pointLightRose.position.set(2.5, 3.0, -2);
    scene.add(pointLightRose);

    // --- 3. SPATIAL FLOOR CYBER GRID & RADAR BASE (Eliminates Empty Void Feel) ---
    const floorGroup = new THREE.Group();
    floorGroup.position.set(0, -2.25, 0);
    scene.add(floorGroup);

    const gridHelper = new THREE.GridHelper(
      24,
      36,
      isDark ? 0x1e3a5f : 0x94a3b8,
      isDark ? 0x0f172a : 0xcbd5e1
    );
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = isDark ? 0.35 : 0.45;
    floorGroup.add(gridHelper);

    const radarRingGeo1 = new THREE.RingGeometry(1.7, 1.76, 64);
    const radarRingMat1 = new THREE.MeshBasicMaterial({
      color: initialScenario.prismColorNum,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isDark ? 0.35 : 0.45,
    });
    const radarRing1 = new THREE.Mesh(radarRingGeo1, radarRingMat1);
    radarRing1.rotation.x = -Math.PI / 2;
    radarRing1.position.y = 0.02;
    floorGroup.add(radarRing1);

    const radarRingGeo2 = new THREE.RingGeometry(3.2, 3.24, 64);
    const radarRingMat2 = new THREE.MeshBasicMaterial({
      color: isDark ? 0x6366f1 : 0x4f46e5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isDark ? 0.2 : 0.28,
    });
    const radarRing2 = new THREE.Mesh(radarRingGeo2, radarRingMat2);
    radarRing2.rotation.x = -Math.PI / 2;
    radarRing2.position.y = 0.02;
    floorGroup.add(radarRing2);

    // Expanding shockwave ring mesh (hidden until Pulse Shockwave triggered)
    const shockRingGeo = new THREE.RingGeometry(0.9, 1.05, 48);
    const shockRingMat = new THREE.MeshBasicMaterial({
      color: initialScenario.prismColorNum,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.y = -2.18;
    scene.add(shockRing);

    // --- 4. CENTRAL AST REFRACTION PRISM ---
    const prismGroup = new THREE.Group();
    scene.add(prismGroup);

    const crystalGeo = new THREE.OctahedronGeometry(1.38, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x1e293b : 0xe0f2fe,
      emissive: initialScenario.prismColorNum,
      emissiveIntensity: isDark ? 0.25 : 0.18,
      roughness: 0.1,
      metalness: 0.15,
      transmission: 0.82,
      ior: 1.52,
      thickness: 1.8,
      transparent: true,
      opacity: isDark ? 0.88 : 0.92,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    prismGroup.add(crystalMesh);

    const wireframeGeo = new THREE.WireframeGeometry(crystalGeo);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: initialScenario.prismColorNum,
      transparent: true,
      opacity: isDark ? 0.85 : 0.9,
    });
    const wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
    prismGroup.add(wireframeMesh);

    // Inner AST Nucleus
    const coreGeo = new THREE.IcosahedronGeometry(0.54, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: initialScenario.prismColorNum,
      emissive: initialScenario.accentGlowNum,
      emissiveIntensity: isDark ? 1.5 : 1.0,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    prismGroup.add(coreMesh);

    // Dual Gyro Scanner Rings + Orbital Telemetry Nodes
    const ringGeo1 = new THREE.TorusGeometry(1.92, 0.022, 16, 96);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: initialScenario.accentGlowNum,
      emissive: initialScenario.accentGlowNum,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 3;
    ringMesh1.rotation.y = Math.PI / 6;
    prismGroup.add(ringMesh1);

    // Small orbital nodes mounted on ringMesh1 so rotation reads clearly
    const satGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    const satMat = new THREE.MeshBasicMaterial({ color: initialScenario.prismColorNum });
    for (let s = 0; s < 4; s++) {
      const angle = (s * Math.PI) / 2;
      const sat = new THREE.Mesh(satGeo, satMat);
      sat.position.set(Math.cos(angle) * 1.92, Math.sin(angle) * 1.92, 0);
      ringMesh1.add(sat);
    }

    const ringGeo2 = new THREE.TorusGeometry(2.22, 0.014, 16, 96);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: initialScenario.prismColorNum,
      emissive: initialScenario.prismColorNum,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.9,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.z = Math.PI / 5;
    prismGroup.add(ringMesh2);

    // Floating Prism Center Tag Sprite
    const prismLabelMat = new THREE.SpriteMaterial({
      map: createBadgeTexture('AST PARSER', 'Refracting Edges', initialScenario.prismColorHex, isDark, true),
      transparent: true,
      depthWrite: false,
    });
    const prismLabelSprite = new THREE.Sprite(prismLabelMat);
    prismLabelSprite.scale.set(1.75, 0.38, 1);
    prismLabelSprite.position.set(0, -1.78, 0.2);
    scene.add(prismLabelSprite);

    // --- 5. LEFT WING: INCIDENT DIFF EMITTER + ANIMATED PHOTON STREAM ---
    const emitterPos = new THREE.Vector3(-3.35, 0.15, 0);
    const emitterGroup = new THREE.Group();
    emitterGroup.position.copy(emitterPos);
    scene.add(emitterGroup);

    const emitterGeo = new THREE.OctahedronGeometry(0.24, 0);
    const emitterMat = new THREE.MeshStandardMaterial({
      color: initialScenario.prismColorNum,
      emissive: initialScenario.prismColorNum,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.85,
    });
    const emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
    emitterGroup.add(emitterMesh);

    const emitterHaloGeo = new THREE.RingGeometry(0.32, 0.38, 32);
    const emitterHaloMat = new THREE.MeshBasicMaterial({
      color: initialScenario.prismColorNum,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const emitterHalo = new THREE.Mesh(emitterHaloGeo, emitterHaloMat);
    emitterHalo.lookAt(camera.position);
    emitterGroup.add(emitterHalo);

    // Faint upstream context nodes (Git Commit & AST Tokens feeding into the Emitter)
    const upstreamTargets = [
      new THREE.Vector3(-4.45, 0.82, -0.35),
      new THREE.Vector3(-4.45, -0.52, 0.35),
    ];
    const upstreamMats = [];
    upstreamTargets.forEach((uPos) => {
      const uCurve = new THREE.LineCurve3(uPos, emitterPos);
      const uGeo = new THREE.TubeGeometry(uCurve, 12, 0.014, 6, false);
      const uMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x38bdf8 : 0x0284c7,
        transparent: true,
        opacity: 0.38,
      });
      upstreamMats.push(uMat);
      scene.add(new THREE.Mesh(uGeo, uMat));

      const uDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: isDark ? 0x67e8f9 : 0x0284c7 })
      );
      uDot.position.copy(uPos);
      scene.add(uDot);
    });

    // Main curved Incident Laser Beam from Emitter -> Prism Center
    const laserCurve = new THREE.QuadraticBezierCurve3(
      emitterPos,
      new THREE.Vector3(-1.7, 0.45, 0.25),
      new THREE.Vector3(0, 0, 0)
    );
    const laserGeo = new THREE.TubeGeometry(laserCurve, 36, 0.036, 8, false);
    const laserMat = new THREE.MeshBasicMaterial({
      color: initialScenario.prismColorNum,
      transparent: true,
      opacity: 0.9,
    });
    scene.add(new THREE.Mesh(laserGeo, laserMat));

    // Traveling Incident Photons flowing Left -> Prism
    const incidentPhotons = [];
    const photonGeo = new THREE.SphereGeometry(0.068, 12, 12);
    for (let p = 0; p < 4; p++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0xffffff : initialScenario.prismColorNum,
        transparent: true,
        opacity: 0.95,
      });
      const pMesh = new THREE.Mesh(photonGeo, pMat);
      scene.add(pMesh);
      incidentPhotons.push({ mesh: pMesh, mat: pMat, offset: p * 0.25 });
    }

    // Floating 3D Badge over Emitter Node
    const inputShortName = initialScenario.inputFile.split('/').pop();
    const emitterSpriteMat = new THREE.SpriteMaterial({
      map: createBadgeTexture(
        inputShortName,
        initialScenario.inputBadge,
        initialScenario.prismColorHex,
        isDark,
        true
      ),
      transparent: true,
      depthWrite: false,
    });
    const emitterSprite = new THREE.Sprite(emitterSpriteMat);
    emitterSprite.scale.set(1.85, 0.42, 1);
    emitterSprite.position.set(emitterPos.x - 0.15, emitterPos.y - 0.62, 0.25);
    scene.add(emitterSprite);

    // --- 6. RIGHT WING: 4 REFRACTED IMPACT BEAMS, 3D LABELS & CASCADE SUB-NODES ---
    const tierTargets = [
      new THREE.Vector3(2.05, 1.25, 0.35),
      new THREE.Vector3(2.40, 0.45, -0.25),
      new THREE.Vector3(2.35, -0.32, 0.30),
      new THREE.Vector3(1.95, -1.02, -0.20),
    ];

    const tierControlOffsets = [
      new THREE.Vector3(1.05, 0.95, 0.32),
      new THREE.Vector3(1.25, 0.38, -0.20),
      new THREE.Vector3(1.25, -0.28, 0.28),
      new THREE.Vector3(1.00, -0.82, -0.18),
    ];

    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const tierObjects = [];
    const tierHitMeshes = [];

    initialScenario.tiers.forEach((tier, idx) => {
      const targetPos = tierTargets[idx];
      const ctrlPos = tierControlOffsets[idx];

      // Curved Optical Beam
      const beamCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), ctrlPos, targetPos);
      const beamGeo = new THREE.TubeGeometry(beamCurve, 32, 0.028, 8, false);
      const beamMat = new THREE.MeshBasicMaterial({
        color: tier.colorNum,
        transparent: true,
        opacity: 0.85,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      nodesGroup.add(beamMesh);

      // Distinct Tier Geometry for fast shape recognition
      let nodeGeo;
      if (idx === 0) nodeGeo = new THREE.OctahedronGeometry(0.22, 0);
      else if (idx === 1) nodeGeo = new THREE.DodecahedronGeometry(0.19, 0);
      else if (idx === 2) nodeGeo = new THREE.BoxGeometry(0.27, 0.27, 0.27);
      else nodeGeo = new THREE.SphereGeometry(0.18, 24, 24);

      const nodeMat = new THREE.MeshStandardMaterial({
        color: tier.colorNum,
        emissive: tier.colorNum,
        emissiveIntensity: isDark ? 1.2 : 0.85,
        roughness: 0.2,
        metalness: 0.8,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(targetPos);
      nodesGroup.add(nodeMesh);

      // Invisible enlarged hit target for effortless raycast hovering
      const hitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.copy(targetPos);
      hitMesh.userData = { tierIdx: idx };
      nodesGroup.add(hitMesh);
      tierHitMeshes.push(hitMesh);

      // Node Outer Halo Ring
      const haloGeo = new THREE.RingGeometry(0.26, 0.32, 28);
      const haloMat = new THREE.MeshBasicMaterial({
        color: tier.colorNum,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.copy(targetPos);
      haloMesh.lookAt(camera.position);
      nodesGroup.add(haloMesh);

      // Traveling Photons along Refracted Beam (Prism -> Node)
      const beamPhotons = [];
      for (let bp = 0; bp < 2; bp++) {
        const bpMat = new THREE.MeshBasicMaterial({
          color: tier.colorNum,
          transparent: true,
          opacity: 0.95,
        });
        const bpMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bpMat);
        nodesGroup.add(bpMesh);
        beamPhotons.push({ mesh: bpMesh, mat: bpMat, offset: bp * 0.5 });
      }

      // 3D Floating File Sprite Badge right next to node
      const spriteMat = new THREE.SpriteMaterial({
        map: createBadgeTexture(tier.file, tier.badgeSub, tier.colorHex, isDark),
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.9, 0.42, 1);
      sprite.position.set(targetPos.x + 1.05, targetPos.y, targetPos.z + 0.12);
      nodesGroup.add(sprite);

      // Secondary Cascade Sub-Branches (shows downstream ripple beyond primary file!)
      const subNodes = [];
      const subCount = idx === 1 ? 2 : idx === 3 ? 0 : 1;
      for (let s = 0; s < subCount; s++) {
        const yOff = subCount === 2 ? (s === 0 ? 0.24 : -0.24) : -0.18;
        const subPos = new THREE.Vector3(targetPos.x + 0.72, targetPos.y + yOff, targetPos.z - 0.35);
        const subCurve = new THREE.LineCurve3(targetPos, subPos);
        const subGeo = new THREE.TubeGeometry(subCurve, 12, 0.012, 6, false);
        const subBeamMat = new THREE.MeshBasicMaterial({
          color: tier.colorNum,
          transparent: true,
          opacity: 0.42,
        });
        const subBeam = new THREE.Mesh(subGeo, subBeamMat);
        nodesGroup.add(subBeam);

        const subSphereMat = new THREE.MeshStandardMaterial({
          color: tier.colorNum,
          emissive: tier.colorNum,
          emissiveIntensity: 0.9,
          roughness: 0.3,
        });
        const subSphere = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), subSphereMat);
        subSphere.position.copy(subPos);
        nodesGroup.add(subSphere);

        subNodes.push({ subBeamMat, subSphereMat, subSphere });
      }

      tierObjects.push({
        idx,
        curve: beamCurve,
        beamMat,
        beamMesh,
        nodeMesh,
        nodeMat,
        haloMesh,
        haloMat,
        beamPhotons,
        spriteMat,
        sprite,
        subNodes,
      });
    });

    // --- 7. AMBIENT AST CODE PARTICLE CLOUD ---
    const particlesCount = 160;
    const particlePositions = new Float32Array(particlesCount * 3);
    const particleColors = new Float32Array(particlesCount * 3);

    const palette = [
      new THREE.Color(isDark ? 0x38bdf8 : 0x0284c7),
      new THREE.Color(isDark ? 0x818cf8 : 0x4f46e5),
      new THREE.Color(isDark ? 0xf43f5e : 0xe11d48),
      new THREE.Color(isDark ? 0x34d399 : 0x059669),
    ];

    for (let i = 0; i < particlesCount; i++) {
      const radius = 2.4 + Math.random() * 5.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.7;

      particlePositions[i * 3] = radius * Math.cos(phi) * Math.sin(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * 0.8;
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
      size: isDark ? 0.065 : 0.072,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.72 : 0.8,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // --- 8. SMOOTH SCENARIO SYNC WITHOUT REMOUNTING WEBGL ---
    syncVisualsRef.current = (newKey) => {
      const sc = PRISM_SCENARIOS[newKey];
      if (!sc) return;

      pointLightCyan.color.setHex(sc.prismColorNum);
      pointLightAccent.color.setHex(sc.accentGlowNum);
      radarRingMat1.color.setHex(sc.prismColorNum);
      shockRingMat.color.setHex(sc.prismColorNum);

      crystalMat.emissive.setHex(sc.prismColorNum);
      wireframeMat.color.setHex(sc.prismColorNum);
      coreMat.color.setHex(sc.prismColorNum);
      coreMat.emissive.setHex(sc.accentGlowNum);
      ringMat1.color.setHex(sc.accentGlowNum);
      ringMat1.emissive.setHex(sc.accentGlowNum);
      ringMat2.color.setHex(sc.prismColorNum);
      ringMat2.emissive.setHex(sc.prismColorNum);
      satMat.color.setHex(sc.prismColorNum);

      emitterMat.color.setHex(sc.prismColorNum);
      emitterMat.emissive.setHex(sc.prismColorNum);
      emitterHaloMat.color.setHex(sc.prismColorNum);
      laserMat.color.setHex(sc.prismColorNum);
      upstreamMats.forEach((uMat) => uMat.color.setHex(sc.prismColorNum));

      // Update Emitter badge texture safely
      if (emitterSpriteMat.map) emitterSpriteMat.map.dispose();
      emitterSpriteMat.map = createBadgeTexture(
        sc.inputFile.split('/').pop(),
        sc.inputBadge,
        sc.prismColorHex,
        isDark,
        true
      );
      emitterSpriteMat.needsUpdate = true;

      if (prismLabelMat.map) prismLabelMat.map.dispose();
      prismLabelMat.map = createBadgeTexture('AST PARSER', sc.metrics.parseTime + ' • Tracing', sc.prismColorHex, isDark, true);
      prismLabelMat.needsUpdate = true;

      // Update all 4 tier nodes, beams, photons, sub-branches & 3D sprites
      sc.tiers.forEach((tier, i) => {
        const obj = tierObjects[i];
        if (!obj) return;

        obj.beamMat.color.setHex(tier.colorNum);
        obj.nodeMat.color.setHex(tier.colorNum);
        obj.nodeMat.emissive.setHex(tier.colorNum);
        obj.haloMat.color.setHex(tier.colorNum);
        obj.beamPhotons.forEach((bp) => bp.mat.color.setHex(tier.colorNum));
        obj.subNodes.forEach((sn) => {
          sn.subBeamMat.color.setHex(tier.colorNum);
          sn.subSphereMat.color.setHex(tier.colorNum);
          sn.subSphereMat.emissive.setHex(tier.colorNum);
        });

        if (obj.spriteMat.map) obj.spriteMat.map.dispose();
        obj.spriteMat.map = createBadgeTexture(tier.file, tier.badgeSub, tier.colorHex, isDark);
        obj.spriteMat.needsUpdate = true;
      });
    };

    // --- 9. MOUSE TILT + RAYCAST HOVER DETECTION (SCOPED TO CARD) ---
    const mouse = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2();
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

      targetRotation.y = mouse.x * 0.75;
      targetRotation.x = -mouse.y * 0.55;

      // Raycast only when cursor is directly over the WebGL canvas (not DOM HUD overlays)
      if (event.target === renderer.domElement) {
        const cRect = container.getBoundingClientRect();
        pointerVec.x = ((event.clientX - cRect.left) / cRect.width) * 2 - 1;
        pointerVec.y = -((event.clientY - cRect.top) / cRect.height) * 2 + 1;
        raycaster.setFromCamera(pointerVec, camera);
        const hits = raycaster.intersectObjects(tierHitMeshes, false);
        const hitTier = hits.length > 0 ? hits[0].object.userData.tierIdx : null;

        container.style.cursor = hitTier !== null ? 'pointer' : 'grab';
        if (hitTier !== hoveredTierIdxRef.current) {
          setHoveredTierIdx(hitTier);
        }
      }
    };

    const handleCanvasClick = () => {
      shockwaveIntensity.current = 1.0;
    };

    const handleMouseLeave = () => {
      isPointerInside = false;
      targetRotation.x = 0;
      targetRotation.y = 0;
      if (hoveredTierIdxRef.current !== null) {
        setHoveredTierIdx(null);
      }
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('click', handleCanvasClick);

    // --- 10. RESIZE OBSERVER ---
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw === 0 || nh === 0) return;

      const newAspect = nw / nh;
      camera.aspect = newAspect;
      camera.position.z = newAspect < 1.35 ? 10.8 : 9.1;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- 11. ANIMATION LOOP (60 FPS) ---
    let animationFrameId;
    const timer = new THREE.Timer();

    const animate = (timestamp) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const elapsedTime = timer.getElapsed();

      // Tilt smoothly on hover or gentle organic float when idle
      if (isPointerInside) {
        prismGroup.rotation.y += (targetRotation.y - prismGroup.rotation.y) * 0.06;
        prismGroup.rotation.x += (targetRotation.x - prismGroup.rotation.x) * 0.06;
      } else {
        const naturalIdleY = Math.sin(elapsedTime * 0.72) * 0.34;
        const naturalIdleX = Math.cos(elapsedTime * 0.5) * 0.15;
        prismGroup.rotation.y += (naturalIdleY - prismGroup.rotation.y) * 0.04;
        prismGroup.rotation.x += (naturalIdleX - prismGroup.rotation.x) * 0.04;
      }

      prismGroup.position.y = Math.sin(elapsedTime * 1.45) * 0.1;
      prismGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.07;

      // Shockwave pulse expansion (crystal impulse + floor radar wave)
      if (shockwaveIntensity.current > 0.01) {
        shockwaveIntensity.current *= 0.92;
        const s = shockwaveIntensity.current;
        const impulseScale = 1 + s * 0.32;
        prismGroup.scale.set(impulseScale, impulseScale, impulseScale);
        ringMesh1.rotation.z += s * 0.09;
        ringMesh2.rotation.y += s * 0.09;

        const waveScale = 1 + (1 - s) * 4.5;
        shockRing.scale.set(waveScale, waveScale, 1);
        shockRingMat.opacity = s * 0.75;
      } else {
        if (prismGroup.scale.x !== 1) prismGroup.scale.set(1, 1, 1);
        shockRingMat.opacity = 0;
      }

      // Core & Gyro rings rotation
      coreMesh.rotation.x = elapsedTime * 0.65;
      coreMesh.rotation.y = elapsedTime * 0.95;
      ringMesh1.rotation.z += 0.008;
      ringMesh2.rotation.y += 0.006;

      // Emitter spin & photon stream flowing Left -> Prism Center
      emitterMesh.rotation.y = elapsedTime * 1.2;
      emitterHalo.lookAt(camera.position);
      const emitterPulse = (Math.sin(elapsedTime * 4.0) + 1) * 0.5;
      emitterHalo.scale.setScalar(1 + emitterPulse * 0.25);

      incidentPhotons.forEach((ph) => {
        const progress = (elapsedTime * 0.55 + ph.offset) % 1;
        laserCurve.getPointAt(progress, ph.mesh.position);
        const fade = Math.sin(progress * Math.PI);
        ph.mat.opacity = 0.25 + fade * 0.75;
        ph.mesh.scale.setScalar(0.8 + fade * 0.45);
      });

      // Tier beams, nodes, photons & hover focus spotlight
      const focusedIdx = hoveredTierIdxRef.current;
      const isDeleteMode = scenarioKeyRef.current === 'deleted';
      const photonSpeed = isDeleteMode ? 0.65 : 0.42;

      tierObjects.forEach((obj) => {
        const isFocused = focusedIdx === obj.idx;
        const isDimmed = focusedIdx !== null && !isFocused;

        // Beam emphasis
        obj.beamMat.opacity = isFocused ? 1.0 : isDimmed ? 0.22 : 0.82;

        // Node rotation & scale
        obj.nodeMesh.rotation.y = elapsedTime * (isFocused ? 1.8 : 0.75);
        obj.nodeMesh.rotation.x = elapsedTime * 0.4;
        const offsetPulse = (Math.sin(elapsedTime * 3.5 + obj.idx * 1.2) + 1) * 0.5;
        const targetScale = isFocused ? 1.42 : isDimmed ? 0.85 : 1 + offsetPulse * 0.14;
        obj.nodeMesh.scale.setScalar(targetScale);

        // Halo billboard
        obj.haloMesh.lookAt(camera.position);
        obj.haloMesh.scale.setScalar((isFocused ? 1.5 : 1 + offsetPulse * 0.25));
        obj.haloMat.opacity = isFocused ? 0.98 : isDimmed ? 0.2 : 0.68;

        // Sprite clarity
        obj.spriteMat.opacity = isFocused ? 1.0 : isDimmed ? 0.35 : 0.96;

        // Outward photons along each beam
        obj.beamPhotons.forEach((bp) => {
          const speed = isFocused ? photonSpeed * 1.4 : photonSpeed;
          const progress = (elapsedTime * speed + bp.offset + obj.idx * 0.12) % 1;
          obj.curve.getPointAt(progress, bp.mesh.position);
          const fade = Math.sin(progress * Math.PI);
          bp.mat.opacity = isDimmed ? 0.15 : 0.3 + fade * 0.7;
          bp.mesh.scale.setScalar(isFocused ? 1.45 : 0.85 + fade * 0.35);
        });

        // Sub-node dimming
        obj.subNodes.forEach((sn) => {
          sn.subBeamMat.opacity = isFocused ? 0.85 : isDimmed ? 0.12 : 0.42;
          sn.subSphere.scale.setScalar(isFocused ? 1.35 : 1.0);
        });
      });

      // Background particle slow drift
      particleSystem.rotation.y = elapsedTime * 0.035;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.02) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      timer.dispose();
      syncVisualsRef.current = null;
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('click', handleCanvasClick);
      resizeObserver.disconnect();

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark]);

  // Trigger smooth in-place 3D transition when user switches scenarios
  const handleSelectScenario = (key) => {
    setScenarioKey(key);
    setHoveredTierIdx(null);
    shockwaveIntensity.current = 0.85;
    if (syncVisualsRef.current) {
      syncVisualsRef.current(key);
    }
  };

  const triggerPulse = () => {
    shockwaveIntensity.current = 1.0;
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full rounded-3xl bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-xl border border-slate-200 dark:border-cyan-500/30 p-3.5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-cyan-950/20 overflow-hidden group transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredTierIdx(null);
      }}
    >
      {/* Ambient backdrop glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* ─── TOP HEADER BAR: Title + Interactive Scenario Switcher ───────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 mb-2.5 border-b border-slate-200 dark:border-slate-800/80 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shadow-inner shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-mono">
                Interactive 3D Simulation
              </span>
              <span className={`text-[11px] font-mono flex items-center gap-1 transition-colors ${isHovered ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                <Move className={`w-3 h-3 ${isHovered ? 'text-cyan-600 dark:text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{isHovered ? 'Tilt & Hover Nodes in 3D' : 'Hover nodes or switch scenarios'}</span>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
              ChangeLens 3D Blast Radius Refraction Prism
            </h3>
          </div>
        </div>

        {/* Interactive Diff Scenario Switcher + Shockwave Button */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            {Object.values(PRISM_SCENARIOS).map((sc) => {
              const isActive = scenarioKey === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? sc.id === 'deleted'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : sc.id === 'safe'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {sc.iconType === 'delete' ? (
                    <Trash2 className="w-3 h-3" />
                  ) : sc.iconType === 'safe' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={triggerPulse}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer group active:scale-95"
            title="Emit AST shockwave pulse"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="hidden sm:inline">Pulse</span>
          </button>
        </div>
      </div>

      {/* ─── WEBGL 3D CANVAS VIEWPORT ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full h-[350px] sm:h-[430px] lg:h-[490px] relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none bg-gradient-to-br from-slate-100 via-sky-50/70 to-indigo-50/70 dark:from-[#060a14] dark:via-[#0b1326] dark:to-[#070d1c] border border-slate-200/90 dark:border-slate-800/90 shadow-inner"
      >
        {/* STAGE 1 HUD (Top-Left): Live Incident Diff Snippet */}
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 p-2 sm:p-2.5 rounded-xl bg-white/95 dark:bg-[#0c1528]/95 border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md max-w-[168px] sm:max-w-[255px] text-left pointer-events-none">
          <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3 shrink-0" />
              <span>1. Incident Diff</span>
            </span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 font-mono text-[8px]">
              INPUT
            </span>
          </div>
          <div className="text-[11px] font-mono font-bold text-slate-900 dark:text-white truncate mb-1.5">
            {activeScenario.inputFile}
          </div>
          <div className="rounded-lg bg-slate-100 dark:bg-[#070c17] border border-slate-200 dark:border-slate-800 p-1.5 font-mono text-[9px] sm:text-[10px] leading-snug space-y-0.5">
            <div className="text-rose-700 dark:text-rose-400 truncate">{activeScenario.diffRemoved}</div>
            <div
              className={`truncate ${
                activeScenario.id === 'deleted'
                  ? 'text-amber-700 dark:text-amber-400 font-semibold'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {activeScenario.diffAdded}
            </div>
          </div>
        </div>

        {/* STAGE 2 HUD (Bottom-Left): AST Refraction Engine Telemetry */}
        <div className="hidden sm:block absolute bottom-4 left-4 z-10 p-2.5 rounded-xl bg-white/95 dark:bg-[#0c1528]/95 border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md w-[235px] text-left pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 shrink-0" />
              <span>2. Optical AST Prism</span>
            </span>
            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[8px] text-slate-500 block uppercase">Parsed</span>
              <strong className="text-slate-900 dark:text-white">{activeScenario.metrics.astNodes}</strong>
            </div>
            <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[8px] text-slate-500 block uppercase">Latency</span>
              <strong className="text-cyan-700 dark:text-cyan-400">{activeScenario.metrics.parseTime}</strong>
            </div>
            <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[8px] text-slate-500 block uppercase">Depth</span>
              <strong className="text-indigo-700 dark:text-indigo-300">{activeScenario.metrics.hops}</strong>
            </div>
            <div className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <span className="text-[8px] text-slate-500 block uppercase">Status</span>
              <strong
                className={
                  activeScenario.id === 'safe'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {activeScenario.metrics.brokenRefs}
              </strong>
            </div>
          </div>
        </div>

        {/* STAGE 3 HUD (Top-Right): Blast Verdict / Hovered Node Live Inspector */}
        <div className="hidden md:block absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-white/95 dark:bg-[#0c1528]/95 border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md w-[250px] text-left pointer-events-none transition-all">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <ShieldAlert
                className={`w-3 h-3 ${
                  activeScenario.verdictTone === 'emerald' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              />
              <span>{inspectedTier ? `Inspecting ${inspectedTier.file}` : '3. AST Impact Verdict'}</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                inspectedTier
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                  : activeScenario.verdictTone === 'emerald'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
              }`}
            >
              {inspectedTier ? inspectedTier.status.toUpperCase() : activeScenario.verdictLabel}
            </span>
          </div>

          {inspectedTier ? (
            <div className="space-y-1">
              <div className="rounded-md bg-slate-100 dark:bg-[#070c17] px-2 py-1 font-mono text-[10px] text-cyan-800 dark:text-cyan-300 border border-slate-200 dark:border-slate-800 truncate">
                {inspectedTier.snippet}
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                {inspectedTier.detail}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
              {activeScenario.verdictText}
            </p>
          )}
        </div>

        {/* STAGE 4 HUD (Bottom-Right): Interactive 4-Tier Spectrum (Hover highlights 3D Beam!) */}
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 z-10 p-2 sm:p-2.5 rounded-xl bg-white/95 dark:bg-[#0c1528]/95 border border-slate-200 dark:border-slate-700/80 shadow-lg backdrop-blur-md w-[178px] sm:w-[250px] text-left pointer-events-auto space-y-1.5">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
              <GitBranch className="w-3 h-3" /> Refracted Tiers
            </span>
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-mono text-[9px]">Hover to trace</span>
          </div>

          <div className="space-y-1 text-[10px] font-mono">
            {activeScenario.tiers.map((tier, idx) => {
              const isRowHovered = hoveredTierIdx === idx;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onMouseEnter={() => setHoveredTierIdx(idx)}
                  onMouseLeave={() => setHoveredTierIdx(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerPulse();
                  }}
                  className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                    isRowHovered
                      ? 'bg-slate-100 dark:bg-slate-800 border-cyan-500/60 shadow-sm scale-[1.02]'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 text-slate-800 dark:text-slate-200">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tier.colorHex, boxShadow: `0 0 6px ${tier.colorHex}` }}
                    />
                    <span className="truncate font-semibold">{tier.file}</span>
                  </span>
                  <span className="font-bold shrink-0 text-[9px]" style={{ color: tier.colorHex }}>
                    {tier.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM TELEMETRY PIPELINE FOOTER ─────────────────────────────────── */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-slate-600 dark:text-slate-400 text-xs gap-2">
        <div className="flex items-center flex-wrap justify-center sm:justify-start gap-2 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
            <span>1. Code Diff</span>
          </span>
          <span className="text-slate-400">➔</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>2. AST Prism</span>
          </span>
          <span className="text-slate-400">➔</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <GitBranch className="w-3 h-3 text-emerald-500" />
            <span>3. Ripple Tiers</span>
          </span>
        </div>

        <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 font-bold shrink-0">
          Real-time WebGL • 60 FPS Raycast
        </span>
      </div>
    </div>
  );
}
