import { AttemptRecord, Student } from "@/types/domain";

export interface StudentPerformanceSummary {
  studentId: string;
  fullName: string;
  rollNumber: string;
  studentCode: string | null;
  cohort: string | null;
  program: string | null;
  totalAttempts: number;
  emgAttempts: number;
  ecgAttempts: number;
  avgPre: number;
  avgPost: number;
  avgGain: number;
  avgTime: number;
  lastExperiment: string | null;
  lastAttemptLabel: string | null;
  lastScore: number | null;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildStudentPerformanceSummaries(students: Student[], attempts: AttemptRecord[]) {
  const attemptsByStudent = new Map<string, AttemptRecord[]>();

  for (const attempt of attempts) {
    const rows = attemptsByStudent.get(attempt.student_id) ?? [];
    rows.push(attempt);
    attemptsByStudent.set(attempt.student_id, rows);
  }

  const summaries: StudentPerformanceSummary[] = students.map((student) => {
    const rows = [...(attemptsByStudent.get(student.id) ?? [])].sort((left, right) => {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    });

    const emgAttempts = rows.filter((row) => row.experiment_type === "EMG").length;
    const ecgAttempts = rows.filter((row) => row.experiment_type === "ECG").length;
    const lastAttempt = rows[rows.length - 1] ?? null;

    return {
      studentId: student.id,
      fullName: student.full_name,
      rollNumber: student.roll_number,
      studentCode: student.student_code,
      cohort: student.cohort,
      program: student.program,
      totalAttempts: rows.length,
      emgAttempts,
      ecgAttempts,
      avgPre: average(rows.map((row) => row.pre_test_score)),
      avgPost: average(rows.map((row) => row.post_test_score)),
      avgGain: average(rows.map((row) => row.learning_gain)),
      avgTime: average(rows.map((row) => row.time_taken_seconds)),
      lastExperiment: lastAttempt?.experiment_type ?? null,
      lastAttemptLabel: lastAttempt ? `${lastAttempt.experiment_type}-A${lastAttempt.attempt_number}` : null,
      lastScore: lastAttempt ? lastAttempt.post_test_score : null,
    };
  });

  const attemptsByExperiment = attempts.reduce(
    (acc, attempt) => {
      acc[attempt.experiment_type] += 1;
      return acc;
    },
    { EMG: 0, ECG: 0 },
  );

  const activeStudents = summaries.filter((summary) => summary.totalAttempts > 0).length;

  return {
    summaries,
    activeStudents,
    attemptsByExperiment,
  };
}