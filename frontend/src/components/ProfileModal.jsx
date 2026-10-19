import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || 'CL';

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await updateProfile({ name: name.trim() });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 id="profile-modal-title" className="text-base font-bold text-white tracking-tight">
              Edit Developer Profile
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Circular Profile Avatar Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-rose-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-lg font-black tracking-wider text-white">
                  {initials}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-slate-950 flex items-center justify-center" title="Active Account">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white truncate">{user.name}</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Joined {memberSince}</span>
              </p>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-300">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Email Address (Read-only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <span className="text-[11px] text-slate-500">Managed via auth</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="profile-email"
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-950/50 border border-slate-800/60 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-400 cursor-not-allowed select-none font-mono text-xs"
                />
              </div>
            </div>

            {/* Account Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Auth Provider</span>
                <span className="text-xs font-medium text-slate-300 capitalize flex items-center gap-1.5 mt-0.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  {user.auth_provider || 'Local Account'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Status</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Developer
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
