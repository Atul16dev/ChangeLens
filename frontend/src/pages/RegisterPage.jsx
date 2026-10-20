import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.jsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Real-time password criteria
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid =
    name.trim().length >= 2 &&
    email.trim().length >= 5 &&
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please satisfy all password and form requirements.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/v1/auth/google';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Scrollable centering wrapper */}
      <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-10 relative z-10">

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-5 w-full max-w-md">
          <div className="mb-3">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Create your ChangeLens Account
          </h1>
          <p className="text-xs text-slate-400 mt-1 text-center">
            Ship with confidence using AST-powered Blast Radius Analysis
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl">

          {/* Error Alert */}
          {error && (
            <div className="mb-4 bg-rose-950/80 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono text-xs transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono text-xs transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono text-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono text-xs transition-all"
                />
              </div>
            </div>

            {/* Security Policy Checklist — compact 2-column grid */}
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px]">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {hasMinLength
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <XCircle className="w-3 h-3 text-slate-600 shrink-0" />}
                  <span className={hasMinLength ? 'text-slate-200' : ''}>8+ characters</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  {hasUpper && hasLower
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <XCircle className="w-3 h-3 text-slate-600 shrink-0" />}
                  <span className={hasUpper && hasLower ? 'text-slate-200' : ''}>Upper + lowercase</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  {hasNumber && hasSpecial
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    : <XCircle className="w-3 h-3 text-slate-600 shrink-0" />}
                  <span className={hasNumber && hasSpecial ? 'text-slate-200' : ''}>Number & symbol</span>
                </div>

                {confirmPassword && (
                  <div className="flex items-center gap-1.5">
                    {passwordsMatch
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      : <XCircle className="w-3 h-3 text-rose-500 shrink-0" />}
                    <span className={passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}>
                      {passwordsMatch ? 'Passwords match' : "Don't match"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.16C3.26 21.31 7.34 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.28A11.96 11.96 0 000 12c0 1.92.45 3.74 1.28 5.4l3.99-3.16z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.69 1.28 6.6l3.99 3.16c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <span>Sign up with Google</span>
          </button>

          {/* Footer link */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Log in
            </Link>
          </p>
        </div>

        {/* Bottom breathing room */}
        <div className="h-4" />
      </div>
    </div>
  );
}
