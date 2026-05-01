import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function convertToCSV(data: Array<Record<string, unknown>>): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.map((h) => `"${h}"`).join(",");

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${value}"`;
      })
      .join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "overview";
    const supabase = getSupabaseAdmin();

    let data: Array<Record<string, unknown>> = [];
    let filename = "export";

    if (exportType === "students") {
      const { data: students, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      data = students ?? [];
      filename = `students-${new Date().toISOString().split("T")[0]}`;
    } else if (exportType === "attempts") {
      const { data: attempts, error } = await supabase
        .from("v_student_attempt_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      data = attempts ?? [];
      filename = `attempts-${new Date().toISOString().split("T")[0]}`;
    } else if (exportType === "survey") {
      const { data: surveys, error } = await supabase
        .from("survey_responses")
        .select(
          `id, attempt_id, student_id, understanding, engagement, difficulty, usability, confidence, feedback_text, created_at`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      data = surveys ?? [];
      filename = `survey-responses-${new Date().toISOString().split("T")[0]}`;
    } else {
      // Default to overview/summary
      const { data: attempts, error } = await supabase
        .from("v_student_attempt_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      data = attempts ?? [];
      filename = `analytics-overview-${new Date().toISOString().split("T")[0]}`;
    }

    const csv = convertToCSV(data);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
