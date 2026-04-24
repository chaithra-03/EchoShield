"use client";

import { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  File,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Plus,
  ChevronDown,
  X,
} from "lucide-react";

type Doc = {
  doc_id: string;
  filename: string;
  chunk_count: number;
  company?: string;
};

interface DocumentUploadProps {
  onCompanyChange?: (company: string | null) => void;
}

export default function DocumentUpload({ onCompanyChange }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Single unified company state — controls both uploads AND query scope
  const [activeCompany, setActiveCompany] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents/list`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
      else if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setIsAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isAddingNew && inputRef.current) inputRef.current.focus();
  }, [isAddingNew]);

  // Derive unique companies from uploaded docs
  const companies = Array.from(
    new Set(documents.map((d) => d.company || "Untagged").filter(Boolean))
  );

  // Unified setter: updates local state + notifies parent (ChatInterface)
  const selectCompany = (company: string | null) => {
    setActiveCompany(company);
    onCompanyChange?.(company);
    setShowDropdown(false);
    setIsAddingNew(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) await handleUpload(e.dataTransfer.files[0]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await handleUpload(e.target.files[0]);
  };

  const handleUpload = async (file: globalThis.File) => {
    if (!activeCompany) {
      setError("Please select or create a company first.");
      return;
    }
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("company", activeCompany);

    try {
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      await fetchDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchDocs();
    } catch (err: any) {
      setError("Failed to delete document");
    }
  };

  const handleCreateCompany = () => {
    if (newCompanyName.trim()) {
      selectCompany(newCompanyName.trim());
      setNewCompanyName("");
    }
  };

  // Show docs for the active company, or all if none selected
  const filteredDocs = activeCompany
    ? documents.filter((d) => (d.company || "Untagged") === activeCompany)
    : documents;

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 p-4">
      <h2 className="text-zinc-100 font-semibold mb-4 flex items-center gap-2">
        <File className="w-5 h-5 text-red-400" />
        Policy Vault
      </h2>

      {/* ── Unified Company Selector ───────────────────────── */}
      <div className="mb-3 relative" ref={dropdownRef}>
        <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">
          Active Company <span className="text-zinc-600 normal-case">— uploads & queries</span>
        </label>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
            activeCompany
              ? "bg-zinc-800 border-red-500/40 text-red-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>{activeCompany || "All Companies (no filter)"}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden z-50 shadow-xl shadow-black/50">
            {/* "All" option — no filter */}
            <button
              onClick={() => selectCompany(null)}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                activeCompany === null
                  ? "bg-red-500/10 text-red-300"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              All Companies
              {activeCompany === null && (
                <CheckCircle2 className="w-3.5 h-3.5 text-red-400 ml-auto" />
              )}
            </button>

            {companies.length > 0 && <div className="border-t border-zinc-700" />}

            {/* Existing companies */}
            {companies.map((c) => (
              <button
                key={c}
                onClick={() => selectCompany(c)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                  activeCompany === c
                    ? "bg-red-500/10 text-red-300"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                {c}
                <span className="ml-auto text-xs text-zinc-600">
                  {documents.filter((d) => d.company === c).length} docs
                </span>
                {activeCompany === c && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                )}
              </button>
            ))}

            <div className="border-t border-zinc-700" />

            {/* Add New Company */}
            {isAddingNew ? (
              <div className="p-2 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
                  placeholder="Company name..."
                  className="flex-1 bg-zinc-900 border border-zinc-600 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleCreateCompany}
                  disabled={!newCompanyName.trim()}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingNew(false); setNewCompanyName(""); }}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNew(true)}
                className="w-full text-left px-3 py-2.5 text-sm text-emerald-400 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Company
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scope indicator ────────────────────────────────── */}
      {activeCompany && (
        <div className="mb-3 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-zinc-400">
          <span className="text-red-400 font-medium">Query scope:</span> Only <span className="text-red-300">{activeCompany}</span>'s policies will be searched.
          <br/>
          <span className="text-red-400 font-medium">Upload scope:</span> Files will be tagged to <span className="text-red-300">{activeCompany}</span>.
        </div>
      )}

      {/* ── Upload Drop Zone ───────────────────────────────── */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDragging
            ? "border-red-500 bg-red-500/10"
            : activeCompany
            ? "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
            : "border-zinc-800 bg-zinc-900/30 opacity-60 pointer-events-none"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,.docx"
          disabled={!activeCompany}
        />
        <label htmlFor="file-upload" className={`flex flex-col items-center ${activeCompany ? "cursor-pointer" : "cursor-not-allowed"}`}>
          {isUploading ? (
            <Loader2 className="w-7 h-7 text-red-400 animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-7 h-7 text-zinc-400 mb-2" />
          )}
          <span className="text-sm font-medium text-zinc-300">
            {isUploading
              ? "Embedding policy..."
              : activeCompany
              ? `Upload for ${activeCompany}`
              : "Select a company first"}
          </span>
          <span className="text-xs text-zinc-500 mt-1">Handbooks, guidelines, legal docs</span>
        </label>
      </div>

      {error && (
        <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Document List ──────────────────────────────────── */}
      <div className="mt-4 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          {activeCompany ? `${activeCompany} Policies` : "All Indexed Policies"}
        </h3>
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <div
              key={doc.doc_id}
              className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between group border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <p className="text-sm text-zinc-200 truncate">{doc.filename}</p>
                  <p className="text-xs text-zinc-500">
                    {!activeCompany && doc.company && <span className="text-red-400/70">{doc.company} · </span>}
                    {doc.chunk_count} chunks
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.doc_id)}
                className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {filteredDocs.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">No policies uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
