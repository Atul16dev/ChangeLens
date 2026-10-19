import {
  ShieldCheck,
  TrendingUp,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

export function WhyChangeLensSection() {
  return (
    <section id="why-changelens" className="py-20 md:py-32 relative bg-slate-950/70 border-t border-slate-900 overflow-hidden">
      {/* Background ambient glow with continuous breathing animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] bg-emerald-950/15 blur-[160px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header with Scroll Reveal */}
        <ScrollReveal animation="fade-up" duration={750} className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Why ChangeLens?
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Built for Velocity Without Regressions.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Compare manual code change guesswork with deterministic AST dependency intelligence.
          </p>
        </ScrollReveal>

        {/* Comparison Matrix with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Traditional Way */}
          <ScrollReveal animation="fade-up" delay={100} duration={700} className="p-7 sm:p-8 rounded-2xl bg-rose-950/10 border border-rose-900/30 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-200">The Traditional Workflow</h3>
                <p className="text-xs text-rose-300">Blind PRs & manual dependency tracing</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Engineers have to mentally trace call stacks across dozens of files.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Broken exports and missing function arguments only appear in staging.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Running entire test suites for hours because nobody knows which tests matter.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>Senior engineers spend 40% of their time reviewing low-risk refactors.</span>
              </li>
            </ul>
          </ScrollReveal>

          {/* ChangeLens Way */}
          <ScrollReveal animation="fade-up" delay={200} duration={700} className="p-7 sm:p-8 rounded-2xl bg-gradient-to-b from-cyan-950/30 to-slate-900/90 border border-cyan-500/40 shadow-xl shadow-cyan-950/20 space-y-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">The ChangeLens Way</h3>
                <p className="text-xs text-cyan-400">Automated blast radius intelligence</p>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Instant visual DAG graph shows exact direct and transitive consumers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Symbol-level analyzer immediately flags broken function signatures.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Automated Gemini PR review suggests the precise test commands to run.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Historical persistence in MongoDB Atlas gives teams searchable audit trails.</span>
              </li>
            </ul>
          </ScrollReveal>
        </div>

        {/* 4 Value Pillar Cards with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScrollReveal animation="fade-up" delay={100} duration={650} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group">
            <ShieldCheck className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-base font-bold text-slate-100 mb-1.5">Zero Regressions</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identify breaking changes before they merge into main and reach production users.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200} duration={650} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group">
            <Zap className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-base font-bold text-slate-100 mb-1.5">5x Faster Reviews</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reviewers immediately grasp downstream impact without tracing call hierarchies.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={300} duration={650} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group">
            <Cpu className="w-6 h-6 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-base font-bold text-slate-100 mb-1.5">Targeted Testing</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Execute only the test suites mapped to affected files, saving CI/CD compute hours.
            </p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={400} duration={650} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors group">
            <Clock className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-base font-bold text-slate-100 mb-1.5">Sub-Second Speed</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tree-Sitter WASM parsers analyze thousands of AST tokens in milliseconds locally.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
