"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearFlowState, getCurrentStudent, getFlowState } from "@/lib/storage";
import { AppHeader } from "@/components/app-header";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { fetchQuestions, Question } from "@/lib/questions";
import { ExperimentType } from "@/types/domain";

export default function SurveyPage() {
  const router = useRouter();
  const flow = useMemo(() => getFlowState(), []);
  const student = useMemo(() => getCurrentStudent(), []);

  const [surveyQuestions, setSurveyQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load TAM survey questions on mount
  useEffect(() => {
    async function loadSurvey() {
      try {
        if (!flow?.experimentType) {
          throw new Error("No experiment type found in flow state.");
        }
        const questions = await fetchQuestions(flow.experimentType as ExperimentType, "survey");
        setSurveyQuestions(questions);
        
        // Initialize answers with neutral (middle) value
        const initialAnswers: Record<string, number> = {};
        questions.forEach((q) => {
          initialAnswers[q.id] = 2; // Default to middle option (0-indexed, so 2 for 5-point scale)
        });
        setAnswers(initialAnswers);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load survey questions");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [flow?.experimentType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!student?.id || !flow?.experimentType) {
        throw new Error("Missing active student or flow state.");
      }

      const startedAt = flow.simulationStartedAt ?? Date.now();
      const endedAt = flow.simulationEndedAt ?? Date.now();
      const timeTakenSeconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));

      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          experimentType: flow.experimentType,
          preTestScore: flow.preTestScore ?? 0,
          postTestScore: flow.postTestScore ?? 0,
          timeTakenSeconds,
          engagementScore: flow.engagementScore ?? 0,
          interactionCount: flow.interactionCount ?? 0,
          checkpointTelemetry: flow.checkpointTelemetry ?? [],
          survey: {
            answers,
            feedbackText,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to save attempt");
      }

      clearFlowState();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container">
          <div className="workspace-main">
            <section className="section-card">
              <h1 className="text-4xl font-bold">Post-Experiment Survey</h1>
              <p className="mt-2 text-slate-600">Provide your feedback on the learning technology and your experience with the experiment.</p>
              <WorkflowStepper activeStep={4} />

              {loading ? (
                <p className="mt-6 text-sm text-slate-500">Loading survey questions...</p>
              ) : (
                <form className="mt-6 space-y-6" onSubmit={onSubmit}>
                  {surveyQuestions.map((question) => (
                    <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <label className="block text-sm font-medium text-slate-800">
                        {question.text}
                      </label>
                      <div className="mt-3 flex gap-2">
                        {question.options.map((option, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: idx }))}
                            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition ${
                              answers[question.id] === idx
                                ? "bg-teal-600 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="label">Additional Feedback (Optional)</label>
                    <textarea
                      className="textarea min-h-28"
                      placeholder="Share any additional comments or suggestions..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
                    {submitting ? "Saving..." : "Save Attempt"}
                  </button>
                </form>
              )}
            </section>

            <aside className="section-card">
              <h2 className="text-xl font-semibold">Survey Guidance</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>This survey uses the Technology Acceptance Model (TAM) to measure your perceptions of the learning technology across key dimensions.</p>
                <div className="side-card">
                  <p className="font-medium text-slate-800">Scale Dimensions</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li><strong>Perceived Usefulness:</strong> Will this tool help you learn better?</li>
                    <li><strong>Perceived Ease of Use:</strong> Is this tool easy to use?</li>
                    <li><strong>Attitude:</strong> Do you like using this tool?</li>
                    <li><strong>Behavioral Intention:</strong> Will you use this tool again?</li>
                  </ul>
                </div>
                <div className="side-card">
                  <p className="font-medium text-slate-800">Completion</p>
                  <p className="mt-1">Your honest responses are valuable for improving the learning platform. Submitting finalizes your attempt.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
