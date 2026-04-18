"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { clearCurrentStaff, getCurrentStaff } from "@/lib/storage";
import { buildStudentPerformanceSummaries } from "@/lib/staff-analytics";
import { AttemptRecord, Student } from "@/types/domain";

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

interface StudentsResponse {
  students: Student[];
  error?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const staff = getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      router.replace("/admin-login");
      return;
    }

    Promise.all([fetch("/api/students"), fetch("/api/analytics/overview")])
      .then(async ([studentsRes, overviewRes]) => {
        if (!studentsRes.ok) {
          const payload = (await studentsRes.json().catch(() => ({}))) as StudentsResponse;
          throw new Error(payload.error ?? "Unable to load students");
        }
        if (!overviewRes.ok) {
          const payload = await overviewRes.json().catch(() => ({}));
          throw new Error(payload.error ?? "Unable to load analytics");
        }

        const studentsPayload = (await studentsRes.json()) as StudentsResponse;
        const overviewPayload = (await overviewRes.json()) as OverviewResponse;

        setStudents(studentsPayload.students ?? []);
        setOverview(overviewPayload);
      })
      .catch((e: Error) => {
        setError(e.message);
      });
  }, [router]);

  const cohortCount = useMemo(() => {
    return new Set(students.map((student) => student.cohort).filter(Boolean)).size;
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;

    return students.filter((student) => {
      return [student.full_name, student.roll_number, student.student_code, student.email, student.program, student.institution, student.cohort]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [students, query]);

  const performanceData = useMemo(() => buildStudentPerformanceSummaries(students, overview?.attempts ?? []), [students, overview]);
  const performance = performanceData.summaries;
  const activeStudents = performanceData.activeStudents;
  const emgCount = overview?.experimentBreakdown?.EMG.count ?? overview?.attempts.filter((attempt) => attempt.experiment_type === "EMG").length ?? 0;
  const ecgCount = overview?.experimentBreakdown?.ECG.count ?? overview?.attempts.filter((attempt) => attempt.experiment_type === "ECG").length ?? 0;
  const totalAttempts = overview?.attempts.length ?? 0;

  function onLogout() {
    clearCurrentStaff();
    router.push("/admin-login");
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
                <h1 className="mt-1 text-4xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="mt-2 max-w-3xl text-slate-600">
                  Full access console with platform-wide student details, scores, experiments, completion counts, and analytics controls.
                </p>
              </div>
              <button type="button" onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </section>

          {error && <p className="text-red-600">{error}</p>}

          <section className="section-card">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Metric title="Students" value={students.length} />
              <Metric title="Active Students" value={activeStudents} />
              <Metric title="Total Attempts" value={totalAttempts} />
              <Metric title="EMG Attempts" value={emgCount} />
              <Metric title="ECG Attempts" value={ecgCount} />
              <Metric title="Cohorts" value={cohortCount} />
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <Link href="/teacher-dashboard" className="section-card transition hover:shadow-lg">
              <p className="text-lg font-semibold text-slate-900">Teacher Dashboard</p>
              <p className="mt-2 text-sm text-slate-600">Inspect the student-facing instructional workspace with all details.</p>
            </Link>

            <Link href="/dashboard" className="section-card transition hover:shadow-lg">
              <p className="text-lg font-semibold text-slate-900">Student Analytics View</p>
              <p className="mt-2 text-sm text-slate-600">Open the student-facing analytics dashboard for workflow-level charts.</p>
            </Link>

            <Link href="/experiments" className="section-card transition hover:shadow-lg">
              <p className="text-lg font-semibold text-slate-900">Experiment Flow</p>
              <p className="mt-2 text-sm text-slate-600">Validate pre-test, simulation, post-test, and survey progression paths.</p>
            </Link>
          </section>

          <section className="section-card">
            <h2 className="text-xl font-semibold">Full Access Panel (Admin)</h2>
            <p className="mt-2 text-sm text-slate-600">Navigate to any major area of the product without restriction.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/teacher-dashboard" className="side-card transition hover:shadow-md">
                Student Details Roster
              </Link>
              <Link href="/dashboard" className="side-card transition hover:shadow-md">
                Student Analytics Dashboard
              </Link>
              <Link href="/experiments" className="side-card transition hover:shadow-md">
                Experiment Launcher
              </Link>
              <Link href="/pre-test/ECG" className="side-card transition hover:shadow-md">
                Pre-test Module
              </Link>
              <Link href="/post-test/ECG" className="side-card transition hover:shadow-md">
                Post-test Module
              </Link>
              <Link href="/" className="side-card transition hover:shadow-md">
                Landing & Navigation
              </Link>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="section-card">
              <h2 className="text-xl font-semibold">Student Performance Summary</h2>
              <p className="mt-2 text-sm text-slate-600">All students with score averages, experiment counts, and latest attempt details.</p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Roll</th>
                      <th className="px-3 py-3">Attempts</th>
                      <th className="px-3 py-3">EMG</th>
                      <th className="px-3 py-3">ECG</th>
                      <th className="px-3 py-3">Avg Pre</th>
                      <th className="px-3 py-3">Avg Post</th>
                      <th className="px-3 py-3">Avg Gain</th>
                      <th className="px-3 py-3">Avg Time</th>
                      <th className="px-3 py-3">Last Attempt</th>
                      <th className="px-3 py-3">Last Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((row) => (
                      <tr key={row.studentId} className="border-t border-slate-100 align-top hover:bg-indigo-50/40">
                        <td className="px-3 py-3 font-medium text-slate-900">{row.fullName}</td>
                        <td className="px-3 py-3">{row.rollNumber}</td>
                        <td className="px-3 py-3">{row.totalAttempts}</td>
                        <td className="px-3 py-3">{row.emgAttempts}</td>
                        <td className="px-3 py-3">{row.ecgAttempts}</td>
                        <td className="px-3 py-3">{row.avgPre.toFixed(2)}</td>
                        <td className="px-3 py-3">{row.avgPost.toFixed(2)}</td>
                        <td className="px-3 py-3">{row.avgGain.toFixed(2)}</td>
                        <td className="px-3 py-3">{row.avgTime.toFixed(2)}</td>
                        <td className="px-3 py-3">{row.lastAttemptLabel ?? "-"}</td>
                        <td className="px-3 py-3">{row.lastScore ?? "-"}</td>
                      </tr>
                    ))}
                    {performance.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                          No student performance data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section-card">
              <h2 className="text-xl font-semibold">Recent Attempt Activity</h2>
              <p className="mt-2 text-sm text-slate-600">Latest experiment attempts with scores, gains, and time spent.</p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-3">Student</th>
                      <th className="px-3 py-3">Experiment</th>
                      <th className="px-3 py-3">Attempt</th>
                      <th className="px-3 py-3">Pre</th>
                      <th className="px-3 py-3">Post</th>
                      <th className="px-3 py-3">Gain</th>
                      <th className="px-3 py-3">Time (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(overview?.attempts ?? [])]
                      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
                      .slice(0, 12)
                      .map((attempt) => (
                        <tr key={attempt.attempt_id} className="border-t border-slate-100 hover:bg-indigo-50/40">
                          <td className="px-3 py-3 font-medium text-slate-900">{attempt.full_name}</td>
                          <td className="px-3 py-3">{attempt.experiment_type}</td>
                          <td className="px-3 py-3">A{attempt.attempt_number}</td>
                          <td className="px-3 py-3">{attempt.pre_test_score}</td>
                          <td className="px-3 py-3">{attempt.post_test_score}</td>
                          <td className="px-3 py-3">{attempt.learning_gain.toFixed(2)}</td>
                          <td className="px-3 py-3">{attempt.time_taken_seconds}</td>
                        </tr>
                      ))}
                    {(overview?.attempts.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          No recent attempts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="section-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Students (Admin View)</h2>
              <input
                className="input max-w-md"
                placeholder="Search by name, roll number, code, email, program..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Roll No</th>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Program</th>
                    <th className="px-3 py-3">Year</th>
                    <th className="px-3 py-3">Cohort</th>
                    <th className="px-3 py-3">Lab Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-t border-slate-100 hover:bg-indigo-50/40">
                      <td className="px-3 py-3 font-medium text-slate-900">{student.full_name}</td>
                      <td className="px-3 py-3">{student.roll_number}</td>
                      <td className="px-3 py-3">{student.student_code ?? "-"}</td>
                      <td className="px-3 py-3">{student.email ?? "-"}</td>
                      <td className="px-3 py-3">{student.program ?? "-"}</td>
                      <td className="px-3 py-3">{student.year_of_study ?? "-"}</td>
                      <td className="px-3 py-3">{student.cohort ?? "-"}</td>
                      <td className="px-3 py-3">{student.prior_lab_experience ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                        No students found for this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}

function Metric({ title, value, precision = 0 }: { title: string; value: number; precision?: number }) {
  return (
    <div className="metric-card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{Number(value).toFixed(precision)}</p>
    </div>
  );
}
