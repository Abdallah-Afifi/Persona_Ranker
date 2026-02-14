import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/results
 * Retrieves ranking results for the latest ranking run, joined with lead data.
 * Query params:
 *   - run_id: specific run to fetch (default: latest)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let runId = searchParams.get("run_id");

    // If no specific run, get the latest completed one
    if (!runId) {
      const { data: latestRun } = await supabase
        .from("ranking_runs")
        .select("id")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!latestRun) {
        return NextResponse.json(
          { results: [], run: null, message: "No completed ranking runs found" },
          { status: 200 }
        );
      }
      runId = latestRun.id;
    }

    // Get the run details
    const { data: run } = await supabase
      .from("ranking_runs")
      .select("*")
      .eq("id", runId)
      .single();

    // Get results with lead data
    const { data: results, error } = await supabase
      .from("ranking_results")
      .select(`
        *,
        lead:leads(*)
      `)
      .eq("ranking_run_id", runId)
      .order("relevance_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: results || [], run });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
