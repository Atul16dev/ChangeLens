import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Activity,
  FileCode,
  MessageSquare,
  Send,
} from 'lucide-react';
import { getUserActivity, addUserNote } from '../../services/adminApi.js';

export function UserActivityModal({ isOpen, onClose, userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState('');

  const loadActivity = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError('');
      const res = await getUserActivity(userId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load user activity.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) loadActivity();
      });
      return () => {
        active = false;
      };
    }
  }, [isOpen, userId, loadActivity]);

  if (!isOpen) return null;

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSubmittingNote(true);
      await addUserNote(userId, { text: noteText.trim() });
      setNoteText('');
      loadActivity();
    } catch (err) {
      setError(err.message || 'Failed to add staff note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const user = data?.user;
  const metrics = data?.metrics || {};
  const isBanned = user?.status === 'banned';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                User Activity Dossier
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Forensic history, usage telemetry, and staff notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500">Compiling user telemetry...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : user ? (
            <>
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white font-bold text-base flex items-center justify-center uppercase shadow-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name?.slice(0, 2) || 'US'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {user.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          user.role === 'superadmin'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : user.role === 'admin'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {user.role}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isBanned
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {user.status || 'active'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 sm:text-right">
                  <div>
                    Joined: <strong className="text-slate-700 dark:text-slate-300">{new Date(user.created_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    Auth: <span className="capitalize font-mono">{user.auth_provider}</span>
                  </div>
                </div>
              </div>

              {/* Banned Alert if Suspended */}
              {isBanned && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Account is currently Banned / Suspended</span>
                  </div>
                  <div className="text-rose-700 dark:text-rose-300">
                    <strong>Reason:</strong> {user.ban_reason || 'No specific reason entered.'}
                  </div>
                  {user.banned_by && (
                    <div className="text-[11px] text-slate-500">
                      Suspended by: {user.banned_by.name || user.banned_by.email} on{' '}
                      {user.banned_at ? new Date(user.banned_at).toLocaleString() : 'N/A'}
                    </div>
                  )}
                </div>
              )}

              {/* Usage Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Analyses</span>
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {metrics.totalAnalyses ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>High Risk</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {metrics.highRiskAnalyses ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Feedbacks</span>
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {metrics.feedbackCount ?? 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Last Active</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {metrics.lastActive ? new Date(metrics.lastActive).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Internal Staff Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Internal Staff Notes ({data.adminNotes?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">Visible only to admins</span>
                </div>

                {/* Notes Timeline */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {!data.adminNotes || data.adminNotes.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No internal notes recorded yet for this account.
                    </div>
                  ) : (
                    data.adminNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <strong className="text-slate-700 dark:text-slate-300">{note.author_name}</strong>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an internal observation or note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !noteText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
