export interface Lead {
  id: string;
  account_name: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_job_title: string;
  account_domain: string;
  account_employee_range: string;
  account_industry: string;
  created_at: string;
}

export interface RankingResult {
  id: string;
  lead_id: string;
  rank: number | null;
  relevance_score: number;
  is_relevant: boolean;
  reasoning: string;
  department_fit: string;
  seniority_fit: string;
  created_at: string;
  lead?: Lead;
}

export interface RankingRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  total_leads: number;
  processed_leads: number;
  total_cost: number;
  total_tokens: number;
  created_at: string;
  completed_at: string | null;
}

export type CompanySize =
  | "startup"
  | "smb"
  | "mid-market"
  | "enterprise"
  | "unknown";

export interface AIRankingResponse {
  relevance_score: number;
  is_relevant: boolean;
  reasoning: string;
  department_fit: string;
  seniority_fit: string;
}
