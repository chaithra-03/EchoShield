"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import DocumentUpload from "@/components/DocumentUpload";
import AgentWorkflow from "@/components/AgentWorkflow";
import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [activeCompany, setActiveCompany] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const handleStepChange = (step: string | null, message: string | null) => {
    setAgentStep(step);
    setAgentMessage(message);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        {showMobileSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Left Sidebar: Documents — desktop always visible, mobile slide-in */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-[300px] shrink-0
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <DocumentUpload onCompanyChange={setActiveCompany} />
      </div>

      {/* Mobile backdrop overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Center: Main Chat */}
      <div className="flex-1 relative z-0">
        <ChatInterface onStepChange={handleStepChange} activeCompany={activeCompany} />
      </div>

      {/* Right Sidebar: Agent State */}
      <div className="w-[280px] hidden lg:block shrink-0 z-10">
        <AgentWorkflow currentStep={agentStep} message={agentMessage} />
      </div>
    </div>
  );
}
