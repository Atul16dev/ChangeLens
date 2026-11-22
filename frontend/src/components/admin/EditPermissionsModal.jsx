import React, { useState, useEffect } from 'react';
import { X, Shield, Crown, Check, AlertCircle, Save } from 'lucide-react';
import { updateUserAccess } from '../../services/adminApi.js';

export function EditPermissionsModal({ isOpen, onClose, targetUser, onUpdated }) {
  const [role, setRole] = useState('admin');
  const [permissions, setPermissions] = useState({
    canModerateFeedback: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canPurgeCache: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetUser) {
      setRole(targetUser.role || 'admin');
      setPermissions({
        canModerateFeedback: Boolean(targetUser.permissions?.canModerateFeedback),
        canViewAnalytics: Boolean(targetUser.permissions?.canViewAnalytics),
        canManageUsers: Boolean(targetUser.permissions?.canManageUsers),
        canPurgeCache: Boolean(targetUser.permissions?.canPurgeCache),
      });
      setError('');
    }
  }, [targetUser]);

  if (!isOpen || !targetUser) return null;

  const handleToggle = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await updateUserAccess(targetUser.id, {
        role,
        permissions: role === 'superadmin' ? {} : permissions,
      });

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update user accessibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Modify Accessibility
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[220px]">
                {targetUser.email}
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

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Details Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {targetUser.name}
              </div>
              <div className="text-[11px] text-slate-500">{targetUser.email}</div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              ID: {targetUser.id.slice(0, 8)}...
            </span>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Assigned Role
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  role === 'admin'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('superadmin')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                  role === 'superadmin'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                Super Admin
              </button>
            </div>
          </div>

          {/* Permissions Matrix */}
          {role === 'superadmin' ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <Crown className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Full Super Admin Ownership</span>
                This user will have unrestricted permissions, including managing roles and inviting other staff members.
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Accessible Modules
              </label>
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                <label className="flex items-center justify-between text-xs cursor-pointer group">
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                    Moderate Feedback & Bug Reports
                  </span>
                  <input
                    type="checkbox"
                    checked={permissions.canModerateFeedback}
                    onChange={() => handleToggle('canModerateFeedback')}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer group">
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                    View Platform Telemetry & AST Metrics
                  </span>
                  <input
                    type="checkbox"
                    checked={permissions.canViewAnalytics}
                    onChange={() => handleToggle('canViewAnalytics')}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer group">
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                    View & Manage User Directory
                  </span>
                  <input
                    type="checkbox"
                    checked={permissions.canManageUsers}
                    onChange={() => handleToggle('canManageUsers')}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer group">
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                    Purge AST Analysis Cache & Storage
                  </span>
                  <input
                    type="checkbox"
                    checked={permissions.canPurgeCache}
                    onChange={() => handleToggle('canPurgeCache')}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                  />
                </label>
              </div>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Save Privileges'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
