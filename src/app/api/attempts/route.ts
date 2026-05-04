import { NextResponse } from "next/server";
import { createAttemptSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";

const scaleLabels = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] as const;

const tamQuestionMeta: Record<string, { construct: string }> = {
  "ecg-survey-pu-1": { construct: "PU" },
  "ecg-survey-pu-2": { construct: "PU" },
  "ecg-survey-pu-3": { construct: "PU" },
  "ecg-survey-peou-1": { construct: "PEOU" },
  "ecg-survey-peou-2": { construct: "PEOU" },
  "ecg-survey-peou-3": { construct: "PEOU" },
  "ecg-survey-atu-1": { construct: "ATU" },
  "ecg-survey-atu-2": { construct: "ATU" },
  "ecg-survey-bi-1": { construct: "BI" },
  "ecg-survey-bi-2": { construct: "BI" },
  "emg-survey-pu-1": { construct: "PU" },
  "emg-survey-pu-2": { construct: "PU" },
  "emg-survey-pu-3": { construct: "PU" },
  "emg-survey-peou-1": { construct: "PEOU" },
  "emg-survey-peou-2": { construct: "PEOU" },
  "emg-survey-peou-3": { construct: "PEOU" },
  "emg-survey-atu-1": { construct: "ATU" },
  "emg-survey-atu-2": { construct: "ATU" },
  "emg-survey-bi-1": { construct: "BI" },
  "emg-survey-bi-2": { construct: "BI" },
};

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

    const { error: surveyError } = await supabase.from("tam_survey_responses").insert({
      attempt_id: attempt.id,
      student_id: parsed.studentId,
      experiment_type: parsed.experimentType,
      instrument_id: "TAM-001",
      instrument_version: "1.0",
      feedback_text: parsed.survey.feedbackText ?? null,
    });

    if (surveyError) throw surveyError;

    const surveyItemRows = Object.entries(parsed.survey.answers).flatMap(([questionId, answerIndex]) => {
      const meta = tamQuestionMeta[questionId];
      if (!meta) return [];
      const answerText = scaleLabels[answerIndex] ?? scaleLabels[2];

      return [
        {
          attempt_id: attempt.id,
          student_id: parsed.studentId,
          experiment_type: parsed.experimentType,
          question_id: questionId,
          construct: meta.construct,
          answer_index: answerIndex + 1,
          answer_text: answerText,
          instrument_id: "TAM-001",
          instrument_version: "1.0",
          is_reverse_scored: false,
        },
      ];
    });

    if (surveyItemRows.length) {
      const { error: itemError } = await supabase.from("tam_survey_item_responses").insert(surveyItemRows);
      if (itemError) throw itemError;
    }

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
          simulationSkipped: parsed.simulationSkipped ?? false,
          preTestDurationSeconds: parsed.preTestDurationSeconds ?? 0,
          postTestDurationSeconds: parsed.postTestDurationSeconds ?? 0,
          workflowDurationSeconds: parsed.workflowDurationSeconds ?? parsed.timeTakenSeconds,
          integrityIndicators: parsed.integrityIndicators ?? {
            tabSwitchCount: 0,
            inactivityCount: 0,
            inactivitySeconds: 0,
            abnormalPatternScore: 0,
          },
        },
      });
    }

    if (parsed.sectionDurations?.length) {
      for (const sectionDuration of parsed.sectionDurations) {
        events.push({
          attempt_id: attempt.id,
          student_id: parsed.studentId,
          event_type: "section_duration",
          event_value: {
            section: sectionDuration.section,
            durationSeconds: sectionDuration.durationSeconds,
          },
        });
      }
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
