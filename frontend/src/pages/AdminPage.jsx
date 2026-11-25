import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Crown,
  Users,
  Mail,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  Ban,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  listAdminUsers,
  listAdminInvites,
  revokeAdminInvite,
  revokeUserAccess,
  unbanUser,
} from '../services/adminApi.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { UserProfileMenu } from '../components/UserProfileMenu.jsx';
import { InviteAdminModal } from '../components/admin/InviteAdminModal.jsx';
import { EditPermissionsModal } from '../components/admin/EditPermissionsModal.jsx';
import { BanUserModal } from '../components/admin/BanUserModal.jsx';
import { UserActivityModal } from '../components/admin/UserActivityModal.jsx';

export function AdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const canManageUsers = isSuperAdmin || Boolean(user?.permissions?.canManageUsers);

  // Navigation tabs: 'team', 'invites', 'users'
  const [activeTab, setActiveTab] = useState('team');

  // Data states
  const [usersList, setUsersList] = useState([]);
  const [invitesList, setInvitesList] = useState([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, banned: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState(null);
  const [demoteConfirmUser, setDemoteConfirmUser] = useState(null);
  const [banTargetUser, setBanTargetUser] = useState(null);
  const [unbanConfirmUser, setUnbanConfirmUser] = useState(null);
  const [activityUserId, setActivityUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch all staff and invitations
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, invitesRes] = await Promise.all([
        listAdminUsers({ limit: 100, search: searchTerm, role: roleFilter, status: statusFilter }),
        listAdminInvites({ limit: 100 }),
      ]);

      const usersData = usersRes.data?.users || [];
      setUsersList(usersData);
      setInvitesList(invitesRes.data?.invitations || []);

      if (usersRes.data?.stats) {
        setUserStats(usersRes.data.stats);
      } else {
        const total = usersData.length;
        const banned = usersData.filter((u) => u.status === 'banned').length;
        setUserStats({ total, active: total - banned, banned });
      }
    } catch (err) {
      showNotification(err.message || 'Error fetching admin records', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived KPI statistics
  const totalUsersCount = userStats.total || usersList.length;
  const activeUsersCount = userStats.active;
  const bannedUsersCount = userStats.banned;
  const superAdminsCount = usersList.filter((u) => u.role === 'superadmin').length;
  const standardAdminsCount = usersList.filter((u) => u.role === 'admin').length;
  const pendingInvitesCount = invitesList.filter((i) => i.status === 'pending').length;
  const staffMembers = usersList.filter((u) => u.role === 'admin' || u.role === 'superadmin');

  // Handle Revoke Invitation
  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation link?')) return;
    try {
      setActionLoading(true);
      await revokeAdminInvite(inviteId);
      showNotification('Invitation successfully revoked.');
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Could not revoke invitation.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Demote User / Revoke Access
  const handleConfirmDemote = async () => {
    if (!demoteConfirmUser) return;
    try {
      setActionLoading(true);
      await revokeUserAccess(demoteConfirmUser.id);
      showNotification(`Revoked admin access for ${demoteConfirmUser.email}.`);
      setDemoteConfirmUser(null);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Could not revoke admin access.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unban User
  const handleConfirmUnban = async () => {
    if (!unbanConfirmUser) return;
    try {
      setActionLoading(true);
      await unbanUser(unbanConfirmUser.id);
      showNotification(`Account ${unbanConfirmUser.email} has been reactivated.`);
      setUnbanConfirmUser(null);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Could not unban user account.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Direct Invite Link
  const handleCopyLink = (token, id) => {
    const frontendBase = window.location.origin;
    const inviteUrl = `${frontendBase}/admin/invite/accept?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2000);
    showNotification('Invitation link copied to clipboard.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 animate-in slide-in-from-top-3">
          {notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {notification.msg}
          </span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Control Center
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                isSuperAdmin
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
              }`}
            >
              {isSuperAdmin ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>

        {/* Quick Nav Tools */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/app"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Workshop</span>
          </Link>

          <Link
            to="/feedback"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Feedback Hub</span>
          </Link>

          <ThemeToggle variant="dock" />
          <UserProfileMenu />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Team & Access Control
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" />
                RBAC v2.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage platform administrators, send role invitations, and customize access scopes.
            </p>
          </div>

          {/* Action: Send Invite (Super Admin or Users Manager) */}
          {(isSuperAdmin || user?.permissions?.canManageUsers) && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/25 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff / Admin</span>
            </button>
          )}
        </div>

        {/* Glanceable KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Super Admins</span>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {superAdminsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Platform Co-Owners</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Active Admins</span>
              <Shield className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {standardAdminsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Staff with custom scopes</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Pending Invites</span>
              <Mail className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {pendingInvitesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting claim</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Total Active Users</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {activeUsersCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{totalUsersCount} registered</span>
              {bannedUsersCount > 0 && (
                <span className="text-rose-500 font-semibold">{bannedUsersCount} banned</span>
              )}
            </div>
          </div>
        </div>

        {/* View Tabs & Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm backdrop-blur-xl">
          {/* Tab Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'team'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Active Staff ({staffMembers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('invites')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'invites'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Invitations ({invitesList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Users ({totalUsersCount})</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 ${
                  activeTab === 'users'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{activeUsersCount} Active</span>
              </span>
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab 1: Active Staff & Admins */}
        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Management Staff Directory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Users holding administrative or owner authorization
                </p>
              </div>
              <span className="text-xs text-slate-400">{staffMembers.length} authorized</span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No administrative staff found matching the filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffMembers.map((member) => {
                  const isCurrent = member.id === user?.id;
                  const isMemberSuper = member.role === 'superadmin';

                  return (
                    <div
                      key={member.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white font-bold text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            member.name?.slice(0, 2) || 'AD'
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white break-words">
                              {member.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                You
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                                isMemberSuper
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {isMemberSuper ? (
                                <Crown className="w-3 h-3" />
                              ) : (
                                <Shield className="w-3 h-3" />
                              )}
                              {isMemberSuper ? 'Super Admin' : 'Admin'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 break-all">
                            {member.email}
                          </div>
                        </div>
                      </div>

                      {/* Permissions Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 md:max-w-md">
                        {isMemberSuper ? (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Unrestricted Full Access (All Scopes)
                          </span>
                        ) : (
                          <>
                            {member.permissions?.canModerateFeedback && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Moderate Feedback
                              </span>
                            )}
                            {member.permissions?.canViewAnalytics && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                Telemetry View
                              </span>
                            )}
                            {member.permissions?.canManageUsers && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Manage Users
                              </span>
                            )}
                            {member.permissions?.canPurgeCache && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Purge Cache
                              </span>
                            )}
                            {!Object.values(member.permissions || {}).some(Boolean) && (
                              <span className="text-[10px] text-slate-400 italic">
                                Read-only staff
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Management Actions (Super Admin Only) */}
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditTargetUser(member)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Access</span>
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => setDemoteConfirmUser(member)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Invitations Table */}
        {activeTab === 'invites' && (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Staff Role Invitations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track pending claims, copy direct links, or cancel access
                </p>
              </div>
              <span className="text-xs text-slate-400">{invitesList.length} total invitations</span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : invitesList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No invitations have been generated yet. Click &quot;Invite Staff / Admin&quot; to create one.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invitesList.map((inv) => {
                  const isPending = inv.status === 'pending';
                  const isAccepted = inv.status === 'accepted';
                  const isRevoked = inv.status === 'revoked';
                  const isExpired = inv.status === 'expired';

                  return (
                    <div
                      key={inv.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono break-all">
                            {inv.email}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                              inv.role === 'superadmin'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {inv.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                              isPending
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                                : isAccepted
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : isRevoked
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="break-all">
                            Invited by:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {inv.invited_by?.name || inv.invited_by?.email || 'Super Admin'}
                            </strong>
                          </span>
                          <span className="hidden xs:inline">&bull;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            Expires: {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleCopyLink(inv.token, inv.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                            >
                              {copiedInviteId === inv.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedInviteId === inv.id ? 'Copied' : 'Copy Link'}</span>
                            </button>

                            {isSuperAdmin && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            )}
                          </>
                        )}
                        {isAccepted && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Claimed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: All Registered Users */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    User Directory & Moderation
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Total Active Users:</span>
                    <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{userStats.active}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage accounts, review activity dossiers, and enforce disciplinary bans
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === ''
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({userStats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Active ({userStats.active})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('banned')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === 'banned'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Banned ({userStats.banned})</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Sub-Strip inside Users Section */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center py-2.5 px-2 sm:px-4">
              <div className="px-1">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Registered</span>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{userStats.total}</p>
              </div>
              <div className="px-1">
                <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span>Active Users</span>
                </span>
                <p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{userStats.active}</p>
              </div>
              <div className="px-1">
                <span className="text-[10px] sm:text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>Banned</span>
                </span>
                <p className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{userStats.banned}</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No users found matching current filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((usr) => {
                  const isCurrent = usr.id === user?.id;
                  const isBanned = usr.status === 'banned';
                  const canModerateThisUser =
                    canManageUsers &&
                    !isCurrent &&
                    (isSuperAdmin || (usr.role !== 'admin' && usr.role !== 'superadmin'));

                  return (
                    <div
                      key={usr.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white break-words">
                            {usr.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                              usr.role === 'superadmin'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : usr.role === 'admin'
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {usr.role || 'user'}
                          </span>

                          {/* Status Badge */}
                          {isBanned ? (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0"
                              title={usr.ban_reason || 'Banned account'}
                            >
                              <Ban className="w-2.5 h-2.5" />
                              Banned
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              Active
                            </span>
                          )}

                          {usr.is_email_verified && (
                            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 break-all">{usr.email}</div>
                      </div>

                      {/* User Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Dossier & Activity Button */}
                        <button
                          onClick={() => setActivityUserId(usr.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                          title="View user activity history and admin notes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Activity</span>
                        </button>

                        {/* Ban / Unban Controls */}
                        {canModerateThisUser && (
                          <>
                            {isBanned ? (
                              <button
                                onClick={() => setUnbanConfirmUser(usr)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Unban</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setBanTargetUser(usr)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Ban</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Modify Access (Super Admin Only) */}
                        {isSuperAdmin && !isCurrent && (
                          <button
                            onClick={() => setEditTargetUser(usr)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                          >
                            Modify Access
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      <InviteAdminModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={fetchData}
      />

      {/* Edit Permissions Modal */}
      <EditPermissionsModal
        isOpen={Boolean(editTargetUser)}
        targetUser={editTargetUser}
        onClose={() => setEditTargetUser(null)}
        onUpdated={fetchData}
      />

      {/* Ban User Modal */}
      <BanUserModal
        isOpen={Boolean(banTargetUser)}
        targetUser={banTargetUser}
        onClose={() => setBanTargetUser(null)}
        onBanned={fetchData}
      />

      {/* User Activity Dossier Modal */}
      <UserActivityModal
        isOpen={Boolean(activityUserId)}
        userId={activityUserId}
        onClose={() => setActivityUserId(null)}
      />

      {/* Unban Confirmation Modal */}
      {unbanConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Reactivate User Account?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lift the suspension for{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {unbanConfirmUser.email}
                </strong>
                ? They will be allowed to log in and use ChangeLens again.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUnbanConfirmUser(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnban}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/20"
              >
                {actionLoading ? 'Reactivating...' : 'Yes, Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demote / Revoke Confirmation Dialog */}
      {demoteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Revoke Admin Privileges?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to demote{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {demoteConfirmUser.email}
                </strong>{' '}
                back to standard developer role?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDemoteConfirmUser(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDemote}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-600/20"
              >
                {actionLoading ? 'Revoking...' : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
