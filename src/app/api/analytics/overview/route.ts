import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeCohortInsights, computeExperimentBreakdown, computeSummary, computeTimeImprovements, summarizeWorkflowEvents } from "@/lib/analytics";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("v_student_attempt_summary")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const attemptsRaw = data ?? [];
    // Deduplicate rows coming from the view by attempt_id (keep latest by created_at)
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
    const attempts = Array.from(attemptsMap.values());

    const studentIds = Array.from(new Set(attempts.map((row) => String(row.student_id))));
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, cohort")
      .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    if (studentsError) throw studentsError;

    const cohortMap = new Map((students ?? []).map((student) => [String(student.id), student.cohort]));
    const attemptsWithCohort = attempts.map((attempt) => ({
      ...attempt,
      cohort: cohortMap.get(String(attempt.student_id)) ?? "Unassigned",
    }));

    const attemptIds = attempts.map((attempt) => String(attempt.attempt_id));
    const { data: events, error: eventsError } = await supabase
      .from("interaction_events")
      .select("attempt_id, event_type, event_value")
      .in("attempt_id", attemptIds.length ? attemptIds : ["00000000-0000-0000-0000-000000000000"]);

    if (eventsError) throw eventsError;

    const summary = computeSummary(attempts);
    const experimentBreakdown = computeExperimentBreakdown(attempts);
    const timeImprovements = computeTimeImprovements(attempts);
    const cohortInsights = computeCohortInsights(attemptsWithCohort);
    const workflowSummary = summarizeWorkflowEvents((events ?? []) as Array<{ attempt_id: string; event_type: string; event_value: Record<string, unknown> | null }>);

    return NextResponse.json({ attempts: attemptsWithCohort, summary, experimentBreakdown, timeImprovements, cohortInsights, workflowSummary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load analytics" }, { status: 400 });
  }
}
