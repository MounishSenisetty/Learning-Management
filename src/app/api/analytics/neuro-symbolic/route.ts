import { createClient } from "@supabase/supabase-js";
import { computeNeuroSymbolicInsights } from "@/lib/analytics";
import { NeuroSymbolicInsight } from "@/lib/analytics";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(): Promise<Response> {
  try {
    const { data: attempts, error } = await supabase
      .from("attempts")
      .select(
        `
        attempt_id,
        student_id,
        roll_number,
        full_name,
        experiment_type,
        attempt_number,
        pre_test_score,
        post_test_score,
        learning_gain,
        normalized_gain,
        efficiency,
        time_taken_seconds,
        engagement_score,
        cohort,
        created_at
      `,
      );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const insights: NeuroSymbolicInsight = computeNeuroSymbolicInsights(attempts ?? []);

    return Response.json(insights);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
