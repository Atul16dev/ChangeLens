import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Menu,
  X,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { UserProfileMenu } from '../UserProfileMenu.jsx';
import { BrandLogo } from '../BrandLogo.jsx';
import { ThemeToggle } from '../ThemeToggle.jsx';

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 65;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-[#0e1422]/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl dark:shadow-black/60'
          : 'bg-white/80 dark:bg-[#0b0f19]/75 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none shrink-0"
          >
            <BrandLogo size="sm" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                ChangeLens
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/20 whitespace-nowrap">
                v1.0 AST Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Single Line, Never Wraps) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0">
            <a
              href="#problem"
              onClick={(e) => scrollToSection(e, 'problem')}
              className="text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-2.5 xl:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
            >
              The Problem
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-2.5 xl:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-2.5 xl:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
            >
              How It Works
            </a>
            <a
              href="#global-telemetry"
              onClick={(e) => scrollToSection(e, 'global-telemetry')}
              className="text-xs xl:text-sm font-semibold text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-200 px-2.5 xl:px-3 py-1.5 rounded-lg bg-cyan-50/60 dark:bg-cyan-950/30 hover:bg-cyan-100/70 dark:hover:bg-cyan-950/60 transition-colors flex items-center gap-1.5 whitespace-nowrap border border-cyan-200/80 dark:border-cyan-800/40"
            >
              <span>3D Globe</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            </a>
            <a
              href="#preview"
              onClick={(e) => scrollToSection(e, 'preview')}
              className="text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-2.5 xl:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
            >
              Live Preview
            </a>
            <a
              href="#why-changelens"
              onClick={(e) => scrollToSection(e, 'why-changelens')}
              className="text-xs xl:text-sm font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-2.5 xl:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
            >
              Why ChangeLens
            </a>
          </nav>

          {/* Desktop Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <ThemeToggle size="sm" />
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs xl:text-sm px-3.5 py-1.5 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
                <UserProfileMenu />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs xl:text-sm font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs xl:text-sm px-3.5 py-1.5 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Toggle Button & Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle size="sm" />
            {isAuthenticated && (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/app"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm whitespace-nowrap"
                >
                  <span>Workspace</span>
                </Link>
                <UserProfileMenu compact={true} />
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg focus:outline-none transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 shadow-2xl transition-all">
          <nav className="flex flex-col space-y-1">
            <a
              href="#problem"
              onClick={(e) => scrollToSection(e, 'problem')}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              The Problem
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#global-telemetry"
              onClick={(e) => scrollToSection(e, 'global-telemetry')}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors flex items-center justify-between"
            >
              <span>3D Global Telemetry Globe</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            </a>
            <a
              href="#preview"
              onClick={(e) => scrollToSection(e, 'preview')}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Live Preview
            </a>
            <a
              href="#why-changelens"
              onClick={(e) => scrollToSection(e, 'why-changelens')}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Why ChangeLens
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between py-1 px-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme</span>
              <ThemeToggle showLabel={true} size="sm" />
            </div>
            {isAuthenticated ? (
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-md transition-all text-center"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Launch Workspace</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-md transition-all text-center"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
