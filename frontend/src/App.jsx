import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((mod) => ({ default: mod[exportName] })));

const LandingPage = lazyNamed(() => import('./pages/LandingPage.jsx'), 'LandingPage');
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage.jsx'), 'DashboardPage');
const LoginPage = lazyNamed(() => import('./pages/LoginPage.jsx'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('./pages/RegisterPage.jsx'), 'RegisterPage');
const VerifyEmailPage = lazyNamed(() => import('./pages/VerifyEmailPage.jsx'), 'VerifyEmailPage');
const ForgotPasswordPage = lazyNamed(() => import('./pages/ForgotPasswordPage.jsx'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('./pages/ResetPasswordPage.jsx'), 'ResetPasswordPage');

function PageFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Modern Landing Page at root entry point */}
              <Route path="/" element={<LandingPage />} />

              {/* Protected ChangeLens Blast Radius Workspace */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Alias for dashboard URL */}
              <Route path="/dashboard" element={<Navigate to="/app" replace />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Catch-all redirect to landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
