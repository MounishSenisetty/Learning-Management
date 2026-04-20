"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentStaff } from "@/lib/storage";
import { AssessmentModule, getDefaultQuestions, Question } from "@/lib/questions";
import { ExperimentType } from "@/types/domain";

const sectionOptions: Array<Question["section"]> = ["equipment", "preparation", "calibration", "recording", "analysis"];

interface QuestionsResponse {
  questions?: Question[];
  error?: string;
}

function createEmptyQuestion(type: ExperimentType, module: AssessmentModule): Question {
  const prefix = module === "pre-test" ? "pre" : "post";
  return {
    id: `${type.toLowerCase()}-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    section: "analysis",
    text: "",
    options: ["", ""],
    answerIndex: 0,
  };
}

export default function AdminQuestionEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") || "ECG").toUpperCase() as ExperimentType;
  const initialModule = (searchParams.get("module") || "pre-test") as AssessmentModule;

  const [experimentType, setExperimentType] = useState<ExperimentType>(initialType === "EMG" ? "EMG" : "ECG");
  const [module, setModule] = useState<AssessmentModule>(initialModule === "post-test" ? "post-test" : "pre-test");
  const [questions, setQuestions] = useState<Question[]>(getDefaultQuestions(experimentType, module));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const staff = getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      router.replace("/admin-login");
    }
  }, [router]);

  const pageTitle = useMemo(() => {
    return `${experimentType} ${module === "pre-test" ? "Pre-test" : "Post-test"} Questions`;
  }, [experimentType, module]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const params = new URLSearchParams({ experimentType, module });
      const response = await fetch(`/api/questions?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as QuestionsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load questions");
      }

      const nextQuestions = payload.questions ?? getDefaultQuestions(experimentType, module);
      setQuestions(nextQuestions.length > 0 ? nextQuestions : getDefaultQuestions(experimentType, module));
    } catch (requestError) {
      setQuestions(getDefaultQuestions(experimentType, module));
      setError(requestError instanceof Error ? requestError.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [experimentType, module]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function updateQuestion(index: number, update: Partial<Question>) {
    setQuestions((current) => current.map((question, idx) => (idx === index ? { ...question, ...update } : question)));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, idx) => {
        if (idx !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, optionIdx) => (optionIdx === optionIndex ? value : option)),
        };
      }),
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((current) =>
      current.map((question, idx) => {
        if (idx !== questionIndex) return question;
        if (question.options.length >= 8) return question;
        return {
          ...question,
          options: [...question.options, ""],
        };
      }),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, idx) => {
        if (idx !== questionIndex) return question;
        if (question.options.length <= 2) return question;

        const nextOptions = question.options.filter((_, idxOption) => idxOption !== optionIndex);
        const nextAnswerIndex =
          question.answerIndex === optionIndex
            ? 0
            : question.answerIndex > optionIndex
              ? question.answerIndex - 1
              : question.answerIndex;

        return {
          ...question,
          options: nextOptions,
          answerIndex: nextAnswerIndex,
        };
      }),
    );
  }

  function addQuestion() {
    setQuestions((current) => [...current, createEmptyQuestion(experimentType, module)]);
  }

  function removeQuestion(questionIndex: number) {
    setQuestions((current) => current.filter((_, idx) => idx !== questionIndex));
  }

  async function saveQuestions() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const hasEmptyQuestion = questions.some((question) => question.text.trim().length === 0);
    const hasEmptyOption = questions.some((question) => question.options.some((option) => option.trim().length === 0));

    if (!questions.length) {
      setSaving(false);
      setError("At least one question is required.");
      return;
    }

    if (hasEmptyQuestion || hasEmptyOption) {
      setSaving(false);
      setError("Please fill all question statements and options before saving.");
      return;
    }

    try {
      const response = await fetch("/api/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experimentType,
          module,
          questions,
        }),
      });

      const payload = (await response.json()) as QuestionsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save questions");
      }

      setMessage("Questions updated successfully. Pre-test/Post-test pages now use this latest version.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save questions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container space-y-6">
          <section className="section-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-indigo-700">Admin Workspace</p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900">Question Bank Editor</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Update shared pre-test and post-test questions. Changes are applied app-wide for all students.
                </p>
              </div>
              <Link href="/admin-dashboard" className="btn btn-secondary">
                Back to Admin Dashboard
              </Link>
            </div>
          </section>

          <section className="section-card">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Experiment Type</span>
                <select className="input" value={experimentType} onChange={(event) => setExperimentType(event.target.value as ExperimentType)}>
                  <option value="ECG">ECG</option>
                  <option value="EMG">EMG</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Module</span>
                <select className="input" value={module} onChange={(event) => setModule(event.target.value as AssessmentModule)}>
                  <option value="pre-test">Pre-test</option>
                  <option value="post-test">Post-test</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-600">Editing: {pageTitle}</p>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          <section className="section-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Questions</h2>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={addQuestion} disabled={loading || saving}>
                  Add Question
                </button>
                <button type="button" className="btn btn-primary" onClick={saveQuestions} disabled={loading || saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Loading latest question bank...</p>
            ) : (
              <div className="space-y-4">
                {questions.map((question, questionIndex) => (
                  <article key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="space-y-2 text-sm md:col-span-2">
                        <span className="font-medium text-slate-700">Question Text</span>
                        <input
                          className="input"
                          value={question.text}
                          onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                          placeholder={`Question ${questionIndex + 1}`}
                        />
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">Section</span>
                        <select
                          className="input"
                          value={question.section}
                          onChange={(event) => updateQuestion(questionIndex, { section: event.target.value as Question["section"] })}
                        >
                          {sectionOptions.map((section) => (
                            <option key={section} value={section}>
                              {section}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-slate-700">Options</p>
                      {question.options.map((option, optionIndex) => (
                        <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.answerIndex === optionIndex}
                            onChange={() => updateQuestion(questionIndex, { answerIndex: optionIndex })}
                          />
                          <input
                            className="input flex-1"
                            value={option}
                            onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            disabled={question.options.length <= 2}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => addOption(questionIndex)} disabled={question.options.length >= 8}>
                        Add Option
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => removeQuestion(questionIndex)} disabled={questions.length <= 1}>
                        Delete Question
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}
