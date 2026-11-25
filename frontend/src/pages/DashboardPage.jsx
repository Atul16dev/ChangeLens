import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header.jsx';
import { GraphViewer } from '../components/GraphViewer.jsx';
import { ImpactSidebar } from '../components/ImpactSidebar.jsx';
import { ChatAssistant } from '../components/ChatAssistant.jsx';
import { HistoryDrawer } from '../components/HistoryDrawer.jsx';
import { GitHubConnectorModal } from '../components/GitHubConnectorModal.jsx';
import { RepoSyncBar } from '../components/RepoSyncBar.jsx';
import { ProjectHub } from '../components/ProjectHub.jsx';
import { AstBlastLoaderOverlay } from '../components/AstScannerLoader3D.jsx';
import { FriendlyValidationModal } from '../components/FriendlyValidationModal.jsx';
import { FeedbackModal } from '../components/FeedbackModal.jsx';
import {
  checkBackendHealth,
  runImpactAnalysis,
  getAnalysisGraph,
  getAnalysisImpact,
  getAnalysisExplanation,
  simulateImpact,
  connectGitHubRepository,
  syncGitHubRepositoryCommits,
  getGitHubRepositoryCommits,
  analyzeGitHubPR,
  getAnalysisHistory,
  getTrackedRepositories,
  trackRepository,
  togglePinTrackedRepository,
  removeTrackedRepository,
} from '../services/api.js';
import { AlertCircle, ShieldAlert, Network, ExternalLink } from 'lucide-react';

