import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header.jsx';
import { GraphViewer } from '../components/GraphViewer.jsx';
import { ImpactSidebar } from '../components/ImpactSidebar.jsx';
import { ChatAssistant } from '../components/ChatAssistant.jsx';
import { HistoryDrawer } from '../components/HistoryDrawer.jsx';
import { GitHubConnectorModal } from '../components/GitHubConnectorModal.jsx';
import { RepoSyncBar } from '../components/RepoSyncBar.jsx';
import { ProjectHub } from '../components/ProjectHub.jsx';
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
} from '../services/api.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');

  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // GitHub Connector Modal state
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);

  // Project Hub state (Full-screen onboarding & project chooser)
  const [isProjectHubOpen, setIsProjectHubOpen] = useState(false);

  // Connected GitHub Repository state (with Cumulative & Single Push tracking)
  const [connectedRepo, setConnectedRepo] = useState(null);

  // What-If Simulator state
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load a previously saved analysis directly from MongoDB / cache
  const loadSavedAnalysis = useCallback(async (analysisId) => {
    setLoading(true);
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
    } catch (err) {
      console.error('Failed to load saved analysis:', err);
      setError(err.message || 'Failed to load saved analysis report');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger analysis pipeline
  const executeAnalysis = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Run analysis endpoint
      const analysisResult = await runImpactAnalysis(options);
      const { analysisId } = analysisResult;
      setCurrentAnalysisId(analysisId);

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
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to complete blast radius analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect a GitHub repository and run baseline audit
  const handleConnectGitHubRepo = useCallback(
    async ({ repoUrl, token }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await connectGitHubRepository({ repoUrl, token });
        const latestSha = data.currentSha;

        // Perform initial sync on latest push
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

        await loadSavedAnalysis(syncResult.analysisId);
        setIsProjectHubOpen(false);
      } catch (err) {
        console.error('Failed to connect GitHub repository:', err);
        setError(err.message || 'Failed to connect GitHub repository');
      } finally {
        setLoading(false);
      }
    },
    [loadSavedAnalysis]
  );

  // Sync ALL pushes cumulatively between lastSyncedSha and currentSha
  const handleSyncAllPushes = useCallback(async () => {
    if (!connectedRepo) return;
    setLoading(true);
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

      await loadSavedAnalysis(syncResult.analysisId);
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

      await loadSavedAnalysis(syncResult.analysisId);
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
      setError(null);
      try {
        const syncResult = await syncGitHubRepositoryCommits({
          repoUrl: connectedRepo.repoUrl,
          token: connectedRepo.token,
          mode: 'single',
          commitSha,
        });

        await loadSavedAnalysis(syncResult.analysisId);
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
    setIsProjectHubOpen(true);
  }, []);

  const handleOpenLocalWorkspace = useCallback(
    async ({ repoPath }) => {
      setConnectedRepo(null);
      setIsProjectHubOpen(false);
      await executeAnalysis({ repoPath });
    },
    [executeAnalysis]
  );

  const handleLaunchDemo = useCallback(async () => {
    setConnectedRepo(null);
    setIsProjectHubOpen(false);
    await executeAnalysis({ changedFiles: ['server/models/user.js'] });
  }, [executeAnalysis]);

  // Simulate What-If impact for any given file
  const handleSimulateNode = useCallback(
    async (filePath, changeType = 'modified') => {
      if (!currentAnalysisId || !filePath) return;
      setLoading(true);
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

  // Check health and run initial analysis on component mount
  useEffect(() => {
    async function init() {
      try {
        await checkBackendHealth();
        setBackendStatus('online');
        // Initial run with default fixture
        executeAnalysis({ changedFiles: ['server/models/user.js'] });
      } catch (err) {
        console.warn('Backend not responding yet:', err.message);
        setBackendStatus('offline');
      }
    }
    init();
  }, [executeAnalysis]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar with Authentication Awareness */}
      <Header
        onAnalyze={executeAnalysis}
        loading={loading}
        backendStatus={backendStatus}
        onRefresh={() => executeAnalysis({ changedFiles: ['server/models/user.js'] })}
        isSimulating={isSimulating}
        simulatedFile={simulationData?.simulatedFile}
        onExitSimulation={handleExitSimulation}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        onOpenProjectHub={() => setIsProjectHubOpen((prev) => !prev)}
      />

      {/* Connected Repository Push Sync Bar */}
      {connectedRepo && (
        <RepoSyncBar
          repoInfo={connectedRepo.repo}
          commits={connectedRepo.latestCommits}
          lastSyncedSha={connectedRepo.lastSyncedSha}
          currentSha={connectedRepo.currentSha}
          loading={loading}
          onSyncAllPushes={handleSyncAllPushes}
          onSyncLatestPush={handleSyncLatestPush}
          onSelectSpecificCommit={handleSelectSpecificCommit}
          onDisconnect={handleDisconnectRepo}
        />
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 px-6 py-2.5 flex items-center justify-between text-rose-200 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Analysis Error:</strong> {error}
            </span>
          </div>
          <button
            onClick={() => setError(null)}
            className="hover:underline text-rose-400 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace OR Onboarding Project Hub */}
      {isProjectHubOpen ? (
        <ProjectHub
          onConnectGitHubRepo={handleConnectGitHubRepo}
          onOpenLocalWorkspace={handleOpenLocalWorkspace}
          onLaunchDemo={handleLaunchDemo}
          loading={loading}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 h-full relative">
            {loading && !effectiveGraphData && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-sm text-slate-300 font-medium">
                  Parsing ASTs & Computing AI Impact Review...
                </p>
              </div>
            )}

            <GraphViewer
              graphData={effectiveGraphData}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              isSimulating={isSimulating}
              simulatedFile={simulationData?.simulatedFile}
              onExitSimulation={handleExitSimulation}
            />

            {/* Context-Aware AI Chatbot docked inside Graph Workspace */}
            <ChatAssistant
              analysisId={currentAnalysisId}
              selectedNodeId={selectedNodeId}
              isSimulating={isSimulating}
              simulatedFile={simulationData?.simulatedFile}
            />
          </main>

          <ImpactSidebar
            impactData={effectiveImpactData}
            explanationData={effectiveExplanationData}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            isSimulating={isSimulating}
            simulatedFile={simulationData?.simulatedFile}
            onSimulateNode={handleSimulateNode}
            onExitSimulation={handleExitSimulation}
          />
        </div>
      )}

      {/* Slide-over Analysis History & Saved Reports Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadAnalysis={loadSavedAnalysis}
        currentAnalysisId={currentAnalysisId}
      />

      {/* GitHub PR Connector Modal */}
      <GitHubConnectorModal
        isOpen={isGitHubOpen}
        onClose={() => setIsGitHubOpen(false)}
        onAnalysisComplete={(analysisId) => loadSavedAnalysis(analysisId)}
        currentAnalysisId={currentAnalysisId}
      />
    </div>
  );
}
