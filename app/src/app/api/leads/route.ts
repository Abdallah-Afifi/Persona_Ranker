import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/leads
 * Retrieves all leads from the database.
 */
export async function GET() {
  try {
    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("account_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data, count });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
