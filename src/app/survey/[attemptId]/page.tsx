"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearFlowState, getCurrentStudent, getFlowState } from "@/lib/storage";

const fields = ["understanding", "engagement", "difficulty", "usability", "confidence"] as const;

type LikertField = (typeof fields)[number];

export default function SurveyPage() {
  const router = useRouter();
  const flow = useMemo(() => getFlowState(), []);
  const student = useMemo(() => getCurrentStudent(), []);

  const [values, setValues] = useState<Record<LikertField, number>>({
    understanding: 3,
    engagement: 3,
    difficulty: 3,
    usability: 3,
    confidence: 3,
  });
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
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
            ...values,
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
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="content-card max-w-2xl">
        <h1 className="text-2xl font-bold">Post-Experiment Survey</h1>
        <p className="mt-2 text-slate-600">Provide feedback to measure perceived understanding and usability.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {fields.map((field) => (
            <div key={field}>
              <label className="label capitalize">{field}</label>
              <select
                className="select"
                value={values[field]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
              >
                <option value={1}>1 - Very Low</option>
                <option value={2}>2 - Low</option>
                <option value={3}>3 - Moderate</option>
                <option value={4}>4 - High</option>
                <option value={5}>5 - Very High</option>
              </select>
            </div>
          ))}

          <div>
            <label className="label">Open Feedback</label>
            <textarea
              className="textarea min-h-28"
              placeholder="What helped you learn? What was difficult?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save Attempt"}
          </button>
        </form>
      </section>
    </main>
  );
}
