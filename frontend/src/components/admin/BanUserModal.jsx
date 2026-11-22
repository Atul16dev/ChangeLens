import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { banUser } from '../../services/adminApi.js';

const PRESET_REASONS = [
  'Repeated spamming or unauthorized feedback submissions',
  'Violation of ChangeLens terms of service and acceptable use',
  'Malicious or abusive code analysis payloads',
  'Suspicious account behavior and security policy infringement',
  'Other / Custom reason',
];

export function BanUserModal({ isOpen, onClose, targetUser, onBanned }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveReason =
      selectedPreset === 'Other / Custom reason'
        ? customReason.trim()
        : selectedPreset;

    if (!effectiveReason) {
      setError('Please provide a reason for the account suspension.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await banUser(targetUser.id, { reason: effectiveReason });
      if (onBanned) onBanned();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to suspend user account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-rose-950/40 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Suspend / Ban User Account
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400/90 mt-1">
                Immediate access lock & session termination
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl">
            <div className="text-xs text-slate-500">Target Account:</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{targetUser.name}</div>
            <div className="text-xs text-slate-500 font-mono">{targetUser.email}</div>
          </div>

          {/* Warning Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
            <strong>Security Warning:</strong> Banning will immediately block all subsequent API requests and prevent the user from logging in.
          </div>

          {/* Reason Preset Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Suspension Reason
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Reason Textarea if "Other" is chosen */}
          {selectedPreset === 'Other / Custom reason' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Detailed Explanation
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain the specific reason for suspension..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-rose-600/20"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{loading ? 'Banning...' : 'Confirm Suspension'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
