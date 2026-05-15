import { NextResponse } from "next/server";
import { computeNeuroSymbolicInsights } from "@/lib/analytics";
import { NeuroSymbolicInsight } from "@/lib/analytics";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  loadPersonalizedRecommendations,
  convertRecommendationsToNeuroSymbolic,
} from "@/lib/recommendations-processor";

export async function GET(): Promise<Response> {
  try {
    // First try to load from personalized recommendations CSV
    const recommendations = loadPersonalizedRecommendations();

    if (recommendations.length > 0) {
      const insights = convertRecommendationsToNeuroSymbolic(recommendations);
      return NextResponse.json(insights);
    }

    // Fallback to Supabase if CSV is not available
    const supabase = getSupabaseAdmin();
    const { data: attempts, error } = await supabase
      .from("v_student_attempt_summary")
      .select(
        `
        attempt_id,
        student_id,
        experiment_type,
        attempt_number,
        pre_test_score,
        post_test_score,
        learning_gain,
        normalized_gain,
        efficiency,
        time_taken_seconds,
        engagement_score,
        created_at
      `,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attemptsRaw = attempts ?? [];
    // Deduplicate rows by attempt_id (keep latest by created_at)
    const attemptsMap = new Map<string, any>();
    for (const a of attemptsRaw) {
      const key = String(a.attempt_id);
      const existing = attemptsMap.get(key);
      if (!existing) {
        attemptsMap.set(key, a);
        continue;
      }
      const existingTs = new Date(existing.created_at).getTime();
      const currentTs = new Date(a.created_at).getTime();
      if (currentTs > existingTs) {
        attemptsMap.set(key, a);
      }
    }
    const dedupedAttempts = Array.from(attemptsMap.values());

    const insights: NeuroSymbolicInsight = computeNeuroSymbolicInsights(dedupedAttempts);

    return NextResponse.json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
