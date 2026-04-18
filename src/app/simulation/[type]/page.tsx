"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFlowState, setFlowState } from "@/lib/storage";
import { ExperimentType } from "@/types/domain";
import { Question, getSectionCheckpointQuestions } from "@/lib/questions";

type Section = Question["section"];

interface CheckpointStat {
  questionId: string;
  section: Section;
  totalAttempts: number;
  wrongAttempts: number;
  hintShownCount: number;
  reselectionsAfterHint: number;
  passed: boolean;
  selectedOption: number;
}

const stepToSection: Record<number, Section> = {
  1: "equipment",
  2: "preparation",
  3: "calibration",
  4: "recording",
  5: "analysis",
};

export default function SimulationPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = (params.type || "ECG").toUpperCase() as ExperimentType;

  const frameContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const previousStepRef = useRef<number>(-1);
  const checkpoints = useMemo(() => getSectionCheckpointQuestions(type), [type]);

  const [seconds, setSeconds] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [pendingCheckpointIndex, setPendingCheckpointIndex] = useState<number | null>(null);
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const [checkpointStats, setCheckpointStats] = useState<CheckpointStat[]>(
    checkpoints.map((q) => ({
      questionId: q.id,
      section: q.section,
      totalAttempts: 0,
      wrongAttempts: 0,
      hintShownCount: 0,
      reselectionsAfterHint: 0,
      passed: false,
      selectedOption: -1,
    })),
  );

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) return;

      const payload = event.data as { type?: string; step?: number; experiment?: string };
      if (payload?.type !== "lab-step-change" || typeof payload.step !== "number") return;
      if (payload.experiment && payload.experiment !== type) return;

      if (payload.step === previousStepRef.current) return;
      previousStepRef.current = payload.step;

      setActiveStep(payload.step);

      if (payload.step >= 2) {
        const completedSection = stepToSection[payload.step - 1];
        const idx = checkpoints.findIndex((q) => q.section === completedSection);
        if (idx >= 0 && !checkpointStats[idx]?.passed) {
          setPendingCheckpointIndex(idx);
          setCheckpointMessage(null);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [checkpoints, checkpointStats]);

  function bindIframeInteractions() {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      const increment = () => setClicks((prev) => prev + 1);
      doc.addEventListener("click", increment);
      doc.addEventListener("change", increment);
      doc.addEventListener("keydown", increment);
    } catch {
      // Intentionally ignore unexpected frame access issues.
    }
  }

  async function toggleFullscreen() {
    if (!frameContainerRef.current) return;

    if (!document.fullscreenElement) {
      await frameContainerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  const checkpointScore = checkpointStats.reduce((sum, stat) => sum + (stat.passed ? 1 : 0), 0);
  const canProceed = checkpointStats.every((stat) => stat.passed);
  const analysisIndex = checkpoints.findIndex((q) => q.section === "analysis");
  const nonAnalysisComplete = checkpointStats.every((stat, idx) => idx === analysisIndex || stat.passed);
  const simulationReadyForPostTest = activeStep >= 5 && nonAnalysisComplete && pendingCheckpointIndex === null;
  const simulationFinished = activeStep >= 5 && canProceed && pendingCheckpointIndex === null;

  function updateCheckpointSelection(optionIdx: number) {
    if (pendingCheckpointIndex === null) return;

    setCheckpointStats((prev) => {
      const next = [...prev];
      const current = { ...next[pendingCheckpointIndex] };
      if (current.hintShownCount > 0 && current.selectedOption >= 0 && current.selectedOption !== optionIdx) {
        current.reselectionsAfterHint += 1;
      }
      current.selectedOption = optionIdx;
      next[pendingCheckpointIndex] = current;
      return next;
    });
  }

  function submitCheckpointAnswer() {
    if (pendingCheckpointIndex === null) return;

    const checkpoint = checkpoints[pendingCheckpointIndex];
    const stat = checkpointStats[pendingCheckpointIndex];

    if (stat.selectedOption < 0) {
      setCheckpointMessage("Please select an option before submitting.");
      return;
    }

    const isCorrect = stat.selectedOption === checkpoint.answerIndex;

    setCheckpointStats((prev) => {
      const next = [...prev];
      const current = { ...next[pendingCheckpointIndex] };
      current.totalAttempts += 1;

      if (isCorrect) {
        current.passed = true;
      } else {
        current.wrongAttempts += 1;
        current.hintShownCount += 1;
      }

      next[pendingCheckpointIndex] = current;
      return next;
    });

    if (isCorrect) {
      setCheckpointMessage(null);
      setPendingCheckpointIndex(null);
    } else {
      setCheckpointMessage(checkpoint.hint ?? "Review this section's objective and key instrument settings, then try again.");
    }
  }

  function completeSimulation() {
    if (!simulationReadyForPostTest) {
      if (pendingCheckpointIndex !== null) {
        setCheckpointMessage("Finish this section checkpoint first before continuing to the post-test.");
      } else if (activeStep < 5) {
        setCheckpointMessage("Complete all simulation sections before opening the post-test.");
      } else {
        const firstPending = checkpointStats.findIndex((stat, idx) => idx !== analysisIndex && !stat.passed);
        if (firstPending >= 0) {
          setPendingCheckpointIndex(firstPending);
          setCheckpointMessage("Complete all section checkpoints correctly before proceeding to post-test.");
        }
      }
      return;
    }

    if (analysisIndex >= 0 && !checkpointStats[analysisIndex]?.passed) {
      setPendingCheckpointIndex(analysisIndex);
      setCheckpointMessage("Complete the analysis checkpoint correctly before proceeding to the post-test.");
      return;
    }

    if (!canProceed) {
      const firstPending = checkpointStats.findIndex((stat) => !stat.passed);
      if (firstPending >= 0) {
        setPendingCheckpointIndex(firstPending);
        setCheckpointMessage("Complete all section checkpoints correctly before proceeding to post-test.");
      }
      return;
    }

    const flow = getFlowState();
    const activeTimeRatio = Math.min(1, seconds / 600);
    const interactionDensity = Math.min(1, clicks / 80);
    const completionRatio = 1;
    const focusRatio = 0.85;
    const engagementScore = Number(
      ((0.35 * activeTimeRatio + 0.25 * interactionDensity + 0.2 * completionRatio + 0.2 * focusRatio) * 100).toFixed(2),
    );

    setFlowState({
      experimentType: type,
      preTestScore: flow?.preTestScore,
      simulationStartedAt: flow?.simulationStartedAt,
      simulationEndedAt: Date.now(),
      engagementScore,
      interactionCount: clicks,
      checkpointTelemetry: checkpointStats.map((stat) => ({
        questionId: stat.questionId,
        section: stat.section,
        totalAttempts: stat.totalAttempts,
        wrongAttempts: stat.wrongAttempts,
        hintShownCount: stat.hintShownCount,
        reselectionsAfterHint: stat.reselectionsAfterHint,
        passed: stat.passed,
      })),
    });

    router.push(`/post-test/${type}`);
  }

  const pendingCheckpoint = pendingCheckpointIndex !== null ? checkpoints[pendingCheckpointIndex] : null;
  const pendingStat = pendingCheckpointIndex !== null ? checkpointStats[pendingCheckpointIndex] : null;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-950" onClick={() => setClicks((prev) => prev + 1)}>
      <div ref={frameContainerRef} className="absolute inset-0">
        <iframe
          ref={iframeRef}
          src={`/labs/${type}/index.html`}
          title={`${type} Virtual Lab`}
          className="h-full w-full border-0"
          loading="lazy"
          onLoad={bindIframeInteractions}
        />
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex gap-2">
        <button className="pointer-events-auto btn btn-secondary" type="button" onClick={toggleFullscreen}>
          {fullscreen ? "Exit Full Screen" : "Full Screen"}
        </button>
        <button
          className="pointer-events-auto btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          onClick={completeSimulation}
          disabled={!simulationReadyForPostTest}
          title={simulationReadyForPostTest ? "Proceed to Post-test" : "Complete required simulation sections first"}
        >
          {simulationFinished ? "Proceed to Post-test" : simulationReadyForPostTest ? "Validate Analysis Checkpoint" : "Post-test Locked"}
        </button>
      </div>

      {pendingCheckpoint && pendingStat && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Section Completed: {pendingCheckpoint.section}</p>
            <h2 className="mt-1 text-lg font-semibold">Section Checkpoint</h2>
            <p className="mt-3 text-sm">{pendingCheckpoint.text}</p>

            <div className="mt-4 space-y-2">
              {pendingCheckpoint.options.map((opt, optionIdx) => (
                <label key={opt} className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name={pendingCheckpoint.id}
                    value={optionIdx}
                    checked={pendingStat.selectedOption === optionIdx}
                    onChange={() => updateCheckpointSelection(optionIdx)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            {checkpointMessage && <p className="mt-3 text-sm text-amber-300">Hint: {checkpointMessage}</p>}

            <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
              <span>Total attempts: {pendingStat.totalAttempts}</span>
              <span>Wrong attempts: {pendingStat.wrongAttempts}</span>
              <span>Hint-based reselections: {pendingStat.reselectionsAfterHint}</span>
            </div>

            <div className="mt-4 flex justify-end">
              <button className="btn btn-primary" type="button" onClick={submitCheckpointAnswer}>
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only">
        Step {activeStep}, elapsed {seconds}, interactions {clicks}, checkpoint score {checkpointScore}/{checkpoints.length}
      </div>
    </main>
  );
}
