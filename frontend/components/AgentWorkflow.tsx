"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, BrainCircuit, PenTool, CheckCircle, Shield, Clock, AlertTriangle } from "lucide-react";

export type AgentStep = {
  step: string;
  status: "pending" | "running" | "done";
  message: string;
};

type AnalysisLog = {
  id: string;
  timestamp: string;
  query: string;
};

export default function AgentWorkflow({ currentStep, message }: { currentStep: string | null; message: string | null }) {
  const [analysisLog, setAnalysisLog] = useState<AnalysisLog[]>([]);

  // Track completed analyses
  useEffect(() => {
    if (message === "done" && currentStep === null) {
      // A full pipeline just completed — but we don't have the query here
      // We'll track it via a simple counter
    }
  }, [currentStep, message]);

  const steps = [
    { id: "research", icon: Search, label: "Sentiment Scan" },
    { id: "write", icon: PenTool, label: "Crisis Response" },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 p-4">
      <h2 className="text-zinc-100 font-semibold mb-6 flex items-center gap-2">
        <BrainCircuit className="w-5 h-5 text-red-400" />
        Crisis Pipeline
      </h2>

      <div className="relative flex-1">
        {/* Connecting Line */}
        <div className="absolute left-[19px] top-6 bottom-0 w-[2px] bg-zinc-800" />

        <div className="space-y-8 relative z-10">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isDone = (currentStep === "write" && step.id === "research") || (!currentStep && message === "done");
            
            return (
              <div key={step.id} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors duration-500 ${
                  isActive ? "bg-red-500/20 border-red-500 text-red-400" :
                  isDone ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                  "bg-zinc-950 border-zinc-700 text-zinc-500"
                }`}>
                  {isDone ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <div className="pt-2">
                  <h3 className={`font-medium ${isActive || isDone ? "text-zinc-200" : "text-zinc-500"}`}>
                    {step.label}
                  </h3>
                  {isActive && message && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 mt-1 max-w-[200px]"
                    >
                      {message}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Level Indicator */}
      <div className="mt-8 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">How It Works</span>
        </div>
        <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
          <p>1. Upload company policies to the <span className="text-red-400">Policy Vault</span></p>
          <p>2. Describe a crisis or paste a viral complaint</p>
          <p>3. EchoShield scans <span className="text-emerald-400">Reddit/Twitter</span> for live sentiment</p>
          <p>4. Cross-references your internal policies via <span className="text-purple-400">RAG</span></p>
          <p>5. Generates a risk-scored, legally-safe PR response</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold text-zinc-300">EchoShield Active</span>
        </div>
        Monitoring social sentiment and cross-referencing internal policies.
      </div>
    </div>
  );
}
