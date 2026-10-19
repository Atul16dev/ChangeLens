import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FolderGit2,
  Calendar,
  Layers,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { getAnalysisHistory, deleteAnalysis } from '../services/api.js';

export function HistoryDrawer({ isOpen, onClose, onLoadAnalysis, currentAnalysisId }) {
  const [analyses, setAnalyses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const fetchHistory = useCallback(async (query = search) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalysisHistory({ search: query, limit: 30 });
      setAnalyses(data.analyses || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError(err.message || 'Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory(search);
  };

  const handleDelete = async (analysisId) => {
    setDeletingId(analysisId);
    try {
      await deleteAnalysis(analysisId);
      setAnalyses((prev) => prev.filter((a) => a.analysisId !== analysisId));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete analysis:', err);
      alert('Could not delete report: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = async (analysisId) => {
    setLoadingId(analysisId);
    try {
      await onLoadAnalysis(analysisId);
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  if (!isOpen) return null;

  const highRiskCount = analyses.filter(
    (a) => a.summary?.riskLevel === 'CRITICAL' || a.summary?.riskLevel === 'HIGH'
  ).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-drawer-title"
          className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col relative z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 id="history-drawer-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Analysis History</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                    {total} Saved
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Cloud-persisted blast radius graphs in MongoDB Atlas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchHistory()}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh history"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Stats Bar */}
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by repo path, changed file, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-20 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition-colors"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Total Reports
                </span>
                <p className="text-base font-bold text-slate-100 mt-0.5">{total}</p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> High Risk
                </span>
                <p className="text-base font-bold text-amber-300 mt-0.5">{highRiskCount}</p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Clean / Low
                </span>
                <p className="text-base font-bold text-emerald-300 mt-0.5">
                  {Math.max(0, analyses.length - highRiskCount)}
                </p>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && analyses.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-950/60 border border-slate-800 rounded-xl p-4 h-28" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-200">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchHistory()}
                  className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 rounded text-xs transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mx-auto">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">No Saved Analyses Found</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    {search
                      ? `No analysis matched "${search}". Try clearing the search filter.`
                      : 'Run a blast radius scan in the workspace and it will automatically appear here.'}
                  </p>
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      fetchHistory('');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              analyses.map((item) => {
                const isSelected = item.analysisId === currentAnalysisId;
                const isConfirmingDelete = deleteConfirmId === item.analysisId;
                const isDeleting = deletingId === item.analysisId;
                const isLoadingThis = loadingId === item.analysisId;

                const riskLevel = item.summary?.riskLevel || 'LOW';
                const riskColor =
                  riskLevel === 'CRITICAL'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : riskLevel === 'HIGH'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : riskLevel === 'MEDIUM'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                const formattedDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={item.analysisId}
                    className={`bg-slate-950/80 border rounded-xl p-4 transition-all ${
                      isSelected
                        ? 'border-cyan-500/80 ring-1 ring-cyan-500/30 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${riskColor}`}>
                            {riskLevel}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-medium border border-cyan-700/40">
                              Active in Workspace
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-100 truncate" title={item.title}>
                          {item.title}
                        </h4>

                        {item.targetDir && (
                          <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                            <FolderGit2 className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{item.targetDir}</span>
                          </p>
                        )}
                      </div>

                      {/* Delete button or confirmation */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/60 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.analysisId)}
                            disabled={isDeleting}
                            className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors"
                          >
                            {isDeleting ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 text-[10px] text-slate-300 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item.analysisId)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Metric pills */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <strong className="text-slate-200">{item.summary?.affectedFilesCount ?? 0}</strong> impacted
                        </span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <strong className="text-slate-200">{item.summary?.directDependentsCount ?? 0}</strong> direct
                        </span>
                        {(item.summary?.brokenSymbolsCount ?? 0) > 0 && (
                          <span className="bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded font-medium">
                            {item.summary.brokenSymbolsCount} broken
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelect(item.analysisId)}
                        disabled={isLoadingThis || isSelected}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-slate-400 cursor-default'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                        }`}
                      >
                        {isLoadingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Loading...
                          </>
                        ) : isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                            Loaded
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            Load in Workspace
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
