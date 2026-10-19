import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.jsx';
import { GraphViewer } from './components/GraphViewer.jsx';
import { ImpactSidebar } from './components/ImpactSidebar.jsx';
import { ChatAssistant } from './components/ChatAssistant.jsx';
import {
  checkBackendHealth,
  runImpactAnalysis,
  getAnalysisGraph,
  getAnalysisImpact,
  getAnalysisExplanation,
  simulateImpact,
} from './services/api.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');

  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // What-If Simulator state
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

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
      {/* Top Navigation Bar */}
      <Header
        onAnalyze={executeAnalysis}
        loading={loading}
        backendStatus={backendStatus}
        onRefresh={() => executeAnalysis({ changedFiles: ['server/models/user.js'] })}
        isSimulating={isSimulating}
        simulatedFile={simulationData?.simulatedFile}
        onExitSimulation={handleExitSimulation}
      />

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
            className="hover:underline text-rose-400 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: Left Graph Canvas + Right Impact Sidebar */}
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
    </div>
  );
}
