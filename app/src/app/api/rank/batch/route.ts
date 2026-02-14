import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rankLead } from "@/lib/ranking-service";
import { Lead } from "@/lib/types";

/**
 * POST /api/rank/batch
 * Processes a batch of leads for a given ranking run.
 * Called repeatedly by the frontend until all leads are processed.
 *
 * Body: { run_id: string, lead_ids: string[] }
 */
export async function POST(request: Request) {
  try {
    const { run_id, lead_ids } = await request.json();

    if (!run_id || !lead_ids?.length) {
      return NextResponse.json(
        { error: "run_id and lead_ids are required" },
        { status: 400 }
      );
    }

    // Fetch the leads for this batch
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .in("id", lead_ids);

    if (leadsError || !leads?.length) {
      return NextResponse.json(
        { error: leadsError?.message || "No leads found for given IDs" },
        { status: 400 }
      );
    }

    let batchTokens = 0;
    const batchResults: Array<{
      ranking_run_id: string;
      lead_id: string;
      relevance_score: number;
      is_relevant: boolean;
      reasoning: string;
      department_fit: string;
      seniority_fit: string;
    }> = [];

    for (const lead of leads) {
      try {
        const { result, tokensUsed } = await rankLead(lead as Lead);
        batchTokens += tokensUsed;

        batchResults.push({
          ranking_run_id: run_id,
          lead_id: lead.id,
          relevance_score: result.relevance_score,
          is_relevant: result.is_relevant,
          reasoning: result.reasoning,
          department_fit: result.department_fit,
          seniority_fit: result.seniority_fit,
        });

        // Rate limiting: 2s delay between Groq calls (free tier: 30 RPM)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error ranking lead ${lead.id}:`, err);

        batchResults.push({
          ranking_run_id: run_id,
          lead_id: lead.id,
          relevance_score: 0,
          is_relevant: false,
          reasoning: `Ranking failed: ${(err as Error).message}`,
          department_fit: "poor",
          seniority_fit: "poor",
        });

        // On rate limit, wait longer
        if ((err as Error).message?.includes("rate")) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    // Insert batch results
    const { error: insertError } = await supabase
      .from("ranking_results")
      .insert(batchResults);

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: `Failed to save results: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Update run progress
    const { data: run } = await supabase
      .from("ranking_runs")
      .select("processed_leads, total_tokens")
      .eq("id", run_id)
      .single();

    const newProcessed = (run?.processed_leads || 0) + batchResults.length;
    const newTokens = (run?.total_tokens || 0) + batchTokens;

    await supabase
      .from("ranking_runs")
      .update({
        processed_leads: newProcessed,
        total_tokens: newTokens,
      })
      .eq("id", run_id);

    return NextResponse.json({
      success: true,
      processed: batchResults.length,
      batch_tokens: batchTokens,
      total_processed: newProcessed,
      total_tokens: newTokens,
    });
  } catch (error) {
    console.error("Batch ranking error:", error);
    return NextResponse.json(
      { error: `Batch ranking failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
