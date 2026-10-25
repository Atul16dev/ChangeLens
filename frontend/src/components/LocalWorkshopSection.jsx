import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Folder,
  GitBranch,
  FileCode,
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { checkBridgeStatus, getBridgeChanges, runBridgeScan } from '../services/api.js';

export function LocalWorkshopSection({ onComplete, onFocusGuide }) {
  // Read session code from URL query string if present (e.g. ?session=CL-7842)
  const getInitialSession = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSession = params.get('session');
      if (urlSession) return urlSession.trim().toUpperCase();
      return localStorage.getItem('changelens_last_session') || '';
    } catch {
      return '';
    }
  };

  const [sessionCode, setSessionCode] = useState(getInitialSession);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle' | 'checking' | 'connected' | 'disconnected'
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [uncommittedChanges, setUncommittedChanges] = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(false);

  // Consecutive failure counter to prevent UI flickering on temporary network jitter
  const missedHeartbeatsRef = useRef(0);

  // Analysis Configuration
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [manualFiles, setManualFiles] = useState('');
  const [maxDepth, setMaxDepth] = useState(10);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Dynamic command generator:
  // On localhost: 'npx changelens connect --session=CL-...'
  // On hosted production: attaches --cloud-url=wss://yourdomain.com/api/v1/bridge/tunnel
  // so remote developers' terminals connect to the live hosted server effortlessly!
  const getCommandToRun = () => {
    const session = sessionCode.trim().toUpperCase();
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '');

    let cmd = 'npx changelens connect';
    if (session) {
      cmd += ` --session=${session}`;
    }

    if (!isLocalhost && typeof window !== 'undefined' && window.location.host) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      cmd += ` --cloud-url=${protocol}//${window.location.host}/api/v1/bridge/tunnel`;
    }

    return cmd;
  };

  const commandToRun = getCommandToRun();

  // Copy command to clipboard
  const handleCopyCommand = () => {
    navigator.clipboard.writeText(commandToRun);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2200);
  };

  // Fetch uncommitted Git changes from local machine
  const fetchChanges = useCallback(async (codeToUse, isSilent = false) => {
    const code = (codeToUse || sessionCode).trim().toUpperCase();
    if (!code) return;

    if (!isSilent) {
      setLoadingChanges(true);
    }
    try {
      const res = await getBridgeChanges(code);
      if (res.success && Array.isArray(res.changes)) {
        setUncommittedChanges(res.changes);
      }
    } catch (err) {
      if (!isSilent) {
        console.warn('Failed to fetch local git changes:', err);
      }
    } finally {
      if (!isSilent) {
        setLoadingChanges(false);
      }
    }
  }, [sessionCode]);

  // Poll / Check bridge connection status
  // isSilent = true means background heartbeat (never triggers 'checking' spinner or drops UI)
  const checkStatus = useCallback(async (codeToCheck, isSilent = false) => {
    const code = (codeToCheck || sessionCode).trim().toUpperCase();
    if (!code) {
      missedHeartbeatsRef.current = 0;
      setConnectionStatus('idle');
      setWorkspaceInfo(null);
      return;
    }

    if (!isSilent) {
      setConnectionStatus('checking');
      setErrorMessage('');
    }

    try {
      const data = await checkBridgeStatus(code);
      if (data.connected && data.workspace) {
        missedHeartbeatsRef.current = 0;
        setConnectionStatus('connected');
        setWorkspaceInfo((prev) => {
          if (
            prev &&
            prev.hostname === data.workspace.hostname &&
            prev.path === data.workspace.path &&
            (prev.gitBranch || prev.branch) === (data.workspace.gitBranch || data.workspace.branch) &&
            prev.uncommittedCount === data.workspace.uncommittedCount
          ) {
            return prev;
          }
          return data.workspace;
        });

        try {
          localStorage.setItem('changelens_last_session', code);
        } catch {}

        // Silently fetch changes in background
        fetchChanges(code, true);
      } else {
        if (isSilent) {
          missedHeartbeatsRef.current += 1;
          // Only show disconnected after 3 consecutive failed heartbeats (approx 12s)
          if (missedHeartbeatsRef.current >= 3) {
            setConnectionStatus('disconnected');
            setWorkspaceInfo(null);
          }
        } else {
          missedHeartbeatsRef.current = 3;
          setConnectionStatus('disconnected');
          setWorkspaceInfo(null);
        }
      }
    } catch (err) {
      if (isSilent) {
        missedHeartbeatsRef.current += 1;
        if (missedHeartbeatsRef.current >= 3) {
          setConnectionStatus('disconnected');
          setWorkspaceInfo(null);
        }
      } else {
        missedHeartbeatsRef.current = 3;
        setConnectionStatus('disconnected');
        setWorkspaceInfo(null);
      }
    }
  }, [sessionCode, fetchChanges]);

  // Auto-check on mount if session code is present
  useEffect(() => {
    if (sessionCode.trim()) {
      checkStatus(sessionCode.trim(), false);
    }
  }, []);

  // Periodic heartbeat poll (every 4 seconds) - SILENT background check
  useEffect(() => {
    const trimmed = sessionCode.trim();
    if (!trimmed) return;
    const interval = setInterval(() => {
      checkStatus(trimmed, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [sessionCode, checkStatus]);

  // Trigger Blast Radius Scan
  const handleRunScan = async (e) => {
    e?.preventDefault();
    if (connectionStatus !== 'connected') {
      setErrorMessage('Please connect your local terminal agent first using "npx changelens connect".');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const changedFiles =
        mode === 'manual' && manualFiles.trim()
          ? manualFiles.split(',').map((f) => f.trim()).filter(Boolean)
          : [];

      const result = await runBridgeScan(sessionCode.trim().toUpperCase(), {
        changedFiles,
        maxDepth: Number(maxDepth) || 10,
        mode,
      });

      setSuccessMessage(`Blast Radius calculated successfully! Risk: ${result.riskLevel || 'ANALYZED'}`);

      // Pass result back to Dashboard
      if (onComplete) {
        setTimeout(() => {
          onComplete(result);
        }, 500);
      }
    } catch (err) {
      console.error('Local bridge scan failed:', err);
      setErrorMessage(err.message || 'Blast radius scan failed on local agent.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* ─── TOP HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
              OFFLINE & PRIVATE WORKSPACE BRIDGE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
              v1.0 AST Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Connect Local Machine & VS Code
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Scan your local projects directly from your hard drive (<code className="text-amber-300 font-mono">C:\</code> or <code className="text-amber-300 font-mono">D:\</code>) without pushing to GitHub. Tree-Sitter AST parsing runs completely offline on your laptop.
          </p>
        </div>

        {onFocusGuide && (
          <button
            type="button"
            onClick={onFocusGuide}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-amber-500 text-slate-200 hover:text-white font-semibold text-xs transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Connection Steps</span>
          </button>
        )}
      </div>

      {/* ─── STEP 1: TERMINAL COMMAND RUNNER (ONE-CLICK COPY) ────────── */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Step 1: Run Bridge Agent in Your Terminal</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Zero installation • Powered by npx</span>
        </div>

        <p className="text-[11px] text-slate-400 mb-3">
          Open your project in VS Code or Terminal, and run this single command to bridge your local files securely:
        </p>

        {/* Copyable Terminal Command Block */}
        <div className="relative group">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-amber-300 shadow-md overflow-x-auto">
            <span className="select-all">{commandToRun}</span>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-700/60 text-amber-200 hover:text-white text-xs font-sans font-semibold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 outline-none focus:outline-none"
              title="Copy command to clipboard"
            >
              {copiedCommand ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── STEP 2: SESSION PAIRING & LIVE STATUS ───────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label htmlFor="bridge-session-input" className="block text-xs font-bold text-slate-200">
            Step 2: Session Pairing Token
          </label>
          <span className="text-[11px] text-slate-400">
            Generated by the terminal CLI (e.g. <code className="text-amber-400">CL-7842</code>)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="bridge-session-input"
            type="text"
            value={sessionCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setSessionCode(val);
              if (!val.trim()) {
                setConnectionStatus('idle');
                setWorkspaceInfo(null);
                missedHeartbeatsRef.current = 0;
              }
            }}
            placeholder="e.g. CL-7842"
            maxLength={10}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none focus:outline-none transition-colors uppercase"
          />
          <button
            type="button"
            onClick={() => checkStatus(sessionCode.trim(), false)}
            disabled={connectionStatus === 'checking' || !sessionCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 outline-none focus:outline-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
            <span>Check</span>
          </button>
        </div>

        {/* Connection Status Banner */}
        {connectionStatus === 'connected' && workspaceInfo && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Local Machine Connected ({workspaceInfo.hostname || 'Local Host'})</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                {workspaceInfo.platform || 'windows'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono truncate" title={workspaceInfo.path}>
                  {workspaceInfo.path}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>
                  Branch: <strong className="text-white font-mono">{workspaceInfo.gitBranch || workspaceInfo.branch || 'main'}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span>
                  <strong className="text-amber-400 font-mono">{workspaceInfo.uncommittedCount ?? uncommittedChanges.length}</strong> dirty files
                </span>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'disconnected' && sessionCode.trim() && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              No active CLI agent detected for session <strong>{sessionCode}</strong>. Make sure <code className="text-amber-300 font-mono">npx changelens connect</code> is running in your terminal.
            </span>
          </div>
        )}
      </div>

      {/* ─── STEP 3: DUAL ANALYSIS MODES CONFIGURATION ───────────────── */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-200">
            Step 3: Select Analysis Mode
          </label>
          <span className="text-[11px] text-slate-400">Choose how to target changed files</span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none focus:outline-none ${
              mode === 'auto'
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${mode === 'auto' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Mode 1: Auto-Detect from Git</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none focus:outline-none ${
              mode === 'manual'
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 ${mode === 'manual' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Mode 2: Custom Target Files</span>
          </button>
        </div>

        {/* Mode 1 Content: Git Auto-Detect Preview */}
        {mode === 'auto' && (
          <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Git Working Tree Changes</span>
              </span>
              <button
                type="button"
                onClick={() => fetchChanges()}
                disabled={loadingChanges}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
              >
                <RefreshCw className={`w-3 h-3 ${loadingChanges ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {uncommittedChanges.length > 0 ? (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                {uncommittedChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-200"
                  >
                    <span className="truncate pr-2">{change.path}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        change.status === 'deleted'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : change.status === 'added' || change.status === 'untracked'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {change.statusCode || change.status || 'M'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                No uncommitted changes detected in local Git working tree. Edit any file in VS Code and it will auto-detect here!
              </p>
            )}
          </div>
        )}

        {/* Mode 2 Content: Comma-Separated Manual Input */}
        {mode === 'manual' && (
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Target Changed Files (Comma-Separated)
            </label>
            <input
              type="text"
              value={manualFiles}
              onChange={(e) => setManualFiles(e.target.value)}
              placeholder="e.g. server/models/user.js, server/controllers/user-controller.js"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 outline-none focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>
                <strong>Smart Path Matching:</strong> You can type partial paths like <code className="text-amber-300 font-mono">user.js</code> and ChangeLens will auto-resolve them to the exact repository location.
              </span>
            </p>
          </div>
        )}

        {/* Traversal Depth Control */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-slate-300">Max Ripple Depth:</span>
          <div className="flex items-center gap-1.5">
            {[5, 10, 20].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMaxDepth(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer outline-none focus:outline-none ${
                  maxDepth === d
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ERROR & SUCCESS ALERTS ─────────────────────────────────── */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ─── ACTION BUTTON ───────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleRunScan}
          disabled={isScanning || connectionStatus !== 'connected'}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-xl shadow-amber-500/25 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus:outline-none"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Calculating Blast Radius on Your Laptop...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Calculate Blast Radius</span>
            </>
          )}
        </button>
      </div>

      {/* ─── PRIVACY GUARANTEE FOOTER ────────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">100% Code Privacy Guarantee:</strong> Your proprietary source code never leaves your computer. ChangeLens runs Tree-Sitter WASM parsers locally on your laptop and only transmits visual dependency graph metadata.
        </p>
      </div>
    </div>
  );
}
