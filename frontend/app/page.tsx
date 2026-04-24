"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shield, Database, Zap, FileSearch, AlertTriangle, Globe } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex flex-col">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/8 blur-[120px] pointer-events-none" />

      {/* Main content - grows to fill */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-6 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-5 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Real-Time Crisis Management Agent
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-5">
          Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-indigo-400">EchoShield</span>
          <br /> PR Crisis Copilot
        </motion.h1>

        <motion.p variants={itemVariants} className="text-base md:text-lg text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
          An autonomous multi-agent system that monitors social media sentiment and 
          generates legally-sound PR responses aligned with your internal policies.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link href="/chat" className="group flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-full transition-all active:scale-95 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            Start Crisis Analysis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Chat Preview — shows actual product, not a terminal */}
        <motion.div variants={itemVariants} className="mb-10 max-w-2xl w-full mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-zinc-300">EchoShield Copilot</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500">Live</span>
              </div>
            </div>
            {/* Chat messages */}
            <div className="p-4 space-y-3 text-left text-sm">
              {/* User message */}
              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="bg-zinc-800 text-zinc-200 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                  People on Reddit are furious about our new refund policy. Draft a response.
                </div>
              </motion.div>

              {/* Agent step indicators */}
              <motion.div
                className="flex items-center gap-2 text-xs text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <span className="text-emerald-400">✓</span> Scanned 5 Reddit threads · 3 news articles
              </motion.div>
              <motion.div
                className="flex items-center gap-2 text-xs text-zinc-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
              >
                <span className="text-purple-400">✓</span> Retrieved 4 policy chunks from RefundPolicy.pdf
              </motion.div>

              {/* Assistant message */}
              <motion.div
                className="flex gap-2.5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.0 }}
              >
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-zinc-300 space-y-1">
                  <p><span className="text-amber-400 font-semibold">Crisis Risk Score: 7/10</span></p>
                  <p className="text-zinc-400 text-xs leading-relaxed">Based on internal refund policy Section 3.2, customers are entitled to a 30-day window. Drafted empathetic response avoiding legal admission...</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Feature grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 text-left w-full mb-8">
          <FeatureCard icon={Globe} title="Live Sentiment" desc="Scans Reddit & Twitter for brand mentions." color="emerald" />
          <FeatureCard icon={Database} title="Policy RAG" desc="Cross-references uploaded legal handbooks." color="purple" />
          <FeatureCard icon={AlertTriangle} title="Risk Scoring" desc="1-10 severity score per crisis." color="amber" />
          <FeatureCard icon={Shield} title="Legal Safety" desc="Never admits liability unless authorized." color="red" />
          <FeatureCard icon={Zap} title="Streaming" desc="Real-time token-by-token delivery." color="blue" />
          <FeatureCard icon={FileSearch} title="Multi-Company" desc="Scoped queries per company." color="indigo" />
        </motion.div>

        {/* Tech Stack */}
        <motion.div variants={itemVariants} className="text-xs text-zinc-600 space-x-3">
          <span>Next.js 14</span>·
          <span>FastAPI</span>·
          <span>Qdrant</span>·
          <span>Google Gemini</span>·
          <span>Framer Motion</span>·
          <span>Tailwind CSS</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400",
  purple: "bg-purple-500/10 text-purple-400",
  amber: "bg-amber-500/10 text-amber-400",
  red: "bg-red-500/10 text-red-400",
  blue: "bg-blue-500/10 text-blue-400",
  indigo: "bg-indigo-500/10 text-indigo-400",
};

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  const c = colorMap[color] || colorMap.red;
  const [bg, text] = c.split(" ");
  return (
    <div className="p-4 md:p-5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl backdrop-blur-sm hover:border-zinc-700/60 transition-colors group">
      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-4 h-4 ${text}`} />
      </div>
      <h3 className="text-zinc-100 font-semibold text-sm mb-1">{title}</h3>
      <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}
