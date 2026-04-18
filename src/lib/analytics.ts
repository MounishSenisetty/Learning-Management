import { AttemptRecord } from "@/types/domain";

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = average(values);
  const sq = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
  return sq / (values.length - 1);
}

export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function computeSummary(attempts: AttemptRecord[] | Array<Record<string, unknown>>) {
  const rows = attempts as Array<Record<string, unknown>>;
  const pre = rows.map((a) => Number(a.pre_test_score ?? 0));
  const post = rows.map((a) => Number(a.post_test_score ?? 0));
  const gain = rows.map((a) => Number(a.learning_gain ?? 0));
  const norm = rows.map((a) => Number(a.normalized_gain ?? 0));
  const eff = rows.map((a) => Number(a.efficiency ?? 0));

  return {
    avgPre: average(pre),
    avgPost: average(post),
    avgGain: average(gain),
    avgNormalizedGain: average(norm),
    avgEfficiency: average(eff),
  };
}

export function computeExperimentBreakdown(attempts: Array<Record<string, unknown>>) {
  const emg = attempts.filter((a) => a.experiment_type === "EMG");
  const ecg = attempts.filter((a) => a.experiment_type === "ECG");

  return {
    EMG: {
      count: emg.length,
      avgPre: average(emg.map((a) => Number(a.pre_test_score ?? 0))),
      avgGain: average(emg.map((a) => Number(a.learning_gain ?? 0))),
      avgTime: average(emg.map((a) => Number(a.time_taken_seconds ?? 0))),
      avgPost: average(emg.map((a) => Number(a.post_test_score ?? 0))),
    },
    ECG: {
      count: ecg.length,
      avgPre: average(ecg.map((a) => Number(a.pre_test_score ?? 0))),
      avgGain: average(ecg.map((a) => Number(a.learning_gain ?? 0))),
      avgTime: average(ecg.map((a) => Number(a.time_taken_seconds ?? 0))),
      avgPost: average(ecg.map((a) => Number(a.post_test_score ?? 0))),
    },
  };
}

