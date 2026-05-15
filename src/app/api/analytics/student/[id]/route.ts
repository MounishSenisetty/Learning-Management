import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computeExperimentBreakdown, computeSummary, computeTimeImprovements, summarizeWorkflowEvents } from "@/lib/analytics";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("v_student_attempt_summary")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const attemptsRaw = data ?? [];
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
    const attemptIds = attempts.map((attempt) => String(attempt.attempt_id));

    const { data: events, error: eventsError } = await supabase
      .from("interaction_events")
      .select("attempt_id, event_type, event_value")
      .in("attempt_id", attemptIds.length ? attemptIds : ["00000000-0000-0000-0000-000000000000"]);

    if (eventsError) throw eventsError;

    const summary = computeSummary(attempts);
    const experimentBreakdown = computeExperimentBreakdown(attempts);
    const timeImprovements = computeTimeImprovements(attempts);
    const workflowSummary = summarizeWorkflowEvents((events ?? []) as Array<{ attempt_id: string; event_type: string; event_value: Record<string, unknown> | null }>);

    return NextResponse.json({ attempts, summary, experimentBreakdown, timeImprovements, workflowSummary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load student analytics" }, { status: 400 });
  }
}
