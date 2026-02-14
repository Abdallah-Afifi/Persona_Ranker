import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/export
 * Exports the top N relevant leads per company as CSV.
 * Query params:
 *   - top_n: number of top leads per company (default: 3)
 *   - run_id: specific run to export (default: latest)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topN = parseInt(searchParams.get("top_n") || "3", 10);
    let runId = searchParams.get("run_id");

    // Get latest completed run if not specified
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
          { error: "No completed ranking runs found" },
          { status: 404 }
        );
      }
      runId = latestRun.id;
    }

    // Get results with lead data, only relevant leads
    const { data: results, error } = await supabase
      .from("ranking_results")
      .select(`
        *,
        lead:leads(*)
      `)
      .eq("ranking_run_id", runId)
      .eq("is_relevant", true)
      .order("relevance_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by company and take top N
    const companyGroups = new Map<string, typeof results>();
    for (const result of results || []) {
      const company = result.lead?.account_name || "Unknown";
      if (!companyGroups.has(company)) companyGroups.set(company, []);
      const group = companyGroups.get(company)!;
      if (group.length < topN) {
        group.push(result);
      }
    }

    // Build CSV
    const csvHeaders = [
      "Rank",
      "Company",
      "First Name",
      "Last Name",
      "Job Title",
      "Relevance Score",
      "Department Fit",
      "Seniority Fit",
      "Reasoning",
      "Domain",
      "Employee Range",
      "Industry",
    ];

    const csvRows: string[][] = [];
    for (const [, companyResults] of companyGroups) {
      for (const r of companyResults) {
        csvRows.push([
          String(r.rank || ""),
          r.lead?.account_name || "",
          r.lead?.lead_first_name || "",
          r.lead?.lead_last_name || "",
          r.lead?.lead_job_title || "",
          String(r.relevance_score),
          r.department_fit,
          r.seniority_fit,
          `"${(r.reasoning || "").replace(/"/g, '""')}"`,
          r.lead?.account_domain || "",
          r.lead?.account_employee_range || "",
          r.lead?.account_industry || "",
        ]);
      }
    }

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="top_${topN}_leads_per_company.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
