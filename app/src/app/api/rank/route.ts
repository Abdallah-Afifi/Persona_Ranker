import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rankLead } from "@/lib/ranking-service";
import { Lead } from "@/lib/types";

// Allow up to 5 minutes for the ranking process (200 leads)
export const maxDuration = 300;

// Approximate cost for Groq free tier (effectively $0, but tracking tokens)
const COST_PER_1K_TOKENS = 0.0;

/**
 * POST /api/rank
 * Executes the AI ranking process for all leads.
 * Creates a ranking run, processes each lead, and assigns ranks per company.
 */
export async function POST() {
  try {
    // Fetch all leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .order("account_name");

    if (leadsError || !leads?.length) {
      return NextResponse.json(
        { error: leadsError?.message || "No leads found. Please seed the database first." },
        { status: 400 }
      );
    }

    // Create a new ranking run
    const { data: run, error: runError } = await supabase
      .from("ranking_runs")
      .insert({
        status: "running",
        total_leads: leads.length,
        processed_leads: 0,
      })
      .select()
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: `Failed to create ranking run: ${runError?.message}` },
        { status: 500 }
      );
    }

    let totalTokens = 0;
    let processedCount = 0;
    const results: Array<{
      lead: Lead;
      relevance_score: number;
      is_relevant: boolean;
      reasoning: string;
      department_fit: string;
      seniority_fit: string;
    }> = [];

    // Process leads with rate limiting (Groq free tier: 30 RPM)
    for (const lead of leads) {
      try {
        const { result, tokensUsed } = await rankLead(lead as Lead);
        totalTokens += tokensUsed;
        processedCount++;

        results.push({
          lead: lead as Lead,
          relevance_score: result.relevance_score,
          is_relevant: result.is_relevant,
          reasoning: result.reasoning,
          department_fit: result.department_fit,
          seniority_fit: result.seniority_fit,
        });

        // Update run progress every 5 leads
        if (processedCount % 5 === 0) {
          await supabase
            .from("ranking_runs")
            .update({
              processed_leads: processedCount,
              total_tokens: totalTokens,
              total_cost: (totalTokens / 1000) * COST_PER_1K_TOKENS,
            })
            .eq("id", run.id);
        }

        // Rate limiting: 2.5s delay between calls to stay within Groq free tier (30 RPM, 6000 TPM)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (err) {
        console.error(`Error ranking lead ${lead.lead_first_name} ${lead.lead_last_name}:`, err);
        results.push({
          lead: lead as Lead,
          relevance_score: 0,
          is_relevant: false,
          reasoning: `Ranking failed: ${(err as Error).message}`,
          department_fit: "poor",
          seniority_fit: "poor",
        });
        processedCount++;

        // On rate limit, wait longer
        if ((err as Error).message?.includes("rate")) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    // Group results by company and assign per-company ranks
    const companied = new Map<string, typeof results>();
    for (const r of results) {
      const company = r.lead.account_name;
      if (!companied.has(company)) companied.set(company, []);
      companied.get(company)!.push(r);
    }

    const rankedResults: Array<{
      ranking_run_id: string;
      lead_id: string;
      rank: number | null;
      relevance_score: number;
      is_relevant: boolean;
      reasoning: string;
      department_fit: string;
      seniority_fit: string;
    }> = [];

    for (const [, companyLeads] of companied) {
      // Sort by relevance score descending
      const sorted = companyLeads.sort(
        (a, b) => b.relevance_score - a.relevance_score
      );

      let rank = 1;
      for (const r of sorted) {
        rankedResults.push({
          ranking_run_id: run.id,
          lead_id: r.lead.id,
          rank: r.is_relevant ? rank++ : null, // Only relevant leads get a rank
          relevance_score: r.relevance_score,
          is_relevant: r.is_relevant,
          reasoning: r.reasoning,
          department_fit: r.department_fit,
          seniority_fit: r.seniority_fit,
        });
      }
    }

    // Insert all results in batches
    const batchSize = 50;
    for (let i = 0; i < rankedResults.length; i += batchSize) {
      const batch = rankedResults.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from("ranking_results")
        .insert(batch);

      if (insertError) {
        console.error("Insert ranking result error:", insertError);
      }
    }

    // Mark run as completed
    const totalCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;
    await supabase
      .from("ranking_runs")
      .update({
        status: "completed",
        processed_leads: processedCount,
        total_tokens: totalTokens,
        total_cost: totalCost,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({
      success: true,
      run_id: run.id,
      total_processed: processedCount,
      total_tokens: totalTokens,
      total_cost: totalCost,
    });
  } catch (error) {
    console.error("Ranking error:", error);
    return NextResponse.json(
      { error: `Ranking failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
