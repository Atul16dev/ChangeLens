import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Crown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { verifyAdminInviteToken, acceptAdminInvite } from '../services/adminApi.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check the link from your invitation email.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function verify() {
      try {
        setLoading(true);
        setError('');
        const res = await verifyAdminInviteToken(token);
        if (isMounted) {
          setInviteData(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Invitation token is invalid, expired, or has already been used.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      setError('');
      await acceptAdminInvite({ token });
      await refreshUser();
      setAcceptedSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to activate your invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const isEmailMatch = user && inviteData && user.email?.toLowerCase() === inviteData.email?.toLowerCase();

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/20">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 sticky top-0 z-40">
        <BrandLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle variant="dock" />
          {user && (
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Logged in as <strong className="text-slate-800 dark:text-slate-200">{user.email}</strong>
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {loading || authLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Verifying your invitation credentials...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Invitation Invalid
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
                {error}
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Return to Home
                </Link>
                <Link
                  to="/feedback"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Go to Feedback Hub
                </Link>
              </div>
            </div>
          ) : acceptedSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Welcome to the Team! 🎉
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                  You have successfully claimed your{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 capitalize">
                    {inviteData?.role}
                  </strong>{' '}
                  privileges. Your account is now fully authorized.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25"
                >
                  <span>Launch Admin Control Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Invitation Header Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Staff Invitation
                </div>
                {inviteData?.expires_at && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-amber-500" />
                    Valid until {new Date(inviteData.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Title & Inviter */}
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
                Join ChangeLens as a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400 capitalize">
                  {inviteData?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                </span>
              </h2>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                You have been invited by{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {inviteData?.invited_by?.name || inviteData?.invited_by?.email || 'A Super Admin'}
                </strong>{' '}
                to join the ChangeLens platform management team.
              </p>

              {/* Invitation Details Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Designated Email</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                    {inviteData?.email}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Role Tier</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      inviteData?.role === 'superadmin'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {inviteData?.role === 'superadmin' ? (
                      <Crown className="w-3 h-3" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                    {inviteData?.role === 'superadmin' ? 'Super Admin (Owner)' : 'Staff Admin'}
                  </span>
                </div>

                {inviteData?.role !== 'superadmin' && inviteData?.permissions && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                      Assigned Capabilities
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inviteData.permissions.canModerateFeedback && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Moderate Feedback
                        </span>
                      )}
                      {inviteData.permissions.canViewAnalytics && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          View Telemetry
                        </span>
                      )}
                      {inviteData.permissions.canManageUsers && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Manage Users
                        </span>
                      )}
                      {inviteData.permissions.canPurgeCache && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Purge Cache
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action State Depending on Authentication */}
              {!user ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    Please log in or register with <strong>{inviteData?.email}</strong> to claim this invitation.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to={`/login?email=${encodeURIComponent(inviteData?.email || '')}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Sign In to Claim
                    </Link>
                    <Link
                      to={`/register?email=${encodeURIComponent(inviteData?.email || '')}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                    >
                      Create Account
                    </Link>
                  </div>
                </div>
              ) : !isEmailMatch ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs leading-relaxed">
                    You are currently signed in as <strong>{user.email}</strong>, but this invitation was sent to{' '}
                    <strong>{inviteData?.email}</strong>.
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate(`/login?email=${encodeURIComponent(inviteData?.email || '')}`);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                  >
                    Switch Account to {inviteData?.email}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25"
                >
                  {accepting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>{accepting ? 'Activating Privileges...' : 'Accept Invitation & Activate Access'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
