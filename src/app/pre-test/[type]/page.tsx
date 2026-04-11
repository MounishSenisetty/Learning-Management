"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuestions, scoreAnswers } from "@/lib/questions";
import { ExperimentType } from "@/types/domain";
import { setFlowState } from "@/lib/storage";

export default function PreTestPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = (params.type || "ECG").toUpperCase() as ExperimentType;
  const questions = useMemo(() => getQuestions(type), [type]);
  const [answers, setAnswers] = useState<number[]>(Array.from({ length: questions.length }, () => -1));

  function submitTest() {
    const preTestScore = scoreAnswers(questions, answers);
    setFlowState({
      experimentType: type,
      preTestScore,
      simulationStartedAt: Date.now(),
    });
    router.push(`/simulation/${type}`);
  }

  return (
    <main className="page-shell">
      <section className="content-card">
        <h1 className="text-2xl font-bold">{type} Pre-test</h1>
        <p className="mt-2 text-slate-600">Answer all questions before entering the simulation.</p>

        <div className="mt-6 space-y-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{q.section}</p>
              <p className="mt-1 font-medium">Q{idx + 1}. {q.text}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, optionIdx) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`${q.id}`}
                      value={optionIdx}
                      checked={answers[idx] === optionIdx}
                      onChange={() => {
                        const next = [...answers];
                        next[idx] = optionIdx;
                        setAnswers(next);
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary mt-6" onClick={submitTest}>
          Start Simulation
        </button>
      </section>
    </main>
  );
}
