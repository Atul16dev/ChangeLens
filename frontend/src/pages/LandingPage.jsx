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
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation Header */}
      <Navbar />

      {/* Hero Section */}
      <main>
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
      <Footer />
    </div>
  );
}
