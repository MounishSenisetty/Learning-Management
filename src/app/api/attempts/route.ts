import { NextResponse } from "next/server";
import { createAttemptSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAttemptSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const { data: experiment, error: expError } = await supabase
      .from("experiments")
      .select("id")
      .eq("type", parsed.experimentType)
      .single();

    if (expError) throw expError;

    const { data: latest, error: latestError } = await supabase
      .from("attempts")
      .select("attempt_number")
      .eq("student_id", parsed.studentId)
      .eq("experiment_id", experiment.id)
      .order("attempt_number", { ascending: false })
      .limit(1);

    if (latestError) throw latestError;

    const nextAttempt = (latest?.[0]?.attempt_number ?? 0) + 1;

    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .insert({
        student_id: parsed.studentId,
        experiment_id: experiment.id,
        pre_test_score: parsed.preTestScore,
        post_test_score: parsed.postTestScore,
        time_taken_seconds: parsed.timeTakenSeconds,
        attempt_number: nextAttempt,
        engagement_score: parsed.engagementScore,
        retention_score: parsed.retentionScore ?? null,
      })
      .select("id")
      .single();

    if (attemptError) throw attemptError;

    const { error: surveyError } = await supabase.from("survey_responses").insert({
      attempt_id: attempt.id,
      student_id: parsed.studentId,
      understanding: parsed.survey.understanding,
      engagement: parsed.survey.engagement,
      difficulty: parsed.survey.difficulty,
      usability: parsed.survey.usability,
      confidence: parsed.survey.confidence,
      feedback_text: parsed.survey.feedbackText ?? null,
    });

    if (surveyError) throw surveyError;

    const events: Array<{ attempt_id: string; student_id: string; event_type: string; event_value: Record<string, unknown> }> = [];

    if (typeof parsed.interactionCount === "number") {
      events.push({
        attempt_id: attempt.id,
        student_id: parsed.studentId,
        event_type: "simulation_summary",
        event_value: {
          interactionCount: parsed.interactionCount,
          engagementScore: parsed.engagementScore,
          timeTakenSeconds: parsed.timeTakenSeconds,
        },
      });
    }

    if (parsed.checkpointTelemetry?.length) {
      for (const cp of parsed.checkpointTelemetry) {
        events.push({
          attempt_id: attempt.id,
          student_id: parsed.studentId,
          event_type: "section_checkpoint",
          event_value: {
            questionId: cp.questionId,
            section: cp.section,
            totalAttempts: cp.totalAttempts,
            wrongAttempts: cp.wrongAttempts,
            hintShownCount: cp.hintShownCount,
            reselectionsAfterHint: cp.reselectionsAfterHint,
            passed: cp.passed,
          },
        });
      }
    }

    if (events.length) {
      const { error: eventError } = await supabase.from("interaction_events").insert(events);
      if (eventError) throw eventError;
    }

    return NextResponse.json({ attemptId: attempt.id, attemptNumber: nextAttempt }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save attempt" }, { status: 400 });
  }
}
