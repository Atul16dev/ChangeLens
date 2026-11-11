import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Navbar } from '../components/landing/Navbar.jsx';
import { HeroSection } from '../components/landing/HeroSection.jsx';
import { ProblemSection } from '../components/landing/ProblemSection.jsx';
import { FeaturesGrid } from '../components/landing/FeaturesGrid.jsx';
import { HowItWorksSection } from '../components/landing/HowItWorksSection.jsx';
import { GlobalTelemetryGlobe3D } from '../components/landing/GlobalTelemetryGlobe3D.jsx';
import { InteractivePreviewSection } from '../components/landing/InteractivePreviewSection.jsx';
import { WhyChangeLensSection } from '../components/landing/WhyChangeLensSection.jsx';
import { CtaSection } from '../components/landing/CtaSection.jsx';
import { Footer } from '../components/landing/Footer.jsx';

export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    document.title = 'ChangeLens — Know What Your Code Changes Will Break';
  }, []);

  useEffect(() => {
    if (location.search.includes('auth=success')) {
      refreshUser().then(() => {
        navigate('/app', { replace: true });
      });
    }
  }, [location.search, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Permanent Ambient Background Grid & Floating Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-60" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse-glow z-0" />
      <div className="fixed top-[40%] right-[-10%] w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none animate-float-slow z-0" />
      <div className="fixed bottom-[-10%] left-[20%] w-[650px] h-[650px] bg-violet-600/10 rounded-full blur-[170px] pointer-events-none animate-float-reverse z-0" />

      {/* Fixed Navigation Header */}
      <Navbar />

      {/* Main Content Sections (with top padding for fixed navbar) */}
      <main className="relative z-10 pt-16 sm:pt-20">
        <HeroSection />

        {/* Problem Section */}
        <ProblemSection />

        {/* Features Capabilities Grid */}
        <FeaturesGrid />

        {/* How It Works Pipeline */}
        <HowItWorksSection />

        {/* Global Continuous Push Telemetry Section with Interactive 3D Globe */}
        <section id="global-telemetry" className="py-10 sm:py-16 relative bg-slate-50/50 dark:bg-[#070b14]/60 border-t border-slate-200 dark:border-slate-800/80 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <GlobalTelemetryGlobe3D />
          </div>
        </section>

        {/* Deep Dive Interactive Product Preview */}
        <InteractivePreviewSection />

        {/* Why ChangeLens / Value Proposition */}
        <WhyChangeLensSection />

        {/* Final High-Converting CTA */}
        <CtaSection />
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
