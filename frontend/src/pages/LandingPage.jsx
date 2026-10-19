import React, { useEffect } from 'react';
import { Navbar } from '../components/landing/Navbar.jsx';
import { HeroSection } from '../components/landing/HeroSection.jsx';
import { ProblemSection } from '../components/landing/ProblemSection.jsx';
import { FeaturesGrid } from '../components/landing/FeaturesGrid.jsx';
import { HowItWorksSection } from '../components/landing/HowItWorksSection.jsx';
import { InteractivePreviewSection } from '../components/landing/InteractivePreviewSection.jsx';
import { WhyChangeLensSection } from '../components/landing/WhyChangeLensSection.jsx';
import { CtaSection } from '../components/landing/CtaSection.jsx';
import { Footer } from '../components/landing/Footer.jsx';

export function LandingPage() {
  useEffect(() => {
    document.title = 'ChangeLens — Know What Your Code Changes Will Break';
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      {/* Permanent Ambient Background Grid & Floating Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-60" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse-glow z-0" />
      <div className="fixed top-[40%] right-[-10%] w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none animate-float-slow z-0" />
      <div className="fixed bottom-[-10%] left-[20%] w-[650px] h-[650px] bg-violet-600/10 rounded-full blur-[170px] pointer-events-none animate-float-reverse z-0" />

      {/* Navigation Header */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Main Content Sections */}
      <main className="relative z-10">
        <HeroSection />

        {/* Problem Section */}
        <ProblemSection />

        {/* Features Capabilities Grid */}
        <FeaturesGrid />

        {/* How It Works Pipeline */}
        <HowItWorksSection />

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
