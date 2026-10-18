import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.jsx';
import { GraphViewer } from './components/GraphViewer.jsx';
import { ImpactSidebar } from './components/ImpactSidebar.jsx';
import {
  checkBackendHealth,
  runImpactAnalysis,
  getAnalysisGraph,
  getAnalysisImpact,
  getAnalysisExplanation,
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
      setBackendStatus('online');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to complete blast radius analysis');
    } finally {
      setLoading(false);
    }
  }, []);

  // Regenerate explanation with optional Gemini API Key
  const handleRegenerateAI = useCallback(async (apiKey) => {
    if (!currentAnalysisId) return;
    try {
      setLoading(true);
      const updatedExplanation = await getAnalysisExplanation(currentAnalysisId, { apiKey });
      setExplanationData(updatedExplanation);
    } catch (err) {
      console.error('Failed to regenerate AI review:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentAnalysisId]);

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
          {loading && !graphData && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-sm text-slate-300 font-medium">
                Parsing ASTs & Computing AI Impact Review...
              </p>
            </div>
          )}

          <GraphViewer
            graphData={graphData}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </main>

        <ImpactSidebar
          impactData={impactData}
          explanationData={explanationData}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onRegenerateAI={handleRegenerateAI}
        />
      </div>
    </div>
  );
}
