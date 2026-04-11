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
      avgGain: average(emg.map((a) => Number(a.learning_gain ?? 0))),
      avgTime: average(emg.map((a) => Number(a.time_taken_seconds ?? 0))),
      avgPost: average(emg.map((a) => Number(a.post_test_score ?? 0))),
    },
    ECG: {
      count: ecg.length,
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

  const improvements: Array<{ key: string; fromAttempt: number; toAttempt: number; improvementSeconds: number }> = [];

  for (const [key, list] of grouped) {
    const sorted = [...list].sort((a, b) => Number(a.attempt_number) - Number(b.attempt_number));
    for (let idx = 1; idx < sorted.length; idx++) {
      const prev = Number(sorted[idx - 1].time_taken_seconds ?? 0);
      const curr = Number(sorted[idx].time_taken_seconds ?? 0);
      improvements.push({
        key,
        fromAttempt: Number(sorted[idx - 1].attempt_number),
        toAttempt: Number(sorted[idx].attempt_number),
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
