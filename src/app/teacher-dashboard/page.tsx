"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { StudentAnalyticsExplorer } from "@/components/student-analytics-explorer";
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
}

interface StudentsResponse {
  students: Student[];
  error?: string;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const staffRole = useSyncExternalStore(subscribeStaffSession, getStaffRoleSnapshot, getServerStaffRoleSnapshot);
  const [students, setStudents] = useState<Student[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffRole || (staffRole !== "teacher" && staffRole !== "admin")) {
      router.replace("/teacher-login");
      return;
    }

    Promise.all([fetch("/api/students"), fetch("/api/analytics/overview")])
      .then(async ([studentsRes, overviewRes]) => {
        if (!studentsRes.ok) {
          const payload = (await studentsRes.json().catch(() => ({}))) as StudentsResponse;
          throw new Error(payload.error ?? "Failed to load students");
        }

        if (!overviewRes.ok) {
          const payload = await overviewRes.json().catch(() => ({}));
          throw new Error(payload.error ?? "Failed to load analytics");
        }

        const studentsPayload = (await studentsRes.json()) as StudentsResponse;
        const overviewPayload = (await overviewRes.json()) as OverviewResponse;

        setStudents(studentsPayload.students ?? []);
        setOverview(overviewPayload);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [router, staffRole]);

  const currentRole = staffRole;

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

  function onLogout() {
    clearCurrentStaff();
    router.push(currentRole === "admin" ? "/admin-login" : "/teacher-login");
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="layout-container">
          <div className="space-y-6">
            <section className="section-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-teal-700">Teacher Workspace</p>
                  <h1 className="mt-1 text-4xl font-bold text-slate-900">Teacher Dashboard</h1>
                  <p className="mt-2 max-w-3xl text-slate-600">
                    Full student workspace with student details, scores, experiment counts, and attempt-level learning progress.
                  </p>
                  {currentRole === "admin" && <p className="mt-1 text-xs text-indigo-700">Opened with admin full-access privileges.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={onLogout} className="btn btn-secondary">
                    Logout
                  </button>
                </div>
              </div>
            </section>

            <section className="section-card">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <Metric title="Total Students" value={students.length} />
                <Metric title="Students Active" value={activeStudents} />
                <Metric title="Total Attempts" value={overview?.attempts.length ?? 0} />
                <Metric title="EMG Attempts" value={emgCount} />
                <Metric title="ECG Attempts" value={ecgCount} />
                <Metric title="Avg Gain" value={overview?.summary.avgGain ?? 0} precision={2} />
              </div>
            </section>

            <StudentAnalyticsExplorer students={students} attempts={overview?.attempts ?? []} theme="teacher" />

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="section-card">
                <h2 className="text-xl font-semibold">Student Performance Summary</h2>
                <p className="mt-2 text-sm text-slate-600">Each learner&apos;s scores, experiments completed, and latest attempt summary.</p>
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
                        <tr key={row.studentId} className="border-t border-slate-100 align-top hover:bg-cyan-50/40">
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
                <p className="mt-2 text-sm text-slate-600">Latest experiment attempts with scores and duration.
                </p>
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
                          <tr key={attempt.attempt_id} className="border-t border-slate-100 hover:bg-cyan-50/40">
                            <td className="px-3 py-3 font-medium text-slate-900">{attempt.full_name}</td>
                            <td className="px-3 py-3">{attempt.experiment_type}</td>
                            <td className="px-3 py-3">A{attempt.attempt_number}</td>
                            <td className="px-3 py-3">{attempt.pre_test_score}</td>
                            <td className="px-3 py-3">{attempt.post_test_score}</td>
                            <td className="px-3 py-3">{attempt.learning_gain.toFixed(2)}</td>
                            <td className="px-3 py-3">{attempt.time_taken_seconds}</td>
                          </tr>
                        ))}
                      {!(overview?.attempts.length ?? 0) && (
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
                <h2 className="text-xl font-semibold">Student Details</h2>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, roll number, code, email, program..."
                  className="input max-w-md"
                />
              </div>

              {loading && <p className="mt-4 text-slate-600">Loading teacher workspace...</p>}
              {error && <p className="mt-4 text-red-600">{error}</p>}

              {!loading && !error && (
                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Roll No</th>
                        <th className="px-3 py-3">Code</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Age</th>
                        <th className="px-3 py-3">Gender</th>
                        <th className="px-3 py-3">Program</th>
                        <th className="px-3 py-3">Year</th>
                        <th className="px-3 py-3">Institution</th>
                        <th className="px-3 py-3">Cohort</th>
                        <th className="px-3 py-3">Lab Exp</th>
                        <th className="px-3 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="border-t border-slate-100 align-top hover:bg-cyan-50/40">
                          <td className="px-3 py-3 font-medium text-slate-900">{student.full_name}</td>
                          <td className="px-3 py-3">{student.roll_number}</td>
                          <td className="px-3 py-3">{student.student_code ?? "-"}</td>
                          <td className="px-3 py-3">{student.email ?? "-"}</td>
                          <td className="px-3 py-3">{student.age ?? "-"}</td>
                          <td className="px-3 py-3">{student.gender ?? "-"}</td>
                          <td className="px-3 py-3">{student.program ?? "-"}</td>
                          <td className="px-3 py-3">{student.year_of_study ?? "-"}</td>
                          <td className="px-3 py-3">{student.institution ?? "-"}</td>
                          <td className="px-3 py-3">{student.cohort ?? "-"}</td>
                          <td className="px-3 py-3">{student.prior_lab_experience ? "Yes" : "No"}</td>
                          <td className="px-3 py-3">{new Date(student.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}

                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={12} className="px-3 py-6 text-center text-slate-500">
                            No students found for this search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
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

function subscribeStaffSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("staff-session-changed", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("staff-session-changed", handler);
  };
}

function getStaffRoleSnapshot() {
  return getCurrentStaff()?.role ?? null;
}

function getServerStaffRoleSnapshot() {
  return null;
}
