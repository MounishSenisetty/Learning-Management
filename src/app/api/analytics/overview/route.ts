import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeExperimentBreakdown, computeSummary, computeTimeImprovements } from "@/lib/analytics";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("v_student_attempt_summary")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const attempts = data ?? [];
    const summary = computeSummary(attempts);
    const experimentBreakdown = computeExperimentBreakdown(attempts);
    const timeImprovements = computeTimeImprovements(attempts);

    return NextResponse.json({ attempts, summary, experimentBreakdown, timeImprovements });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load analytics" }, { status: 400 });
  }
}
