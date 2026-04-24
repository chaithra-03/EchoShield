<div align="center">
  <img src="https://via.placeholder.com/150/dc2626/ffffff?text=EchoShield" width="100" />
  <h1>EchoShield — AI PR & Crisis Management Copilot</h1>
  <p>An autonomous multi-agent system that monitors social media sentiment and generates legally-sound corporate responses in seconds.</p>
</div>

---

## 🌟 Overview

**EchoShield** is an advanced AI platform built for Public Relations (PR) and Risk Mitigation teams. Instead of generic AI chat, EchoShield bridges the gap between **chaotic real-time social sentiment** and **static corporate policy**.

By orchestrating multiple specialized agents, EchoShield analyzes live viral mentions on Reddit/Twitter, cross-references them against your internal company handbooks (PDF/Docs) via RAG, and calculates a real-time **Crisis Risk Score** to draft perfectly-toned, legally-safe public statements.

### 🛡️ Why EchoShield?
* 🔍 **Dual Sentiment Search**: Parallel social media (Reddit/Twitter) + news web scraping for complete crisis landscape coverage.
* 📜 **Policy-Aware RAG**: Responses are grounded strictly in your uploaded brand guidelines and legal handbooks.
* ⚖️ **Risk Assessment**: Every crisis is assigned a 1-10 severity score before any statement is drafted.
* 🏢 **Multi-Company Support**: Upload policies from several companies; filter and scope queries per company.
* ⚡ **Streaming Execution**: Watch the "Sentiment Scan" and "Crisis Response" agents collaborate in real-time via SSE.
* 📋 **Copy & Export**: One-click copy of any generated PR statement for immediate use.
* 🎨 **Corporate-Ready UI**: Premium dark-mode dashboard with lock-on-upload company selector and workflow tracing.

---

## 🛠️ Technology Stack

| Domain | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS 4, Framer Motion |
| **Backend** | Python, FastAPI, Uvicorn, Asyncio, slowapi (Rate Limiting) |
| **Generative AI** | Google Gemini (`google-generativeai`), Gemini Embeddings |
| **Vector DB** | Qdrant (embedded) with semantic cosine similarity |
| **Sentiment Tool** | Dual DuckDuckGo orchestration (social + news) |
| **Data Parsing** | PyPDF2, python-docx |

---

## 🚀 Local Setup

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your GEMINI_API_KEY from AI Studio
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to launch EchoShield.

---

## 🤖 Agentic Workflow

1. **Setup**: Enter a company name → upload their internal policies (PDF/TXT).
2. **Trigger**: Describe a crisis or paste a viral social media complaint.
3. **Dual Search**: The **Sentiment Agent** fires two parallel web searches — one targeting Reddit/Twitter, one for general news coverage.
4. **Retrieval**: The **Policy Agent** retrieves matching clauses from uploaded internal PDFs (Qdrant RAG), scoped to the selected company.
5. **Scoring**: The system generates a `[Crisis Risk Score: X/10]`.
6. **Synthesis**: The **Writer Agent** drafts an empathetic public response that avoids legal admission of liability (unless authorized by policy).
7. **Delivery**: Markdown-formatted response streams token-by-token to the dashboard.

---

## 🏢 Multi-Company Architecture

EchoShield supports uploading policies from multiple organizations simultaneously:

- Each document is tagged with a **company name** at upload time
- The sidebar shows **company filter tabs** to scope the view
- When a company is selected, RAG queries are **filtered by company metadata** in Qdrant
- This enables isolated policy analysis — Company A's refund policy doesn't leak into Company B's crisis response
