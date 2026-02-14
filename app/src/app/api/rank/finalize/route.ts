import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/rank/finalize
 * After all batches are processed, this assigns per-company ranks
 * and marks the ranking run as completed.
 *
 * Body: { run_id: string }
 */
export async function POST(request: Request) {
  try {
    const { run_id } = await request.json();

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id is required" },
        { status: 400 }
      );
    }

    // Fetch all results for this run with lead data
    const { data: results, error: resultsError } = await supabase
      .from("ranking_results")
      .select("id, lead_id, relevance_score, is_relevant, lead:leads(account_name)")
      .eq("ranking_run_id", run_id);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 }
      );
    }

    // Group by company and assign per-company ranks
    const companyGroups = new Map<string, Array<{ id: string; relevance_score: number; is_relevant: boolean }>>();

    for (const r of results || []) {
      const company = (r.lead as unknown as { account_name: string })?.account_name || "Unknown";
      if (!companyGroups.has(company)) companyGroups.set(company, []);
      companyGroups.get(company)!.push({
        id: r.id,
        relevance_score: r.relevance_score,
        is_relevant: r.is_relevant,
      });
    }

    // Assign ranks: within each company, relevant leads ranked by score descending
    for (const [, companyResults] of companyGroups) {
      const sorted = companyResults.sort((a, b) => b.relevance_score - a.relevance_score);
      let rank = 1;
      for (const r of sorted) {
        await supabase
          .from("ranking_results")
          .update({ rank: r.is_relevant ? rank++ : null })
          .eq("id", r.id);
      }
    }

    // Mark run as completed
    const { data: run } = await supabase
      .from("ranking_runs")
      .select("total_tokens")
      .eq("id", run_id)
      .single();

    await supabase
      .from("ranking_runs")
      .update({
        status: "completed",
        total_cost: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run_id);

    return NextResponse.json({
      success: true,
      total_tokens: run?.total_tokens || 0,
      total_results: results?.length || 0,
      relevant_count: results?.filter((r) => r.is_relevant).length || 0,
    });
  } catch (error) {
    console.error("Finalize error:", error);
    return NextResponse.json(
      { error: `Finalize failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
