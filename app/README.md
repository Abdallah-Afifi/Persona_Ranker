# Persona Ranker

AI-powered lead qualification and ranking system built for Throxy. Given a list of people at target companies, this system qualifies and ranks them against an ideal customer persona and surfaces the best relevant contacts for each company.

## Live Demo

🔗 [Deployed on Vercel](https://persona-ranker-eight.vercel.app)

📂 [GitHub Repository](https://github.com/Abdallah-Afifi/Persona_Ranker)

## How to Run Locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free tier)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abdallah-Afifi/Persona_Ranker.git
   cd Persona_Ranker/app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL, anon key, and Groq API key.

4. **Set up the database:**
   Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)** and:
   - Click "Load Default CSV" to seed the database with the provided leads
   - Click "Run AI Ranking" to execute the ranking process
   - View, sort, filter, and export the results

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Dashboard   │  │ Results Table │  │  Controls  │  │
│  │  Component   │  │ (TanStack)   │  │  (Actions) │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                 │          │
└─────────┼────────────────┼─────────────────┼──────────┘
          │                │                 │
┌─────────┼────────────────┼─────────────────┼──────────┐
│         ▼                ▼                 ▼          │
│              Next.js API Routes                        │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌─────────────┐  │
│  │ /api/seed │ │/api/rank │ │/api/ │ │ /api/export │  │
│  │          │ │          │ │results│ │             │  │
│  └────┬─────┘ └────┬─────┘ └──┬───┘ └──────┬──────┘  │
│       │            │          │             │          │
└───────┼────────────┼──────────┼─────────────┼──────────┘
        │            │          │             │
        ▼            ▼          ▼             ▼
┌────────────────────────────────────────────────────────┐
│                  Supabase (Postgres)                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐│
│  │  leads   │  │ ranking_runs │  │ ranking_results   ││
│  └──────────┘  └──────────────┘  └───────────────────┘│
└────────────────────────────────────────────────────────┘
        ▲
        │  (AI Ranking)
┌───────┴──────────────────┐
│     Groq API (Llama 3.3) │
│  - Lead evaluation       │
│  - JSON structured output│
└──────────────────────────┘
```

## Key Decisions

### 1. AI Provider: Groq (Llama 3.3 70B)
- **Why:** Free tier with generous limits, fast inference (~200ms per call), and Llama 3.3 70B produces high-quality structured JSON outputs for lead evaluation.
- **Tradeoff:** Groq's free tier has rate limits (30 RPM), so ranking 200 leads takes ~8-10 minutes. In production, we'd use a paid tier to eliminate rate limiting.

### Batched Ranking Architecture
The ranking process is split into three API calls to work within Vercel's serverless function timeout (60s on the Hobby plan):

1. **`POST /api/rank`** — Creates a ranking run and returns all lead IDs (~instant)
2. **`POST /api/rank/batch`** — Processes 10 leads per request (~20-25s each). The frontend calls this repeatedly in a loop.
3. **`POST /api/rank/finalize`** — Assigns per-company ranks and marks the run as completed (~instant)

The frontend drives the loop, updating a progress bar after each batch. This means no single serverless invocation exceeds the timeout, while still providing real-time progress feedback.

**Why not process all leads in one request?** Vercel Hobby has a 60s function timeout. With a 2s delay between Groq calls for rate limiting, processing 200 leads takes ~8 minutes — far exceeding any single-request timeout. The batched approach solves this without requiring Vercel Pro or a background job queue.

### 2. Ranking Strategy: Per-Company Relevance Scoring
- Each lead is evaluated individually against the full persona spec, receiving a 0-100 relevance score.
- Leads are classified as relevant/irrelevant based on hard exclusion criteria (HR, Finance, Engineering roles are auto-disqualified).
- Within each company, relevant leads are ranked by score, and irrelevant leads receive no rank.
- This means a company with only irrelevant contacts won't surface any ranked leads—preventing bad outreach.

### 3. Company Size-Aware Scoring
- The AI prompt includes the company size classification (startup/SMB/mid-market/enterprise).
- This directly affects scoring since the ideal buyer profile changes dramatically by company size (e.g., Founders at startups vs. VP Sales Development at enterprise).

### 4. Structured AI Output
- The AI returns structured JSON with: relevance_score, is_relevant, reasoning, department_fit, seniority_fit.
- Temperature set to 0.1 for consistent, reproducible rankings.
- Fallback handling for cases where JSON parsing fails.

### 5. CSV Upload Support (Reusability)
- The seed endpoint accepts both the default leads.csv and custom CSV uploads via the frontend.
- This makes the system easily reusable for new lead lists as the business scales.

### 6. TanStack Table for UI
- Full client-side sorting on all columns (including rank), filtering, search, and pagination.
- Bonus: CSV export of top N leads per company for campaign use.

## Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Batched frontend-driven ranking | Each batch of 10 leads is a separate API call (~25s), keeping within Vercel's 60s timeout. Simpler than a job queue but the browser tab must stay open. In production, we'd use a background worker (Inngest, BullMQ) with WebSocket updates. |
| In-memory persona spec | The persona spec is embedded in the code rather than stored in DB. For a multi-tenant system, we'd make it configurable per customer. |
| Single AI call per lead | Each lead gets its own API call for accuracy. Batching leads per company could reduce costs but would sacrifice per-lead evaluation depth. |
| Groq free tier + 2s rate limit delay | No cost but rate limited (30 RPM). The 2s delay between calls keeps us within limits, making the full ranking of 200 leads take ~8-10 minutes. A paid tier would remove this bottleneck entirely. |
| RLS policies allow all | For this demo, Row Level Security permits all operations. In production, we'd scope access by user/organization. |

## Bonus Features Implemented

- **✅ Sortable table** — Click any column header to sort ascending/descending
- **✅ CSV Export** — Export top N leads per company as a downloadable CSV file
- **✅ CSV Upload** — Upload new lead CSVs from the frontend for re-ranking
- **✅ Token tracking** — Each ranking run tracks total tokens consumed

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, TanStack Table
- **Backend:** Next.js API Routes
- **Database:** Supabase (Postgres)
- **AI:** Groq (Llama 3.3 70B Versatile)
- **Deployment:** Vercel
