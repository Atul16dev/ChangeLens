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

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid =
    name.trim().length >= 2 &&
    email.trim().length >= 5 &&
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) { setError('Please satisfy all password requirements.'); return; }
    setLoading(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password, confirmPassword });
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => { window.location.href = '/api/v1/auth/google'; };

  return (
    /* Full viewport, no scroll — everything fits in 100dvh */
    <div className="h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center overflow-hidden relative px-4">

      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Center column */}
      <div className="w-full max-w-md flex flex-col gap-3 relative z-10">

        {/* ── Brand header ── */}
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight">
              Create your ChangeLens Account
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              AST-powered Blast Radius Analysis
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-4 backdrop-blur-xl shadow-2xl">

          {/* Error */}
          {error && (
            <div className="mb-3 bg-rose-950/80 border border-rose-500/40 rounded-lg p-2.5 flex items-start gap-2 text-rose-200 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">

            {/* Name + Email — side by side on wider screens, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5" htmlFor="name">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="name" type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px] transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5" htmlFor="email">Work Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dev@company.com" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password + Confirm — side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-9 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-0.5" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required
                    className={`w-full bg-slate-950 border rounded-lg pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none font-mono text-[11px] transition-all ${
                      confirmPassword
                        ? passwordsMatch ? 'border-emerald-500/60 focus:border-emerald-500' : 'border-rose-500/60 focus:border-rose-500'
                        : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Password checklist — horizontal single row */}
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap px-2.5 py-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[10px]">
              <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasMinLength ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} 8+ chars
              </span>
              <span className={`flex items-center gap-1 ${hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasUpper && hasLower ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Aa
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasNumber ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Number
              </span>
              <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasSpecial ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Symbol
              </span>
              {confirmPassword && (
                <span className={`flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {passwordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {passwordsMatch ? 'Match' : 'No match'}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading || !isFormValid}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm py-2 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Creating account...</span></>
                : <span>Create Account →</span>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button type="button" onClick={handleGoogleSignup}
            className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.16C3.26 21.31 7.34 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.28A11.96 11.96 0 000 12c0 1.92.45 3.74 1.28 5.4l3.99-3.16z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.69 1.28 6.6l3.99 3.16c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <span>Sign up with Google</span>
          </button>

          {/* Footer */}
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
