import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/rank
 * Creates a new ranking run and returns lead IDs to be processed in batches.
 * The frontend drives the batch loop via /api/rank/batch.
 */
export async function POST() {
  try {
    // Fetch all leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .order("account_name");

    if (leadsError || !leads?.length) {
      return NextResponse.json(
        { error: leadsError?.message || "No leads found. Please seed the database first." },
        { status: 400 }
      );
    }

    // Clear previous results for a clean run
    const { data: previousRuns } = await supabase
      .from("ranking_runs")
      .select("id")
      .eq("status", "running");

    if (previousRuns?.length) {
      for (const r of previousRuns) {
        await supabase.from("ranking_runs").update({ status: "failed" }).eq("id", r.id);
      }
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

    const leadIds = leads.map((l) => l.id);

    return NextResponse.json({
      success: true,
      run_id: run.id,
      lead_ids: leadIds,
      total: leadIds.length,
    });
  } catch (error) {
    console.error("Ranking start error:", error);
    return NextResponse.json(
      { error: `Failed to start ranking: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
