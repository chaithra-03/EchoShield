"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Globe, FileText, Loader2, Copy, Check, Trash2, Shield } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = {
  type: "document" | "web";
  title: string;
  snippet: string;
  url?: string;
  score?: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
};

interface ChatInterfaceProps {
  onStepChange: (step: string | null, msg: string | null) => void;
  activeCompany?: string | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ChatInterface({ onStepChange, activeCompany }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: uuidv4(), role: "user", content: userMsg }]);
    setIsProcessing(true);

    const assistantId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, session_id: sessionId, use_web: true, company: activeCompany || null }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error ${res.status}: ${errText}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Accumulate chunks in buffer to handle split SSE lines
        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines in the buffer
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6); // "data: " is 6 characters
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === "agent_step") {
              onStepChange(data.step ?? null, data.message ?? null);
            } else if (data.type === "token") {
              const text = data.text ?? "";
              if (text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + text } : m
                  )
                );
              }
            } else if (data.type === "sources") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: data.sources ?? [] } : m
                )
              );
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, content: `*Error: ${data.message}*` }
                    : m
                )
              );
              onStepChange(null, null);
            } else if (data.type === "done") {
              onStepChange(null, "done");
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
            }
          } catch {
            // Silently skip malformed JSON lines
          }
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, isStreaming: false, content: `*Failed to communicate with the server: ${msg}*` }
            : m
        )
      );
      onStepChange(null, null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 min-h-[60vh]">
            <Bot className="w-12 h-12 mb-4 text-red-500/50" />
            <p className="text-xl font-medium text-zinc-300">Ready for Crisis Analysis</p>
            <p className="text-sm mt-2 text-zinc-500">Upload Internal Policies & Brand Guidelines.</p>
            <p className="text-xs mt-1 text-zinc-600">Ask about a live viral complaint or brand mention on social media.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-1">
                <Shield className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[80%] ${msg.role === "user"
                ? "bg-zinc-800 text-zinc-100 rounded-3xl rounded-br-sm px-6 py-3"
                : "text-zinc-300"
                }`}
            >
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {msg.sources
                    .filter(
                      (src, index, self) =>
                        index ===
                        self.findIndex((t) => t.title === src.title && t.url === src.url)
                    )
                    .map((src, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400"
                      >
                        {src.type === "web" ? (
                          <Globe className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <FileText className="w-3 h-3 text-purple-400" />
                        )}
                        <span className="truncate max-w-[150px]">{src.title}</span>
                      </div>
                    ))}
                </div>
              )}

              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content + (msg.isStreaming ? " ▋" : "")}
                  </ReactMarkdown>
                  {msg.isStreaming && !msg.content && (
                    <span className="inline-flex gap-1 text-zinc-500">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                    </span>
                  )}
                </div>
              ) : (
                <div>{msg.content}</div>
              )}

              {/* Copy button for completed assistant messages */}
              {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                    setCopiedId(msg.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {copiedId === msg.id ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy response</>
                  )}
                </button>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-1">
                <User className="w-5 h-5 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 md:p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/50">
        {/* Company scope indicator */}
        <div className="max-w-4xl mx-auto mb-2 flex justify-center">
          {activeCompany ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Querying: {activeCompany}
            </span>
          ) : (
            <span className="text-xs text-zinc-600">
              Querying all companies — select one in sidebar to filter
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder={activeCompany ? `Ask about ${activeCompany}'s policies...` : "Describe the crisis or paste a viral social media mention..."}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-6 pr-14 py-4 text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 p-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-full transition-colors flex items-center justify-center w-10 h-10"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
        <p className="text-center text-xs text-zinc-600 mt-3">
          EchoShield — AI Crisis Management. Do not upload sensitive information.
        </p>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); onStepChange(null, null); }}
            className="mt-2 mx-auto flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear chat
          </button>
        )}
      </div>
    </div>
  );
}
