-- Leads table: stores imported lead data
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  lead_first_name TEXT NOT NULL,
  lead_last_name TEXT NOT NULL,
  lead_job_title TEXT DEFAULT '',
  account_domain TEXT DEFAULT '',
  account_employee_range TEXT DEFAULT '',
  account_industry TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ranking runs: tracks each execution of the ranking process
CREATE TABLE IF NOT EXISTS ranking_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_leads INTEGER NOT NULL DEFAULT 0,
  processed_leads INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Ranking results: stores the AI ranking for each lead per run
CREATE TABLE IF NOT EXISTS ranking_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ranking_run_id UUID NOT NULL REFERENCES ranking_runs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rank INTEGER,
  relevance_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  is_relevant BOOLEAN NOT NULL DEFAULT false,
  reasoning TEXT DEFAULT '',
  department_fit TEXT DEFAULT 'poor',
  seniority_fit TEXT DEFAULT 'poor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ranking_results_run_id ON ranking_results(ranking_run_id);
CREATE INDEX IF NOT EXISTS idx_ranking_results_lead_id ON ranking_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_ranking_results_relevance ON ranking_results(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_account_name ON leads(account_name);

-- Enable Row Level Security but allow all operations for anon key (for this demo)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_results ENABLE ROW LEVEL SECURITY;

-- Policies to allow all operations (for demo purposes)
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ranking_runs" ON ranking_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ranking_results" ON ranking_results FOR ALL USING (true) WITH CHECK (true);
