"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildStudentPerformanceSummaries } from "@/lib/staff-analytics";
import { AttemptRecord, Student } from "@/types/domain";

type ThemeName = "teacher" | "admin";

interface StudentAnalyticsExplorerProps {
  students: Student[];
  attempts: AttemptRecord[];
  theme: ThemeName;
}

const themeConfig: Record<
  ThemeName,
  {
    panelLabel: string;
    accentText: string;
    accentBorder: string;
    accentBg: string;
    selectedBorder: string;
    selectedBg: string;
    preColor: string;
    postColor: string;
    gainColor: string;
    timeColor: string;
    lineColor: string;
  }
> = {
  teacher: {
    panelLabel: "Teacher drill-down",
    accentText: "text-teal-700",
    accentBorder: "border-teal-200",
    accentBg: "bg-teal-50",
    selectedBorder: "border-teal-300",
    selectedBg: "bg-teal-50/70",
    preColor: "#0284c7",
    postColor: "#16a34a",
    gainColor: "#0f766e",
    timeColor: "#dc2626",
    lineColor: "#0f766e",
  },
  admin: {
    panelLabel: "Admin drill-down",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
    accentBg: "bg-indigo-50",
    selectedBorder: "border-indigo-300",
    selectedBg: "bg-indigo-50/70",
    preColor: "#2563eb",
    postColor: "#7c3aed",
    gainColor: "#0ea5e9",
    timeColor: "#dc2626",
    lineColor: "#4338ca",
  },
};

