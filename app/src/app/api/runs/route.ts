import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/runs
 * Retrieves all ranking runs with their stats.
 */
export async function GET() {
  try {
    const { data: runs, error } = await supabase
      .from("ranking_runs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ runs: runs || [] });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
