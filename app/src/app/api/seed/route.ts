import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

/**
 * POST /api/seed
 * Loads leads from the CSV file into the database.
 * This can also accept CSV content in the request body for reusability.
 */
export async function POST(request: Request) {
  try {
    let csvContent: string;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      // Accept CSV content directly from request body
      csvContent = await request.text();
    } else {
      // Default: read from the local leads.csv file inside app/data/
      const csvPath = path.join(process.cwd(), "data", "leads.csv");
      csvContent = fs.readFileSync(csvPath, "utf-8");
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (!records.length) {
      return NextResponse.json({ error: "No records found in CSV" }, { status: 400 });
    }

    // Map CSV columns to database columns
    const leads = records.map(
      (row) => ({
        account_name: row.account_name || "",
        lead_first_name: row.lead_first_name || "",
        lead_last_name: row.lead_last_name || "",
        lead_job_title: row.lead_job_title || "",
        account_domain: row.account_domain || "",
        account_employee_range: row.account_employee_range || "",
        account_industry: row.account_industry || "",
      })
    );

    // Clear existing leads (for re-seeding)
    await supabase.from("ranking_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("ranking_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches of 50
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const { error } = await supabase.from("leads").insert(batch);

      if (error) {
        console.error("Insert error:", error);
        return NextResponse.json(
          { error: `Failed to insert batch: ${error.message}` },
          { status: 500 }
        );
      }
      insertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully loaded ${insertedCount} leads into the database`,
      count: insertedCount,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: `Seed failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
