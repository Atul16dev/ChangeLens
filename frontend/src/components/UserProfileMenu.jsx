import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ProfileModal } from './ProfileModal.jsx';
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Globe,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

export function UserProfileMenu({ compact = false }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || 'CL';

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const isWorkspace = location.pathname.startsWith('/app') || location.pathname.startsWith('/dashboard');

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        {/* Circular Profile Avatar Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`group flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/40 focus:outline-none transition-all ${
            dropdownOpen ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20' : ''
          }`}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          aria-label="User profile menu"
          title={`${user.name || user.email} (Account settings)`}
        >
          <div className="relative shrink-0">
            {/* Circular Avatar Container with Refined Indigo Border */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-indigo-400/40 shadow-sm overflow-hidden bg-slate-900 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center text-xs font-bold text-indigo-200 tracking-wider group-hover:scale-105 transition-transform">
                  {initials}
                </div>
              )}
            </div>

            {/* Green Online Status Dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-sm" />
          </div>

          {!compact && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform hidden sm:block ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {/* Dropdown Popover */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2.5 w-64 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 py-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150">
            {/* User Profile Header Card */}
            <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-indigo-400/40 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center text-xs font-bold text-indigo-200">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate font-mono">{user.email}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified Developer
                </span>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="py-1">
              {/* Option 1: Edit Profile */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
              >
                <UserCog className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Edit Profile & Photo</span>
              </button>

              {/* Option 2: Contextual Navigation */}
              {isWorkspace ? (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
                >
                  <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Landing Page</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/app');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors text-left"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Launch Workspace</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800/80 my-1" />

            {/* Option 3: Logout */}
            <div className="py-0.5">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}
