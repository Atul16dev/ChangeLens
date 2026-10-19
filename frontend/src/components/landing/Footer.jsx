import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUp } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">ChangeLens</span>
            </Link>
            <p className="text-slate-400 leading-relaxed text-xs">
              Deterministic code change blast radius analysis and static dependency intelligence platform for modern engineering teams.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Multi-Language AST Engine v1.0</span>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Product Capabilities</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, 'features')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Features & Capabilities
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, 'how-it-works')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Execution Pipeline
                </a>
              </li>
              <li>
                <a
                  href="#preview"
                  onClick={(e) => scrollToSection(e, 'preview')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Interactive Graph Preview
                </a>
              </li>
              <li>
                <a
                  href="#why-changelens"
                  onClick={(e) => scrollToSection(e, 'why-changelens')}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Why ChangeLens
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Architecture */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Engine Architecture</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Tree-Sitter WASM AST Parser</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>ELK.js Layered DAG Layout</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Gemini Context-Aware AI Review</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>MongoDB Atlas Cloud Persistence</span>
              </li>
            </ul>
          </div>

          {/* Authentication & Account */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-200">Access & Workspace</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/app" className="hover:text-cyan-400 transition-colors">
                  Launch Workspace
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-cyan-400 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-cyan-400 transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-cyan-400 transition-colors">
                  Account Recovery
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            &copy; {currentYear} ChangeLens Inc. All rights reserved. Deterministic Code Impact Intelligence.
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
