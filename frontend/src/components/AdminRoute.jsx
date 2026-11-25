import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 shadow-xl">
          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Validating staff privileges...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isStaff = user.role === 'admin' || user.role === 'superadmin';

  if (!isStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 font-sans">
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl text-center backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Admin Privileges Required
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Your account (<span className="font-semibold text-slate-800 dark:text-slate-200">{user.email}</span>) is registered as a standard developer. You need an invitation from a Super Admin to access the ChangeLens Admin Portal.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/app"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-md shadow-indigo-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Workshop
            </Link>
            <Link
              to="/feedback"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition"
            >
              Feedback Hub
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