export function StudentAnalyticsExplorer({ students, attempts, theme }: StudentAnalyticsExplorerProps) {
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const themeStyles = themeConfig[theme];
  const performanceData = useMemo(() => buildStudentPerformanceSummaries(students, attempts), [students, attempts]);
  const performanceByStudentId = useMemo(
    () => new Map(performanceData.summaries.map((summary) => [summary.studentId, summary])),
    [performanceData.summaries],
  );
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const roster = [...students].sort((left, right) => {
      const leftAttempts = performanceByStudentId.get(left.id)?.totalAttempts ?? 0;
      const rightAttempts = performanceByStudentId.get(right.id)?.totalAttempts ?? 0;
      if (rightAttempts !== leftAttempts) return rightAttempts - leftAttempts;
      return left.full_name.localeCompare(right.full_name);
    });

    if (!normalized) return roster;

    return roster.filter((student) => {
      const summary = performanceByStudentId.get(student.id);
      return [
        student.full_name,
        student.roll_number,
        student.student_code,
        student.email,
        student.program,
        student.institution,
        student.cohort,
        summary?.lastAttemptLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [performanceByStudentId, query, students]);

  const activeStudentId = selectedStudentId || students[0]?.id || "";
  const selectedStudent = activeStudentId ? studentById.get(activeStudentId) ?? null : null;
  const selectedSummary = activeStudentId ? performanceByStudentId.get(activeStudentId) ?? null : null;

  const selectedAttempts = useMemo(() => {
    if (!activeStudentId) return [];

    return attempts
      .filter((attempt) => attempt.student_id === activeStudentId)
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  }, [activeStudentId, attempts]);

  const selectedChartData = useMemo(() => {
    return selectedAttempts.map((attempt) => ({
      label: `${attempt.experiment_type}-A${attempt.attempt_number}`,
      pre: attempt.pre_test_score,
      post: attempt.post_test_score,
      gain: attempt.learning_gain,
      time: attempt.time_taken_seconds,
      efficiency: attempt.efficiency ?? 0,
      normalizedGain: attempt.normalized_gain ?? 0,
      retention: attempt.retention_score ?? 0,
    }));
  }, [selectedAttempts]);

  const emgTrendData = useMemo(() => {
    return selectedAttempts
      .filter((attempt) => attempt.experiment_type === "EMG")
      .sort((left, right) => left.attempt_number - right.attempt_number)
      .map((attempt) => ({
        label: `A${attempt.attempt_number}`,
        time: attempt.time_taken_seconds,
        gain: attempt.learning_gain,
      }));
  }, [selectedAttempts]);

  const ecgTrendData = useMemo(() => {
    return selectedAttempts
      .filter((attempt) => attempt.experiment_type === "ECG")
      .sort((left, right) => left.attempt_number - right.attempt_number)
      .map((attempt) => ({
        label: `A${attempt.attempt_number}`,
        time: attempt.time_taken_seconds,
        gain: attempt.learning_gain,
      }));
  }, [selectedAttempts]);

  const experimentBreakdown = useMemo(() => {
    const emgAttempts = selectedAttempts.filter((attempt) => attempt.experiment_type === "EMG");
    const ecgAttempts = selectedAttempts.filter((attempt) => attempt.experiment_type === "ECG");

    return [
      {
        type: "EMG",
        count: emgAttempts.length,
        gain: average(emgAttempts.map((attempt) => attempt.learning_gain)),
        time: average(emgAttempts.map((attempt) => attempt.time_taken_seconds)),
      },
      {
        type: "ECG",
        count: ecgAttempts.length,
        gain: average(ecgAttempts.map((attempt) => attempt.learning_gain)),
        time: average(ecgAttempts.map((attempt) => attempt.time_taken_seconds)),
      },
    ];
  }, [selectedAttempts]);

  const completionRate = selectedAttempts.length
    ? Math.round((selectedAttempts.filter((attempt) => attempt.post_test_score >= attempt.pre_test_score).length / selectedAttempts.length) * 100)
    : 0;
  const bestPostScore = selectedAttempts.length ? Math.max(...selectedAttempts.map((attempt) => attempt.post_test_score)) : 0;
  const bestGain = selectedAttempts.length ? Math.max(...selectedAttempts.map((attempt) => attempt.learning_gain)) : 0;
  const firstPreScore = selectedAttempts[0]?.pre_test_score ?? 0;
  const latestPostScore = selectedAttempts[selectedAttempts.length - 1]?.post_test_score ?? 0;

  return (
    <section className="section-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.18em] ${themeStyles.accentText}`}>{themeStyles.panelLabel}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Select a student and inspect every attempt</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Use the roster to switch students, then review attempt counts, score movement, timing, and the full attempt history in one place.
          </p>
        </div>
        <div className={`rounded-xl border ${themeStyles.accentBorder} ${themeStyles.accentBg} px-4 py-3 text-sm text-slate-700`}>
          <p className="font-semibold text-slate-900">{students.length} students</p>
          <p>{performanceData.activeStudents} active learners</p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students by name, roll, email, cohort..."
            />
            <select className="select" value={activeStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {students.length === 0 ? <option value="">No students available</option> : null}
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} - {student.roll_number}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {filteredStudents.map((student) => {
              const summary = performanceByStudentId.get(student.id);
              const isSelected = student.id === activeStudentId;

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected ? `${themeStyles.selectedBorder} ${themeStyles.selectedBg} shadow-sm` : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{student.full_name}</p>
                      <p className="text-sm text-slate-600">
                        {student.roll_number} {student.student_code ? `• ${student.student_code}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? `${themeStyles.accentBg} ${themeStyles.accentText}` : "bg-slate-100 text-slate-600"}`}>
                      {summary?.totalAttempts ?? 0} attempts
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                    <InfoPill label="Avg gain" value={summary ? summary.avgGain.toFixed(2) : "0.00"} />
                    <InfoPill label="Avg time" value={summary ? summary.avgTime.toFixed(2) : "0.00"} />
                    <InfoPill label="EMG" value={summary?.emgAttempts ?? 0} />
                    <InfoPill label="ECG" value={summary?.ecgAttempts ?? 0} />
                  </div>
                </button>
              );
            })}

            {!filteredStudents.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No students match the current search.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedStudent && selectedSummary ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Selected student</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-900">{selectedStudent.full_name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedStudent.roll_number}
                    {selectedStudent.student_code ? ` • ${selectedStudent.student_code}` : ""}
                    {selectedStudent.program ? ` • ${selectedStudent.program}` : ""}
                    {selectedStudent.cohort ? ` • Cohort ${selectedStudent.cohort}` : ""}
                  </p>
                </div>
                <div className={`rounded-2xl border ${themeStyles.accentBorder} ${themeStyles.accentBg} px-4 py-3 text-sm text-slate-700`}>
                  <p className="font-semibold text-slate-900">{selectedSummary.totalAttempts} total attempts</p>
                  <p>{selectedSummary.lastAttemptLabel ?? "No attempt data yet"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Avg pre" value={selectedSummary.avgPre} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Avg post" value={selectedSummary.avgPost} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Avg gain" value={selectedSummary.avgGain} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Avg time" value={selectedSummary.avgTime} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Latest score" value={selectedSummary.lastScore ?? 0} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Best post" value={bestPostScore} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Best gain" value={bestGain} precision={2} accent={themeStyles.accentText} />
                <MetricCard title="Improvement rate" value={completionRate} precision={0} suffix="%" accent={themeStyles.accentText} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip label="Student code" value={selectedStudent.student_code ?? "-"} />
                <StatChip label="Cohort" value={selectedStudent.cohort ?? "-"} />
                <StatChip label="Age" value={selectedStudent.age ?? "-"} />
                <StatChip label="Joined" value={formatDate(selectedStudent.created_at)} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h4 className="text-base font-semibold text-slate-900">Pre vs Post scores</h4>
                  <p className="mt-1 text-sm text-slate-600">Score movement across each recorded attempt.</p>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={52} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pre" fill={themeStyles.preColor} name="Pre" />
                        <Bar dataKey="post" fill={themeStyles.postColor} name="Post" />
                        <Bar dataKey="gain" fill={themeStyles.gainColor} name="Gain" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h4 className="text-base font-semibold text-slate-900">Time and gain trend by experiment</h4>
                  <p className="mt-1 text-sm text-slate-600">EMG and ECG are separated so each trend is easier to compare.</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">EMG Trend</p>
                      <div className="mt-2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={emgTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="time" stroke={themeStyles.timeColor} strokeWidth={2} name="Time (s)" />
                            <Line yAxisId="right" type="monotone" dataKey="gain" stroke={themeStyles.lineColor} strokeWidth={2} name="Gain" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700">ECG Trend</p>
                      <div className="mt-2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ecgTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="time" stroke={themeStyles.timeColor} strokeWidth={2} name="Time (s)" />
                            <Line yAxisId="right" type="monotone" dataKey="gain" stroke={themeStyles.lineColor} strokeWidth={2} name="Gain" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {experimentBreakdown.map((item) => (
                  <div key={item.type} className={`rounded-2xl border ${themeStyles.accentBorder} bg-slate-50 p-4`}>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.type}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{item.count} attempts</p>
                    <p className="mt-1 text-sm text-slate-600">Avg gain {item.gain.toFixed(2)}</p>
                    <p className="text-sm text-slate-600">Avg time {item.time.toFixed(2)} s</p>
                  </div>
                ))}
                <div className={`rounded-2xl border ${themeStyles.accentBorder} bg-slate-50 p-4`}>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Latest movement</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{(latestPostScore - firstPreScore).toFixed(2)}</p>
                  <p className="mt-1 text-sm text-slate-600">Latest post minus first pre score</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="text-base font-semibold text-slate-900">Full attempt history</h4>
                  <p className="mt-1 text-sm text-slate-600">All captured scores, gains, timing, and quality metrics for the selected learner.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white text-slate-700">
                      <tr>
                        <th className="px-3 py-3">Experiment</th>
                        <th className="px-3 py-3">Attempt</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Pre</th>
                        <th className="px-3 py-3">Post</th>
                        <th className="px-3 py-3">Gain</th>
                        <th className="px-3 py-3">Norm. gain</th>
                        <th className="px-3 py-3">Efficiency</th>
                        <th className="px-3 py-3">Retention</th>
                        <th className="px-3 py-3">Time (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAttempts.map((attempt) => (
                        <tr key={attempt.attempt_id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-slate-900">{attempt.experiment_type}</td>
                          <td className="px-3 py-3">A{attempt.attempt_number}</td>
                          <td className="px-3 py-3">{formatDateTime(attempt.created_at)}</td>
                          <td className="px-3 py-3">{attempt.pre_test_score}</td>
                          <td className="px-3 py-3">{attempt.post_test_score}</td>
                          <td className="px-3 py-3">{attempt.learning_gain.toFixed(2)}</td>
                          <td className="px-3 py-3">{attempt.normalized_gain ?? "-"}</td>
                          <td className="px-3 py-3">{attempt.efficiency ?? "-"}</td>
                          <td className="px-3 py-3">{attempt.retention_score ?? "-"}</td>
                          <td className="px-3 py-3">{attempt.time_taken_seconds}</td>
                        </tr>
                      ))}

                      {selectedAttempts.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                            No attempts recorded for this student yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Select a student to see attempt-level analytics.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function InfoPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  precision,
  suffix = "",
  accent,
}: {
  title: string;
  value: number;
  precision: number;
  suffix?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>
        {Number(value).toFixed(precision)}{suffix}
      </p>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}