import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { RefreshCw } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans">
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 shadow-xl">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-sm font-medium text-slate-300">
            Validating security session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