export function computeTimeImprovements(attempts: Array<Record<string, unknown>>) {
  const grouped = new Map<string, Array<Record<string, unknown>>>();

  for (const row of attempts) {
    const key = `${String(row.student_id)}-${String(row.experiment_type)}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  const improvements: Array<{
    key: string;
    experimentType: string;
    fromAttempt: number;
    toAttempt: number;
    fromAttemptLabel: string;
    toAttemptLabel: string;
    improvementSeconds: number;
  }> = [];

  for (const [key, list] of grouped) {
    const sorted = [...list].sort((a, b) => {
      const left = new Date(String(a.created_at ?? "")).getTime();
      const right = new Date(String(b.created_at ?? "")).getTime();
      return left - right;
    });
    for (let idx = 1; idx < sorted.length; idx++) {
      const prev = Number(sorted[idx - 1].time_taken_seconds ?? 0);
      const curr = Number(sorted[idx].time_taken_seconds ?? 0);
      const experimentType = String(sorted[idx].experiment_type ?? "Unknown");
      const fromAttempt = Number(sorted[idx - 1].attempt_number ?? 0);
      const toAttempt = Number(sorted[idx].attempt_number ?? 0);
      improvements.push({
        key,
        experimentType,
        fromAttempt,
        toAttempt,
        fromAttemptLabel: `${experimentType}-A${fromAttempt} (Run ${idx})`,
        toAttemptLabel: `${experimentType}-A${toAttempt} (Run ${idx + 1})`,
        improvementSeconds: prev - curr,
      });
    }
  }

  return improvements;
}

export function pairedTTest(preScores: number[], postScores: number[]) {
  const n = Math.min(preScores.length, postScores.length);
  if (n < 2) {
    return { n, tStatistic: 0, meanDifference: 0, sdDifference: 0 };
  }

  const diffs = Array.from({ length: n }, (_, i) => postScores[i] - preScores[i]);
  const meanDifference = average(diffs);
  const sdDifference = standardDeviation(diffs);
  const tStatistic = sdDifference === 0 ? 0 : meanDifference / (sdDifference / Math.sqrt(n));

  return { n, tStatistic, meanDifference, sdDifference };
}

export function independentTTest(groupA: number[], groupB: number[]) {
  const n1 = groupA.length;
  const n2 = groupB.length;
  if (n1 < 2 || n2 < 2) {
    return { n1, n2, tStatistic: 0, meanA: average(groupA), meanB: average(groupB) };
  }

  const meanA = average(groupA);
  const meanB = average(groupB);
  const varA = variance(groupA);
  const varB = variance(groupB);
  const pooled = ((n1 - 1) * varA + (n2 - 1) * varB) / (n1 + n2 - 2);
  const denominator = Math.sqrt(pooled * (1 / n1 + 1 / n2));
  const tStatistic = denominator === 0 ? 0 : (meanA - meanB) / denominator;

  return { n1, n2, tStatistic, meanA, meanB };
}

interface EventRow {
  attempt_id: string;
  event_type: string;
  event_value: Record<string, unknown> | null;
}

export function summarizeWorkflowEvents(events: EventRow[]) {
  const simulationEvents = events.filter((event) => event.event_type === "simulation_summary");
  const sectionEvents = events.filter((event) => event.event_type === "section_duration");

  const workflowDurations = simulationEvents.map((event) => Number(event.event_value?.workflowDurationSeconds ?? 0));
  const preDurations = simulationEvents.map((event) => Number(event.event_value?.preTestDurationSeconds ?? 0));
  const simulationDurations = simulationEvents.map((event) => Number(event.event_value?.timeTakenSeconds ?? 0));
  const postDurations = simulationEvents.map((event) => Number(event.event_value?.postTestDurationSeconds ?? 0));
  const engagement = simulationEvents.map((event) => Number(event.event_value?.engagementScore ?? 0));

  const integrity = simulationEvents.reduce(
    (acc, event) => {
      const indicators = (event.event_value?.integrityIndicators ?? {}) as Record<string, unknown>;
      acc.tabSwitchCount += Number(indicators.tabSwitchCount ?? 0);
      acc.inactivityCount += Number(indicators.inactivityCount ?? 0);
      acc.inactivitySeconds += Number(indicators.inactivitySeconds ?? 0);
      acc.abnormalPatternScore += Number(indicators.abnormalPatternScore ?? 0);
      acc.simulationSkipped += event.event_value?.simulationSkipped ? 1 : 0;
      return acc;
    },
    {
      tabSwitchCount: 0,
      inactivityCount: 0,
      inactivitySeconds: 0,
      abnormalPatternScore: 0,
      simulationSkipped: 0,
    },
  );

  const sectionAccumulator = new Map<string, number[]>();
  for (const event of sectionEvents) {
    const section = String(event.event_value?.section ?? "unknown");
    const duration = Number(event.event_value?.durationSeconds ?? 0);
    const values = sectionAccumulator.get(section) ?? [];
    values.push(duration);
    sectionAccumulator.set(section, values);
  }

  const sectionTime = Array.from(sectionAccumulator.entries()).map(([section, durations]) => ({
    section,
    avgDurationSeconds: average(durations),
  }));

  const simulationCount = Math.max(1, simulationEvents.length);
  return {
    avgWorkflowDurationSeconds: average(workflowDurations),
    avgPreTestDurationSeconds: average(preDurations),
    avgSimulationDurationSeconds: average(simulationDurations),
    avgPostTestDurationSeconds: average(postDurations),
    avgEngagementScore: average(engagement),
    sectionTime,
    integrity: {
      totalTabSwitches: integrity.tabSwitchCount,
      totalInactivityCount: integrity.inactivityCount,
      totalInactivitySeconds: integrity.inactivitySeconds,
      avgAbnormalPatternScore: integrity.abnormalPatternScore / simulationCount,
      simulationSkippedCount: integrity.simulationSkipped,
    },
  };
}

export function computeCohortInsights(attempts: Array<Record<string, unknown>>) {
  const grouped = new Map<string, Array<Record<string, unknown>>>();

  for (const attempt of attempts) {
    const cohort = String(attempt.cohort ?? "Unassigned");
    const rows = grouped.get(cohort) ?? [];
    rows.push(attempt);
    grouped.set(cohort, rows);
  }

  return Array.from(grouped.entries())
    .map(([cohort, rows]) => ({
      cohort,
      attempts: rows.length,
      uniqueStudents: new Set(rows.map((row) => String(row.student_id))).size,
      avgPostScore: average(rows.map((row) => Number(row.post_test_score ?? 0))),
      avgGain: average(rows.map((row) => Number(row.learning_gain ?? 0))),
      avgTimeTakenSeconds: average(rows.map((row) => Number(row.time_taken_seconds ?? 0))),
    }))
    .sort((a, b) => b.avgPostScore - a.avgPostScore);
}
