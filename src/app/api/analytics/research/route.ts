import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { independentTTest, pairedTTest } from "@/lib/analytics";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("v_student_attempt_summary").select("*");

    if (error) throw error;

    const attempts = data ?? [];
    const pre = attempts.map((a) => Number(a.pre_test_score));
    const post = attempts.map((a) => Number(a.post_test_score));
    const ecgGain = attempts
      .filter((a) => a.experiment_type === "ECG")
      .map((a) => Number(a.learning_gain));
    const emgGain = attempts
      .filter((a) => a.experiment_type === "EMG")
      .map((a) => Number(a.learning_gain));

    return NextResponse.json({
      pairedTTestPrePost: pairedTTest(pre, post),
      independentTTestEcgVsEmgGain: independentTTest(ecgGain, emgGain),
      interpretationGuide: {
        prePost: "Positive t-statistic with larger meanDifference supports post-test improvement.",
        emgVsEcg: "Magnitude and sign of t-statistic indicate relative gain differences between modalities.",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to run research analytics" }, { status: 400 });
  }
}
