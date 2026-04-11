"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { getCurrentStudent } from "@/lib/storage";
import { AttemptRecord } from "@/types/domain";

interface OverviewResponse {
  attempts: AttemptRecord[];
  summary: {
    avgPre: number;
    avgPost: number;
    avgGain: number;
    avgNormalizedGain: number;
    avgEfficiency: number;
  };
  experimentBreakdown?: {
    EMG: { count: number; avgGain: number; avgTime: number; avgPost: number };
    ECG: { count: number; avgGain: number; avgTime: number; avgPost: number };
  };
  timeImprovements?: Array<{ key: string; fromAttempt: number; toAttempt: number; improvementSeconds: number }>;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const student = getCurrentStudent();
    const url = student?.id ? `/api/analytics/student/${student.id}` : "/api/analytics/overview";

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? "Failed to load analytics");
        }
        return res.json();
      })
      .then(setOverview)
      .catch((e) => setError(e.message));
  }, []);

  const trend = useMemo(() => {
    if (!overview) return [];
    return overview.attempts.map((item) => ({
      attempt: `A${item.attempt_number}`,
      pre: item.pre_test_score,
      post: item.post_test_score,
      gain: item.learning_gain,
      time: item.time_taken_seconds,
      type: item.experiment_type,
    }));
  }, [overview]);

  const experimentCompare = useMemo(() => {
    if (!overview?.experimentBreakdown) return [];
    return [
      {
        type: "EMG",
        avgGain: overview.experimentBreakdown.EMG.avgGain,
        avgPost: overview.experimentBreakdown.EMG.avgPost,
      },
      {
        type: "ECG",
        avgGain: overview.experimentBreakdown.ECG.avgGain,
        avgPost: overview.experimentBreakdown.ECG.avgPost,
      },
    ];
  }, [overview]);

  return (
    <main className="page-shell">
      <section className="content-card max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="mt-2 text-slate-600">Pre/post performance, time efficiency, and attempt-wise trends.</p>
          </div>
          <Link href="/experiments" className="btn btn-primary">
            Go To Experiments
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {overview && (
          <>
            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <Metric title="Avg Pre" value={overview.summary.avgPre} />
              <Metric title="Avg Post" value={overview.summary.avgPost} />
              <Metric title="Avg Gain" value={overview.summary.avgGain} />
              <Metric title="Norm Gain" value={overview.summary.avgNormalizedGain} />
              <Metric title="Efficiency" value={overview.summary.avgEfficiency} precision={4} />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="font-semibold">Pre vs Post Scores</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attempt" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="pre" fill="#0284c7" />
                      <Bar dataKey="post" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="font-semibold">Time Reduction Across Attempts</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attempt" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line dataKey="time" stroke="#dc2626" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="font-semibold">EMG vs ECG Performance</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={experimentCompare}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgGain" fill="#7c3aed" />
                      <Bar dataKey="avgPost" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold">Time Improvement Between Attempts</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-2 py-2">Student/Experiment</th>
                      <th className="px-2 py-2">From</th>
                      <th className="px-2 py-2">To</th>
                      <th className="px-2 py-2">Improvement (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.timeImprovements ?? []).map((row) => (
                      <tr key={`${row.key}-${row.fromAttempt}-${row.toAttempt}`} className="border-b border-slate-100">
                        <td className="px-2 py-2">{row.key}</td>
                        <td className="px-2 py-2">{row.fromAttempt}</td>
                        <td className="px-2 py-2">{row.toAttempt}</td>
                        <td className="px-2 py-2">{row.improvementSeconds.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ title, value, precision = 2 }: { title: string; value: number; precision?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{Number(value || 0).toFixed(precision)}</p>
    </div>
  );
}
