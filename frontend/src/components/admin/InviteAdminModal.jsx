import React, { useState } from 'react';
import {
  X,
  Mail,
  Shield,
  Crown,
  CheckCircle2,
  Copy,
  Clock,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { sendAdminInvite } from '../../services/adminApi.js';

export function InviteAdminModal({ isOpen, onClose, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [permissions, setPermissions] = useState({
    canModerateFeedback: true,
    canViewAnalytics: true,
    canManageUsers: false,
    canPurgeCache: false,
  });
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePermissionToggle = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await sendAdminInvite({
        email: email.trim().toLowerCase(),
        role,
        permissions: role === 'superadmin' ? {} : permissions,
        expiresInHours,
      });

      setSuccessResult(res.data);
      if (onInviteSent) onInviteSent();
    } catch (err) {
      setError(err.message || 'Failed to generate invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successResult?.inviteUrl) {
      navigator.clipboard.writeText(successResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setEmail('');
    setRole('admin');
    setPermissions({
      canModerateFeedback: true,
      canViewAnalytics: true,
      canManageUsers: false,
      canPurgeCache: false,
    });
    setSuccessResult(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Invite Staff Member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Grant Admin or Super Admin privileges via secure invite
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {successResult ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Invitation Generated!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                An invitation email has been scheduled for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {successResult.invitation?.email}
                </span>{' '}
                as a{' '}
                <span className="capitalize font-semibold text-indigo-600 dark:text-indigo-400">
                  {successResult.invitation?.role}
                </span>
                .
              </p>
            </div>

            {/* Direct Link Share Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-left">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>Direct Invitation Link</span>
                <span className="flex items-center gap-1 text-[11px] text-amber-500">
                  <Clock className="w-3 h-3" />
                  Expires in {expiresInHours}h
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successResult.inviteUrl || ''}
                  className="w-full text-xs font-mono bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 select-all truncate text-slate-700 dark:text-slate-300"
                />
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Colleague Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Target Role
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    role === 'admin'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  Super Admin (Co-Owner)
                </button>
              </div>
            </div>

            {/* Role Explanation or Permissions Matrix */}
            {role === 'superadmin' ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <Crown className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Unrestricted System Ownership</span>
                  A Super Admin has full ownership authority, including the ability to invite other admins, promote/demote members, and modify all platform configurations.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Accessibility Permissions
                  </label>
                  <span className="text-[11px] text-slate-400">Customizable scope</span>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <label className="flex items-center justify-between text-xs cursor-pointer group">
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                      Moderate Feedback & Bug Reports
                    </span>
                    <input
                      type="checkbox"
                      checked={permissions.canModerateFeedback}
                      onChange={() => handlePermissionToggle('canModerateFeedback')}
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
                      onChange={() => handlePermissionToggle('canViewAnalytics')}
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
                      onChange={() => handlePermissionToggle('canManageUsers')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer group">
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                      Purge AST Analysis Cache & Cloud Storage
                    </span>
                    <input
                      type="checkbox"
                      checked={permissions.canPurgeCache}
                      onChange={() => handlePermissionToggle('canPurgeCache')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Expiry Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Invite Expiration</span>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value, 10))}
                className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={72}>72 Hours (Default)</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{loading ? 'Generating...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
