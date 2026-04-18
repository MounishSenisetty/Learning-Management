"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { getCurrentStaff, getCurrentStudent, getStaffDashboardPath } from "@/lib/storage";
import { AttemptRecord } from "@/types/domain";
import { AppHeader } from "@/components/app-header";
import { SideRail } from "@/components/side-rail";

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
    EMG: { count: number; avgPre: number; avgGain: number; avgTime: number; avgPost: number };
    ECG: { count: number; avgPre: number; avgGain: number; avgTime: number; avgPost: number };
  };
  timeImprovements?: Array<{
    key: string;
    experimentType?: string;
    fromAttempt: number;
    toAttempt: number;
    fromAttemptLabel?: string;
    toAttemptLabel?: string;
    improvementSeconds: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const staff = getCurrentStaff();
    if (staff?.role) {
      router.replace(getStaffDashboardPath(staff.role));
      return;
    }

    const student = getCurrentStudent();
    if (!student?.id) {
      router.replace("/login");
      return;
    }

    const url = `/api/analytics/student/${student.id}`;

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
  }, [router]);

  const trend = useMemo(() => {
    if (!overview) return [];
    const sorted = [...overview.attempts].sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return left - right;
    });

    return sorted.map((item) => ({
      attempt: `${item.experiment_type}-A${item.attempt_number}`,
      pre: item.pre_test_score,
      post: item.post_test_score,
      gain: item.learning_gain,
      time: item.time_taken_seconds,
      type: item.experiment_type,
    }));
  }, [overview]);

  const emgTimeTrend = useMemo(() => {
    if (!overview) return [];
    return overview.attempts
      .filter((item) => item.experiment_type === "EMG")
      .sort((a, b) => a.attempt_number - b.attempt_number)
      .map((item) => ({
        attempt: `A${item.attempt_number}`,
        time: item.time_taken_seconds,
      }));
  }, [overview]);

  const ecgTimeTrend = useMemo(() => {
    if (!overview) return [];
    return overview.attempts
      .filter((item) => item.experiment_type === "ECG")
      .sort((a, b) => a.attempt_number - b.attempt_number)
      .map((item) => ({
        attempt: `A${item.attempt_number}`,
        time: item.time_taken_seconds,
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
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container workspace-grid">
          <SideRail />
          <div className="workspace-main">
            <section className="section-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
                  <p className="mt-2 text-slate-600">A student-specific analytics view for performance, efficiency, and attempt-wise progression.</p>
                </div>
                <Link href="/experiments" className="btn btn-primary">
                  Go To Experiments
                </Link>
              </div>
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </section>

            {overview && (
              <>
                <section className="section-card">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric title="Attempts" value={overview.attempts.length} precision={0} />
              <Metric title="Avg Pre" value={overview.summary.avgPre} />
              <Metric title="Avg Post" value={overview.summary.avgPost} />
              <Metric title="Avg Gain" value={overview.summary.avgGain} />
              <Metric title="Norm Gain" value={overview.summary.avgNormalizedGain} />
              <Metric title="Efficiency" value={overview.summary.avgEfficiency} precision={4} />
                  </div>
                </section>

                {overview.experimentBreakdown && (
                  <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="section-card">
                      <h2 className="text-xl font-semibold">EMG Details</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Metric title="Attempts" value={overview.experimentBreakdown.EMG.count} precision={0} />
                    <Metric title="Avg Pre" value={overview.experimentBreakdown.EMG.avgPre} />
                    <Metric title="Avg Post" value={overview.experimentBreakdown.EMG.avgPost} />
                    <Metric title="Avg Gain" value={overview.experimentBreakdown.EMG.avgGain} />
                    <Metric title="Avg Time (s)" value={overview.experimentBreakdown.EMG.avgTime} />
                      </div>
                    </div>

                    <div className="section-card">
                      <h2 className="text-xl font-semibold">ECG Details</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Metric title="Attempts" value={overview.experimentBreakdown.ECG.count} precision={0} />
                    <Metric title="Avg Pre" value={overview.experimentBreakdown.ECG.avgPre} />
                    <Metric title="Avg Post" value={overview.experimentBreakdown.ECG.avgPost} />
                    <Metric title="Avg Gain" value={overview.experimentBreakdown.ECG.avgGain} />
                    <Metric title="Avg Time (s)" value={overview.experimentBreakdown.ECG.avgTime} />
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="section-card">
                    <h2 className="text-xl font-semibold">Pre vs Post Scores</h2>
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

                  <div className="section-card">
                    <h2 className="text-xl font-semibold">Time Reduction Across Attempts</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700">EMG Attempts</p>
                        <div className="mt-2 h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={emgTimeTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="attempt" />
                              <YAxis />
                              <Tooltip formatter={(value) => [value, "Time (s)"]} />
                              <Legend />
                              <Line dataKey="time" name="EMG Time" stroke="#dc2626" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700">ECG Attempts</p>
                        <div className="mt-2 h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ecgTimeTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="attempt" />
                              <YAxis />
                              <Tooltip formatter={(value) => [value, "Time (s)"]} />
                              <Legend />
                              <Line dataKey="time" name="ECG Time" stroke="#ea580c" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="section-card">
                    <h2 className="text-xl font-semibold">EMG vs ECG Performance</h2>
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

                  <div className="section-card">
                    <h2 className="text-xl font-semibold">Dashboard Guide</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                      <div className="side-card">
                        <p className="font-medium text-slate-800">KPI Summary</p>
                        <p className="mt-1 text-sm text-slate-600">Top cards provide aggregate student metrics for the selected attempts.</p>
                      </div>
                      <div className="side-card">
                        <p className="font-medium text-slate-800">Experiment Breakdown</p>
                        <p className="mt-1 text-sm text-slate-600">EMG and ECG are separated to avoid misleading combined averages.</p>
                      </div>
                      <div className="side-card">
                        <p className="font-medium text-slate-800">Attempt Tracking</p>
                        <p className="mt-1 text-sm text-slate-600">Use line charts and improvement rows to observe time trend changes.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="section-card">
                  <h2 className="text-xl font-semibold">Time Improvement Between Attempts</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-2 py-2">Experiment</th>
                          <th className="px-2 py-2">From</th>
                          <th className="px-2 py-2">To</th>
                          <th className="px-2 py-2">Improvement (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview.timeImprovements ?? []).map((row) => (
                          <tr key={`${row.key}-${row.fromAttempt}-${row.toAttempt}`} className="border-b border-slate-100">
                            <td className="px-2 py-2">{row.experimentType ?? row.key.split("-").slice(-1)[0] ?? row.key}</td>
                            <td className="px-2 py-2">{row.fromAttemptLabel ?? row.fromAttempt}</td>
                            <td className="px-2 py-2">{row.toAttemptLabel ?? row.toAttempt}</td>
                            <td className="px-2 py-2">{row.improvementSeconds.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({ title, value, precision = 2 }: { title: string; value: number; precision?: number }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold">{Number(value || 0).toFixed(precision)}</p>
    </div>
  );
}
