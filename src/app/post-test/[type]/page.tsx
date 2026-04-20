"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchQuestions, getDefaultQuestions, scoreAnswers, type Question } from "@/lib/questions";
import { ExperimentType } from "@/types/domain";
import { getFlowState, setFlowState } from "@/lib/storage";
import { AppHeader } from "@/components/app-header";
import { WorkflowStepper } from "@/components/workflow-stepper";

const sectionStyles: Record<string, { icon: string; accent: string; text: string }> = {
  analysis: { icon: "📊", accent: "border-teal-500", text: "text-teal-600" },
  recording: { icon: "🎧", accent: "border-blue-500", text: "text-blue-600" },
  calibration: { icon: "⚙️", accent: "border-purple-500", text: "text-purple-600" },
  preparation: { icon: "🧪", accent: "border-emerald-500", text: "text-emerald-600" },
  equipment: { icon: "🧰", accent: "border-cyan-500", text: "text-cyan-600" },
};

export default function PostTestPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = (params.type || "ECG").toUpperCase() as ExperimentType;
  const defaultQuestions = useMemo(() => getDefaultQuestions(type, "post-test"), [type]);
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, number>>({});
  const [loadedType, setLoadedType] = useState<ExperimentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeQuestions = loadedType === type ? questions : defaultQuestions;
  const answers = activeQuestions.map((question) => answersByQuestionId[question.id] ?? -1);
  const isLoadingQuestions = loadedType !== type;
  const allAnswered = activeQuestions.length > 0 && answers.every((answer) => answer >= 0);
  const answeredCount = answers.filter((answer) => answer >= 0).length;
  const progressPercent = Math.round((answeredCount / Math.max(1, activeQuestions.length)) * 100);
  const activeQuestion = Math.min(activeQuestions.length, answers.findIndex((answer) => answer < 0) + 1 || activeQuestions.length);

  useEffect(() => {
    let cancelled = false;

    fetchQuestions(type, "post-test")
      .then((nextQuestions) => {
        if (cancelled) return;
        setQuestions(nextQuestions);
        setLoadedType(type);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions(defaultQuestions);
        setLoadedType(type);
      });

    return () => {
      cancelled = true;
    };
  }, [defaultQuestions, type]);

  useEffect(() => {
    // Access check runs only after hydration; keep render tree stable between server and client.
    const flow = getFlowState();
    const canAccessPostTest = Boolean(
      flow &&
        flow.experimentType === type &&
        typeof flow.simulationEndedAt === "number" &&
        flow.simulationEndedAt > 0,
    );

    if (!canAccessPostTest) {
      router.replace(`/simulation/${type}`);
    }
  }, [router, type]);

  function submitPostTest() {
    const flow = getFlowState();
    const hasAccessNow = Boolean(
      flow &&
        flow.experimentType === type &&
        typeof flow.simulationEndedAt === "number" &&
        flow.simulationEndedAt > 0,
    );

    if (!hasAccessNow) {
      router.replace(`/simulation/${type}`);
      return;
    }

    if (isLoadingQuestions) {
      setError("Questions are still loading. Please wait a moment.");
      return;
    }

    if (!allAnswered) {
      setError("Please answer all post-test questions before continuing.");
      return;
    }

    const postTestScore = scoreAnswers(activeQuestions, answers);
    setFlowState({ ...flow, experimentType: type, postTestScore });
    router.push("/survey/new");
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container">
          <div className="workspace-main">
            <section className="section-card">
              <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-blue-500 p-6 text-white shadow-md">
                <h1 className="text-3xl font-bold md:text-4xl">{type} Post-test</h1>
                <p className="mt-2 text-base text-white/90">Measure your understanding after completing guided simulation activities.</p>
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-sm">Step 3 of 4</span>
                  <div className="h-2 flex-1 rounded bg-white/30">
                    <div className="h-2 rounded bg-white" style={{ width: "75%" }} />
                  </div>
                </div>
              </div>

              <WorkflowStepper activeStep={3} />
              <p className="mt-4 text-sm text-slate-500">This section measures how your conceptual understanding improved after simulation practice.</p>
              {isLoadingQuestions && <p className="mt-3 text-sm text-slate-500">Refreshing latest post-test questions...</p>}
              <div className="mb-4 mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-sm text-slate-500">Question {activeQuestion} of {activeQuestions.length}</p>
                <p className="text-sm font-medium text-teal-600">{progressPercent}% Complete</p>
              </div>

              <div className="mt-6 max-w-4xl space-y-5">
          {activeQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-xl border-l-4 ${sectionStyles[q.section]?.accent ?? "border-slate-400"} bg-white p-6 shadow-sm transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-md`}
            >
              <p className={`mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${sectionStyles[q.section]?.text ?? "text-slate-600"}`}>
                <span>{sectionStyles[q.section]?.icon ?? "📘"}</span>
                <span>{q.section}</span>
              </p>
              <h2 className="mb-4 text-lg font-medium md:text-xl">Q{idx + 1}. {q.text}</h2>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, optionIdx) => (
                  <label
                    key={opt}
                    className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-200 ease-in-out hover:scale-[1.01] ${
                      answers[idx] === optionIdx ? "border-teal-500 bg-teal-100" : "border-gray-200 hover:border-teal-400 hover:bg-teal-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${q.id}`}
                      value={optionIdx}
                      className="h-4 w-4 scale-110 accent-teal-600"
                      checked={answersByQuestionId[q.id] === optionIdx}
                      onChange={() => {
                        setAnswersByQuestionId((current) => ({
                          ...current,
                          [q.id]: optionIdx,
                        }));
                        setError(null);
                      }}
                    />
                    <span className="text-base font-medium transition-colors group-hover:text-teal-700 md:text-lg">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-lg">
                <p className="text-sm text-slate-500">{answeredCount} questions answered</p>
                <button className="btn btn-primary px-6 py-2 text-base" onClick={submitPostTest} disabled={!allAnswered || isLoadingQuestions}>
                  Continue to Survey &rarr;
                </button>
              </div>
            </section>

            <aside className="section-card">
              <h2 className="text-xl font-semibold">Post-test Notes</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>This stage captures conceptual improvement after simulation practice.</li>
                <li>All responses are required for valid attempt submission.</li>
                <li>After submission, you will enter the survey stage to complete evaluation.</li>
              </ul>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