export function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Parsing ASTs & Computing AI Impact Review...');
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');

  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Mobile / Tablet Responsive Impact Sidebar State & Primary View Switcher
  const [mobileViewTab, setMobileViewTab] = useState('graph'); // 'graph' | 'findings'
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [sidebarActiveTab, setSidebarActiveTab] = useState('findings'); // 'findings' | 'ai_review' | 'test_impact'

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // GitHub Connector Modal state
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);

  // Feedback & Ratings Modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Project Hub state (Full-screen onboarding & project chooser - default on login if no ?analysisId in URL)
  const [isProjectHubOpen, setIsProjectHubOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('analysisId')) {
          return false;
        }
      } catch {}
    }
    return true;
  });

  // Active Project Hub Tab state ('repo' | 'pr' | 'local' | 'demo') - remembers tab across view transitions
  const [activeHubTab, setActiveHubTab] = useState(() => {
    try {
      return localStorage.getItem('changelens_active_tab') || 'repo';
    } catch {
      return 'repo';
    }
  });

  // Demo Playground mode indicator
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Recent analyses cache for Project Hub quick resume
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  // Tracked Repositories Hub state (Phase 8 & 10)
  const [trackedRepos, setTrackedRepos] = useState([]);
  const [loadingTrackedRepos, setLoadingTrackedRepos] = useState(false);

  // Connected GitHub Repository state (with Cumulative & Single Push tracking)
  const [connectedRepo, setConnectedRepo] = useState(null);

  // What-If Simulator state
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Active analyzed workspace and target files for header breadcrumb
  const [activeTargetContext, setActiveTargetContext] = useState({
    repoPath: '',
    changedFiles: [],
  });

  // Fetch and refresh recent analyses list (scoped to max 6 latest items)
  const refreshRecentAnalyses = useCallback(async () => {
    try {
      const historyRes = await getAnalysisHistory({ limit: 6 }).catch(() => null);
      if (historyRes && Array.isArray(historyRes.analyses)) {
        setRecentAnalyses(historyRes.analyses.slice(0, 6));
      }
    } catch (err) {
      console.warn('Failed to refresh recent analyses:', err);
    }
  }, []);

  // Fetch and refresh user's Tracked Repositories Hub
  const refreshTrackedRepos = useCallback(async () => {
    setLoadingTrackedRepos(true);
    try {
      const list = await getTrackedRepositories();
      setTrackedRepos(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load tracked repositories:', err);
    } finally {
      setLoadingTrackedRepos(false);
    }
  }, []);

  const handleTrackRepo = useCallback(
    async ({ repoUrl, token, isPinned = false, metadata = null }) => {
      const result = await trackRepository({ repoUrl, token, isPinned, metadata });
      await refreshTrackedRepos();
      return result;
    },
    [refreshTrackedRepos]
  );

  const handleTogglePinRepo = useCallback(
    async (id) => {
      await togglePinTrackedRepository(id);
      await refreshTrackedRepos();
    },
    [refreshTrackedRepos]
  );

  const handleRemoveTrackedRepo = useCallback(
    async (id) => {
      await removeTrackedRepository(id);
      setTrackedRepos((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  // Synchronize active analysisId with browser URL query parameter without triggering full reload
  const updateUrlAnalysisId = useCallback((analysisId, isDemo = false) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (analysisId) {
        localStorage.setItem('changelens_last_analysis_id', analysisId);
        if (url.searchParams.get('analysisId') !== analysisId) {
          url.searchParams.set('analysisId', analysisId);
        }
        if (isDemo) {
          url.searchParams.set('demo', 'true');
        } else {
          url.searchParams.delete('demo');
        }
        window.history.replaceState(null, '', url.pathname + url.search);
      } else {
        localStorage.removeItem('changelens_last_analysis_id');
        if (url.searchParams.has('analysisId') || url.searchParams.has('demo')) {
          url.searchParams.delete('analysisId');
          url.searchParams.delete('demo');
          window.history.replaceState(null, '', url.pathname + (url.search || ''));
        }
      }
    } catch (err) {
      console.warn('Failed to update URL analysisId:', err);
    }
  }, []);

  // Load a previously saved analysis directly from MongoDB / cache
  const loadSavedAnalysis = useCallback(async (analysisId, { manageLoading = true, onSuccess = null } = {}) => {
    if (manageLoading) {
      setLoading(true);
      setLoadingMessage('Loading Saved AST Graph & Impact Telemetry...');
    }
    setError(null);
    try {
      setCurrentAnalysisId(analysisId);
      const [graphRes, impactRes, explanationRes] = await Promise.all([
        getAnalysisGraph(analysisId),
        getAnalysisImpact(analysisId),
        getAnalysisExplanation(analysisId).catch((err) => {
          console.warn('AI explanation unavailable:', err);
          return null;
        }),
      ]);

      setGraphData(graphRes);
      setImpactData(impactRes);
      setExplanationData(explanationRes);
      setSelectedNodeId(null);
      setSimulationData(null);
      setIsSimulating(false);
      setBackendStatus('online');

      const targetDir = impactRes?.summary?.targetDir || '';
      const targetChangedFiles = impactRes?.summary?.changedFiles || [];
      const isDemo =
        targetDir.includes('mern-sample') ||
        (typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('demo') === 'true');
      setIsDemoMode(isDemo);
      updateUrlAnalysisId(analysisId, isDemo);

      setActiveTargetContext({
        repoPath: targetDir,
        changedFiles: Array.isArray(targetChangedFiles) ? targetChangedFiles : [],
      });
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      console.error('Failed to load saved analysis:', err);
      setError(err.message || 'Failed to load saved analysis report');
      return false;
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  }, [updateUrlAnalysisId]);

  const handleOpenSavedReport = useCallback(
    async (id) => {
      setIsDemoMode(false);
      await loadSavedAnalysis(id, {
        onSuccess: () => {
          setIsProjectHubOpen(false);
          updateUrlAnalysisId(id, false);
        },
      });
    },
    [loadSavedAnalysis, updateUrlAnalysisId]
  );

  // Trigger analysis pipeline
  const executeAnalysis = useCallback(async (options = {}, { onSuccess = null } = {}) => {
    setLoading(true);
    setLoadingMessage('Initializing analysis worker & scanning ASTs...');
    setError(null);

    try {
      // 1. Run analysis endpoint (with live progress tracking)
      const analysisResult = await runImpactAnalysis({
        ...options,
        onProgress: ({ progress, stage }) => {
          if (stage) {
            setLoadingMessage(`${stage} (${progress || 0}%)`);
          }
        },
      });
      const { analysisId } = analysisResult;
      setCurrentAnalysisId(analysisId);
      updateUrlAnalysisId(analysisId, isDemoMode);

      // 2. Fetch graph, impact findings, and AI PR explanation in parallel
      const [graphRes, impactRes, explanationRes] = await Promise.all([
        getAnalysisGraph(analysisId),
        getAnalysisImpact(analysisId),
        getAnalysisExplanation(analysisId).catch((err) => {
          console.warn('AI explanation unavailable:', err);
          return null;
        }),
      ]);

      setGraphData(graphRes);
      setImpactData(impactRes);
      setExplanationData(explanationRes);
      setSelectedNodeId(null);
      setSimulationData(null);
      setIsSimulating(false);
      setBackendStatus('online');

      const targetDir = impactRes?.summary?.targetDir || '';
      const targetChangedFiles = impactRes?.summary?.changedFiles || [];
      setActiveTargetContext({
        repoPath: targetDir,
        changedFiles: Array.isArray(targetChangedFiles) ? targetChangedFiles : [],
      });
      if (onSuccess) onSuccess();
      refreshRecentAnalyses();
      return true;
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to complete blast radius analysis');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshRecentAnalyses, updateUrlAnalysisId, isDemoMode]);

  // Connect a GitHub repository and run baseline audit
  const handleConnectGitHubRepo = useCallback(
    async ({ repoUrl, token, saveToHub = false }) => {
      setActiveHubTab('repo');
      try {
        localStorage.setItem('changelens_active_tab', 'repo');
      } catch {}
      setLoading(true);
      setLoadingMessage('Connecting to GitHub Repository & Fetching Commit History...');
      setError(null);
      setIsDemoMode(false);
      try {
        const data = await connectGitHubRepository({ repoUrl, token });
        const latestSha = data.currentSha;

        if (saveToHub) {
          trackRepository({ repoUrl, token, metadata: data.repo }).catch(() => {});
        }

        // Perform initial sync on latest push
        setLoadingMessage('Scanning Repository ASTs & Calculating Blast Radius...');
        const syncResult = await syncGitHubRepositoryCommits({
          repoUrl,
          token,
          mode: 'single',
          commitSha: latestSha,
        });

        setConnectedRepo({
          repo: data.repo,
          defaultBranch: data.repo.defaultBranch,
          latestCommits: data.latestCommits || [],
          currentSha: latestSha,
          lastSyncedSha: latestSha,
          token,
          repoUrl,
        });

        setLoadingMessage('Building Interactive 2D / 3D Dependency Graph...');
        const loaded = await loadSavedAnalysis(syncResult.analysisId, { manageLoading: false });
        if (loaded) {
          setIsProjectHubOpen(false);
          refreshRecentAnalyses();
          refreshTrackedRepos();
        }
      } catch (err) {
        console.error('Failed to connect GitHub repository:', err);
        setError(err.message || 'Failed to connect GitHub repository');
      } finally {
        setLoading(false);
      }
    },
    [loadSavedAnalysis, refreshRecentAnalyses, refreshTrackedRepos]
  );

  // Directly analyze a GitHub PR from Project Hub
  const handleAnalyzeGitHubPR = useCallback(
    async ({ prUrl, token }) => {
      setActiveHubTab('pr');
      try {
        localStorage.setItem('changelens_active_tab', 'pr');
      } catch {}
      setLoading(true);
      setLoadingMessage('Analyzing Pull Request Diff & Computing Blast Radius...');
      setError(null);
      setIsDemoMode(false);
      setConnectedRepo(null);
      try {
        const result = await analyzeGitHubPR({ prUrl, token });
        const loaded = await loadSavedAnalysis(result.analysisId, { manageLoading: false });
        if (loaded) {
          setIsProjectHubOpen(false);
          refreshRecentAnalyses();
          refreshTrackedRepos();
        }
      } catch (err) {
        console.error('Failed to analyze GitHub PR:', err);
        setError(err.message || 'Failed to analyze GitHub Pull Request');
      } finally {
        setLoading(false);
      }
    },
    [loadSavedAnalysis, refreshRecentAnalyses, refreshTrackedRepos]
  );

  // Sync ALL pushes cumulatively between lastSyncedSha and currentSha
  const handleSyncAllPushes = useCallback(async () => {
    if (!connectedRepo) return;
    setLoading(true);
    setLoadingMessage('Syncing Commits & Recalculating Cumulative Blast Radius...');
    setError(null);
    try {
      // Fetch fresh commits list to detect new pushes
      const commitsData = await getGitHubRepositoryCommits({
        repoUrl: connectedRepo.repoUrl,
        token: connectedRepo.token,
        branch: connectedRepo.defaultBranch,
      });

      const freshCommits = commitsData.commits || [];
      const freshHeadSha =
        freshCommits.length > 0 ? freshCommits[0].sha : connectedRepo.currentSha;

      // Cumulative sync across all pushes since last check
      const syncResult = await syncGitHubRepositoryCommits({
        repoUrl: connectedRepo.repoUrl,
        token: connectedRepo.token,
        mode: 'cumulative',
        baseSha: connectedRepo.lastSyncedSha,
        headSha: freshHeadSha,
      });

      setConnectedRepo((prev) => ({
        ...prev,
        latestCommits: freshCommits,
        currentSha: freshHeadSha,
        lastSyncedSha: freshHeadSha,
      }));

      await loadSavedAnalysis(syncResult.analysisId, { manageLoading: false });
    } catch (err) {
      console.error('Cumulative push sync failed:', err);
      setError(err.message || 'Failed to sync all pushes');
    } finally {
      setLoading(false);
    }
  }, [connectedRepo, loadSavedAnalysis]);

  // Sync ONLY the latest push
  const handleSyncLatestPush = useCallback(async () => {
    if (!connectedRepo) return;
    setLoading(true);
    setLoadingMessage('Fetching Latest Commit & Updating Blast Radius...');
    setError(null);
    try {
      const commitsData = await getGitHubRepositoryCommits({
        repoUrl: connectedRepo.repoUrl,
        token: connectedRepo.token,
        branch: connectedRepo.defaultBranch,
      });

      const freshCommits = commitsData.commits || [];
      const freshHeadSha =
        freshCommits.length > 0 ? freshCommits[0].sha : connectedRepo.currentSha;

      const syncResult = await syncGitHubRepositoryCommits({
        repoUrl: connectedRepo.repoUrl,
        token: connectedRepo.token,
        mode: 'single',
        commitSha: freshHeadSha,
      });

      setConnectedRepo((prev) => ({
        ...prev,
        latestCommits: freshCommits,
        currentSha: freshHeadSha,
        lastSyncedSha: freshHeadSha,
      }));

      await loadSavedAnalysis(syncResult.analysisId, { manageLoading: false });
    } catch (err) {
      console.error('Latest push sync failed:', err);
      setError(err.message || 'Failed to sync latest push');
    } finally {
      setLoading(false);
    }
  }, [connectedRepo, loadSavedAnalysis]);

  // Sync a specific historical commit
  const handleSelectSpecificCommit = useCallback(
    async (commitSha) => {
      if (!connectedRepo || !commitSha) return;
      setLoading(true);
      setLoadingMessage('Analyzing Historical Commit Blast Radius...');
      setError(null);
      try {
        const syncResult = await syncGitHubRepositoryCommits({
          repoUrl: connectedRepo.repoUrl,
          token: connectedRepo.token,
          mode: 'single',
          commitSha,
        });

        await loadSavedAnalysis(syncResult.analysisId, { manageLoading: false });
      } catch (err) {
        console.error('Failed to sync specific commit:', err);
        setError(err.message || 'Failed to sync commit');
      } finally {
        setLoading(false);
      }
    },
    [connectedRepo, loadSavedAnalysis]
  );

  const handleDisconnectRepo = useCallback(() => {
    setConnectedRepo(null);
    setCurrentAnalysisId(null);
    updateUrlAnalysisId(null);
    setGraphData(null);
    setImpactData(null);
    setExplanationData(null);
    setIsProjectHubOpen(true);
  }, [updateUrlAnalysisId]);

  const handleOpenLocalWorkspace = useCallback(
    async ({ repoPath, changedFiles, scanResult } = {}) => {
      setActiveHubTab('local');
      try {
        localStorage.setItem('changelens_active_tab', 'local');
      } catch {}
      setConnectedRepo(null);
      setIsDemoMode(false);

      setActiveTargetContext({
        repoPath: repoPath || '',
        changedFiles: Array.isArray(changedFiles) ? changedFiles : [],
      });

      if (scanResult && scanResult.graph) {
        const id = scanResult.analysisId || `analysis_${Date.now()}`;
        setCurrentAnalysisId(id);
        updateUrlAnalysisId(id, false);
        setGraphData(scanResult.graph);
        const fullImpact =
          scanResult.impactAnalysis &&
          typeof scanResult.impactAnalysis === 'object' &&
          scanResult.impactAnalysis.summary
            ? scanResult.impactAnalysis
            : {
                summary: scanResult.summary || {},
                brokenImports: scanResult.impactAnalysis?.brokenImports || [],
                brokenSymbols: scanResult.impactAnalysis?.brokenSymbols || [],
                staleRenames: scanResult.impactAnalysis?.staleRenames || [],
                blastRadius: Array.isArray(scanResult.impactAnalysis?.blastRadius)
                  ? scanResult.impactAnalysis.blastRadius
                  : [],
                allFindings: scanResult.impactAnalysis?.allFindings || [],
                testImpact: scanResult.testImpact || null,
                riskScore: scanResult.riskScore ?? scanResult.detailedRisk?.score ?? null,
                detailedRisk: scanResult.detailedRisk || null,
              };
        setImpactData(fullImpact);
        setExplanationData(scanResult.impactAnalysis?.explanation || scanResult.explanation || null);
        setSelectedNodeId(null);
        setSimulationData(null);
        setIsSimulating(false);
        setBackendStatus('online');
        setIsProjectHubOpen(false);
        refreshRecentAnalyses();
        return;
      }

      await executeAnalysis(
        { repoPath, changedFiles },
        { onSuccess: () => setIsProjectHubOpen(false) }
      );
    },
    [executeAnalysis, refreshRecentAnalyses, updateUrlAnalysisId]
  );

  const handleLaunchDemo = useCallback(async () => {
    setActiveHubTab('demo');
    try {
      localStorage.setItem('changelens_active_tab', 'demo');
    } catch {}
    setConnectedRepo(null);
    setIsDemoMode(true);
    setActiveTargetContext({
      repoPath: 'mern-sample',
      changedFiles: ['server/models/user.js'],
    });
    await executeAnalysis(
      { changedFiles: ['server/models/user.js'] },
      { onSuccess: () => setIsProjectHubOpen(false) }
    );
  }, [executeAnalysis]);

  // Simulate What-If impact for any given file
  const handleSimulateNode = useCallback(
    async (filePath, changeType = 'modified') => {
      if (!currentAnalysisId || !filePath) return;
      setLoading(true);
      setLoadingMessage(`Simulating Multi-Hop Blast Radius for ${filePath.split('/').pop()}...`);
      setError(null);
      try {
        const simResult = await simulateImpact(currentAnalysisId, {
          simulatedFile: filePath,
          changeType,
        });
        setSimulationData(simResult);
        setIsSimulating(true);
        setSelectedNodeId(filePath);
      } catch (err) {
        console.error('Simulation failed:', err);
        setError(err.message || 'Failed to simulate blast radius');
      } finally {
        setLoading(false);
      }
    },
    [currentAnalysisId]
  );

  // Exit simulation and return to real Git diff changes
  const handleExitSimulation = useCallback(() => {
    setSimulationData(null);
    setIsSimulating(false);
  }, []);

  // Compute effective data (active simulation overrides regular git data)
  const effectiveGraphData = simulationData ? simulationData.graph : graphData;
  const effectiveImpactData = simulationData ? simulationData.impactAnalysis : impactData;
  const effectiveExplanationData = simulationData ? simulationData.explanation : explanationData;

  const currentRiskScore =
    effectiveImpactData?.riskScore ??
    effectiveImpactData?.detailedRisk?.score ??
    effectiveExplanationData?.riskScore ??
    null;
  const currentRiskTier =
    effectiveImpactData?.detailedRisk?.tier ??
    effectiveExplanationData?.riskLevel ??
    'LOW';

  // Smoothly open Risk Score tab in the right-side sidebar without shifting layout
  const handleOpenRisk = useCallback(() => {
    // 1. Close Project Hub if it was open so the analysis graph and sidebar are visible
    setIsProjectHubOpen(false);

    // 2. Switch the right-side sidebar tab directly to 'ai_review' (where RiskGauge is displayed)
    setSidebarActiveTab('ai_review');

    // 3. ONLY if on mobile/small screens (< 1024px), toggle mobile sidebar view
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileViewTab('findings');
      setIsSidebarOpenMobile(true);
    }
  }, []);

  // Check health on mount and auto-restore analysis if ?analysisId= is present in URL
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      try {
        await checkBackendHealth();
        if (!isCancelled) {
          setBackendStatus('online');
          refreshRecentAnalyses();
          refreshTrackedRepos();
        }
      } catch (err) {
        console.warn('Backend not responding yet:', err.message);
        if (!isCancelled) setBackendStatus('offline');
      }

      // Check URL query parameters for ?analysisId=...
      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search);
          const urlAnalysisId = params.get('analysisId');

          if (urlAnalysisId) {
            const success = await loadSavedAnalysis(urlAnalysisId, {
              manageLoading: true,
              onSuccess: () => {
                if (!isCancelled) {
                  setIsProjectHubOpen(false);
                }
              },
            });

            // If analysis was not found (e.g. invalid or expired ID), fall back gracefully to Project Hub
            if (!success && !isCancelled) {
              updateUrlAnalysisId(null);
              setIsProjectHubOpen(true);
            }
          }
        } catch (err) {
          console.warn('Error restoring analysis from URL:', err);
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, [loadSavedAnalysis, refreshRecentAnalyses, refreshTrackedRepos, updateUrlAnalysisId]);

  // Auto-refresh Recent Analyses & Tracked Repos whenever returning to or opening the Project Hub
  useEffect(() => {
    if (isProjectHubOpen) {
      refreshRecentAnalyses();
      refreshTrackedRepos();
    }
  }, [isProjectHubOpen, refreshRecentAnalyses, refreshTrackedRepos]);

  // Compact Validation Popup Modal state for unexpected validation errors in dashboard
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    example: '',
    iconType: 'alert',
    secondaryActionLabel: '',
    onSecondaryAction: null,
    primaryActionLabel: 'Got it',
    onPrimaryAction: null,
  });

  const closeValidationModal = () =>
    setValidationModal((prev) => ({ ...prev, isOpen: false }));

  // Catch API validation errors when in Dashboard and show compact modal
  useEffect(() => {
    if (
      error &&
      !isProjectHubOpen &&
      (error.toLowerCase().includes('invalid') ||
        error.includes('INVALID_') ||
        error.includes('Target repository directory does not exist'))
    ) {
      const isMissingPath = error.includes('Target repository directory does not exist');
      setValidationModal({
        isOpen: true,
        title: isMissingPath ? 'Folder Path Not Found' : 'Invalid Input',
        message: isMissingPath
          ? 'That workspace folder does not exist. Please check the path and try again.'
          : error,
        example: isMissingPath ? 'tests/fixtures/mern-sample' : '',
        iconType: isMissingPath ? 'folder' : 'alert',
        secondaryActionLabel: isMissingPath ? 'Load Demo' : '',
        onSecondaryAction: isMissingPath
          ? () => {
              closeValidationModal();
              setError(null);
              handleLaunchDemo();
            }
          : null,
        primaryActionLabel: 'Got it',
        onPrimaryAction: () => {
          closeValidationModal();
          setError(null);
        },
      });
    }
  }, [error, isProjectHubOpen, handleLaunchDemo]);

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full max-w-full bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar with Authentication Awareness */}
      <Header
        onAnalyze={executeAnalysis}
        loading={loading}
        backendStatus={backendStatus}
        onRefresh={() => {
          if (connectedRepo) {
            handleSyncLatestPush();
          } else if (currentAnalysisId) {
            loadSavedAnalysis(currentAnalysisId);
          } else {
            executeAnalysis();
          }
        }}
        isSimulating={isSimulating}
        simulatedFile={simulationData?.simulatedFile}
        onExitSimulation={handleExitSimulation}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        onOpenProjectHub={() => setIsProjectHubOpen((prev) => !prev)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        isDemoMode={isDemoMode}
        isProjectHubOpen={isProjectHubOpen}
        activeHubTab={activeHubTab}
        activeTargetContext={activeTargetContext}
        riskScore={currentRiskScore}
        riskTier={currentRiskTier}
        onOpenRisk={handleOpenRisk}
      />

      {/* Workspace & Hub Content Region (unified relative container for 3D Blast Loader) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {loading && (
          <AstBlastLoaderOverlay
            badge="3D AST BLAST LOADER"
            message={loadingMessage}
            className="!z-[55]"
          />
        )}

        {/* Connected Repository Push Sync Bar */}
        {connectedRepo && (
          <RepoSyncBar
            repoInfo={connectedRepo.repo}
            commits={connectedRepo.latestCommits}
            lastSyncedSha={connectedRepo.lastSyncedSha}
            currentSha={connectedRepo.currentSha}
            loading={loading}
            isTracked={trackedRepos.some(
              (r) =>
                r.fullName?.toLowerCase() ===
                (connectedRepo.repo?.fullName || `${connectedRepo.repo?.owner}/${connectedRepo.repo?.repo}`).toLowerCase()
            )}
            onSaveToTrackedHub={() =>
              handleTrackRepo({
                repoUrl: connectedRepo.repoUrl,
                token: connectedRepo.token,
                metadata: connectedRepo.repo,
              })
            }
            onSyncAllPushes={handleSyncAllPushes}
            onSyncLatestPush={handleSyncLatestPush}
            onSelectSpecificCommit={handleSelectSpecificCommit}
            onDisconnect={handleDisconnectRepo}
          />
        )}

        {/* Error Notification Banner (only shown directly in dashboard if Hub is closed) */}
        {error && !isProjectHubOpen && (
          <div className="bg-rose-50 dark:bg-rose-950/95 border-b border-rose-300 dark:border-rose-500/60 px-6 py-3 flex flex-wrap items-center justify-between text-rose-900 dark:text-rose-200 text-xs backdrop-blur-md gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-950 dark:text-white">Analysis Error:</strong> {error}
                {error.toLowerCase().includes('rate limit') && (
                  <div className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5">
                    GitHub unauthenticated IP rate limit is 60 requests/hr. Supplying a Personal Access Token unlocks 5,000 requests/hr.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {error.toLowerCase().includes('rate limit') && (
                <a
                  href="https://github.com/settings/tokens/new?description=ChangeLens&scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/80 dark:hover:bg-rose-800 text-rose-900 dark:text-white rounded-lg font-medium border border-rose-300 dark:border-rose-600/50 flex items-center gap-1 transition-colors"
                >
                  <span>Generate Free Token (30s)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => {
                  setIsProjectHubOpen(true);
                }}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
              >
                Enter Token in Hub
              </button>
              <button
                onClick={() => setError(null)}
                className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-white font-bold ml-2 cursor-pointer text-sm"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace OR Onboarding Project Hub */}
        {isProjectHubOpen ? (
          <ProjectHub
            initialActiveMode={activeHubTab}
            onActiveModeChange={(mode) => {
              setActiveHubTab(mode);
              try {
                localStorage.setItem('changelens_active_tab', mode);
              } catch {}
            }}
            onConnectGitHubRepo={handleConnectGitHubRepo}
            onAnalyzeGitHubPR={handleAnalyzeGitHubPR}
            onOpenLocalWorkspace={handleOpenLocalWorkspace}
            onLaunchDemo={handleLaunchDemo}
            recentAnalyses={recentAnalyses}
            onLoadSavedAnalysis={handleOpenSavedReport}
            trackedRepos={trackedRepos}
            loadingTrackedRepos={loadingTrackedRepos}
            onTrackRepo={handleTrackRepo}
            onTogglePinRepo={handleTogglePinRepo}
            onRemoveTrackedRepo={handleRemoveTrackedRepo}
            loading={loading}
            apiError={error}
            onClearApiError={() => setError(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Primary Mobile Navigation Switcher: [ 🌐 Graph ] [ 🛡️ Findings (N) ] (Visible on < lg, hidden on lg+) */}
            <div className="lg:hidden shrink-0 px-3 py-1.5 bg-slate-100/95 dark:bg-[#0c1220]/95 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md flex items-center justify-center z-30">
              <div className="grid grid-cols-2 p-1 bg-slate-200/80 dark:bg-[#080d19] rounded-xl border border-slate-300 dark:border-slate-800 w-full max-w-sm shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setMobileViewTab('graph');
                    setIsSidebarOpenMobile(false);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mobileViewTab === 'graph'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileViewTab('findings');
                    setIsSidebarOpenMobile(true);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mobileViewTab === 'findings'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Findings (
                    {effectiveImpactData?.summary?.impactedFilesCount ??
                      effectiveImpactData?.summary?.totalImpactedFiles ??
                      effectiveImpactData?.allFindings?.length ??
                      0}
                    )
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
              <main
                className={`flex-1 h-full relative min-w-0 min-h-0 w-full overflow-hidden ${
                  mobileViewTab === 'findings' ? 'hidden lg:block' : 'block'
                }`}
              >
                <GraphViewer
                  graphData={effectiveGraphData}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  isSimulating={isSimulating}
                  simulatedFile={simulationData?.simulatedFile}
                  simulatedChangeType={simulationData?.changeType}
                  onExitSimulation={handleExitSimulation}
                >
                  {/* Context-Aware AI Chatbot docked inside Graph Workspace (persists in fullscreen mode) */}
                  <ChatAssistant
                    analysisId={currentAnalysisId}
                    selectedNodeId={selectedNodeId}
                    isSimulating={isSimulating}
                    simulatedFile={simulationData?.simulatedFile}
                  />
                </GraphViewer>
              </main>

              <div
                className={`h-full min-w-0 ${
                  mobileViewTab === 'graph' ? 'hidden lg:flex' : 'flex w-full'
                }`}
              >
                <ImpactSidebar
                  analysisId={currentAnalysisId}
                  impactData={effectiveImpactData}
                  explanationData={effectiveExplanationData}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  isSimulating={isSimulating}
                  simulatedFile={simulationData?.simulatedFile}
                  simulatedChangeType={simulationData?.changeType}
                  onSimulateNode={handleSimulateNode}
                  onExitSimulation={handleExitSimulation}
                  isMobileOpen={isSidebarOpenMobile}
                  onCloseMobile={() => {
                    setMobileViewTab('graph');
                    setIsSidebarOpenMobile(false);
                  }}
                  isFullMobileView={mobileViewTab === 'findings'}
                  activeMainTab={sidebarActiveTab}
                  onMainTabChange={setSidebarActiveTab}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Analysis History & Saved Reports Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadAnalysis={handleOpenSavedReport}
        currentAnalysisId={currentAnalysisId}
      />

      {/* GitHub PR Connector Modal */}
      <GitHubConnectorModal
        isOpen={isGitHubOpen}
        onClose={() => setIsGitHubOpen(false)}
        onAnalysisComplete={handleOpenSavedReport}
        currentAnalysisId={currentAnalysisId}
      />

      {/* Feedback & 5-Star Ratings Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentAnalysisId={currentAnalysisId}
      />

      {/* COMPACT INPUT VALIDATION POPUP MODAL */}
      <FriendlyValidationModal
        isOpen={validationModal.isOpen}
        onClose={closeValidationModal}
        title={validationModal.title}
        message={validationModal.message}
        example={validationModal.example}
        iconType={validationModal.iconType}
        secondaryActionLabel={validationModal.secondaryActionLabel}
        onSecondaryAction={validationModal.onSecondaryAction}
        primaryActionLabel={validationModal.primaryActionLabel}
        onPrimaryAction={validationModal.onPrimaryAction}
      />
    </div>
  );
}
