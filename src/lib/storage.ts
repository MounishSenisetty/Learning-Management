import { ExperimentType } from "@/types/domain";

const CURRENT_STUDENT_KEY = "lm_current_student";
const CURRENT_STUDENT_AUTH_KEY = "lm_student_authenticated";
const CURRENT_FLOW_KEY = "lm_flow_state";
const CURRENT_STAFF_KEY = "lm_current_staff";
const isBrowser = () => typeof window !== "undefined";

export interface FlowState {
  experimentType: ExperimentType;
  workflowStartedAt?: number;
  preTestScore?: number;
  preTestStartedAt?: number;
  preTestEndedAt?: number;
  simulationStartedAt?: number;
  simulationEndedAt?: number;
  simulationSkipped?: boolean;
  engagementScore?: number;
  postTestStartedAt?: number;
  postTestEndedAt?: number;
  postTestScore?: number;
  interactionCount?: number;
  sectionDurations?: Array<{
    section: "equipment" | "preparation" | "calibration" | "recording" | "analysis";
    durationSeconds: number;
  }>;
  integrityIndicators?: {
    tabSwitchCount: number;
    inactivityCount: number;
    inactivitySeconds: number;
    abnormalPatternScore: number;
  };
  checkpointTelemetry?: Array<{
    questionId: string;
    section: "equipment" | "preparation" | "calibration" | "recording" | "analysis";
    totalAttempts: number;
    wrongAttempts: number;
    hintShownCount: number;
    reselectionsAfterHint: number;
    passed: boolean;
  }>;
}

export interface CurrentStudent {
  id: string;
  student_code?: string | null;
  roll_number: string;
  full_name: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  program?: string | null;
  year_of_study?: number | null;
  institution?: string | null;
  prior_lab_experience?: boolean | null;
  cohort?: string | null;
}

export interface CurrentStaff {
  role: "teacher" | "admin";
  username: string;
}

export function setCurrentStudent(student: CurrentStudent) {
  if (!isBrowser()) return;
  // Keep student session tab-scoped so old identities are not reused across new app opens.
  sessionStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
  sessionStorage.setItem(CURRENT_STUDENT_AUTH_KEY, "1");
  localStorage.removeItem(CURRENT_STUDENT_KEY);
  window.dispatchEvent(new Event("student-session-changed"));
}

export function getCurrentStudent(): CurrentStudent | null {
  if (!isBrowser()) return null;
  if (sessionStorage.getItem(CURRENT_STUDENT_AUTH_KEY) !== "1") {
    sessionStorage.removeItem(CURRENT_STUDENT_KEY);
    localStorage.removeItem(CURRENT_STUDENT_KEY);
    return null;
  }

  const sessionRaw = sessionStorage.getItem(CURRENT_STUDENT_KEY);
  if (!sessionRaw) {
    sessionStorage.removeItem(CURRENT_STUDENT_AUTH_KEY);
    localStorage.removeItem(CURRENT_STUDENT_KEY);
    return null;
  }

  try {
    const parsed = JSON.parse(sessionRaw) as Partial<CurrentStudent> | null;
    if (!parsed || typeof parsed !== "object") {
      clearCurrentStudent();
      return null;
    }

    if (typeof parsed.id !== "string" || typeof parsed.roll_number !== "string" || typeof parsed.full_name !== "string") {
      clearCurrentStudent();
      return null;
    }

    return {
      id: parsed.id,
      roll_number: parsed.roll_number,
      full_name: parsed.full_name,
      student_code: typeof parsed.student_code === "string" ? parsed.student_code : null,
      email: typeof parsed.email === "string" ? parsed.email : null,
      age: typeof parsed.age === "number" ? parsed.age : null,
      gender: typeof parsed.gender === "string" ? parsed.gender : null,
      program: typeof parsed.program === "string" ? parsed.program : null,
      year_of_study: typeof parsed.year_of_study === "number" ? parsed.year_of_study : null,
      institution: typeof parsed.institution === "string" ? parsed.institution : null,
      prior_lab_experience: typeof parsed.prior_lab_experience === "boolean" ? parsed.prior_lab_experience : null,
      cohort: typeof parsed.cohort === "string" ? parsed.cohort : null,
    };
  } catch {
    // Corrupted or invalid session payload should not keep the user logged in.
    clearCurrentStudent();
    return null;
  }
}

export function clearCurrentStudent() {
  if (!isBrowser()) return;
  sessionStorage.removeItem(CURRENT_STUDENT_AUTH_KEY);
  sessionStorage.removeItem(CURRENT_STUDENT_KEY);
  localStorage.removeItem(CURRENT_STUDENT_KEY);
  window.dispatchEvent(new Event("student-session-changed"));
}

export function setFlowState(state: FlowState) {
  if (!isBrowser()) return;
  localStorage.setItem(CURRENT_FLOW_KEY, JSON.stringify(state));
}

export function getFlowState(): FlowState | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(CURRENT_FLOW_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearFlowState() {
  if (!isBrowser()) return;
  localStorage.removeItem(CURRENT_FLOW_KEY);
}

export function setCurrentStaff(staff: CurrentStaff) {
  if (!isBrowser()) return;
  localStorage.setItem(CURRENT_STAFF_KEY, JSON.stringify(staff));
  window.dispatchEvent(new Event("staff-session-changed"));
}

export function getCurrentStaff(): CurrentStaff | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(CURRENT_STAFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CurrentStaff> | null;
    const role = parsed?.role;
    const username = parsed?.username;

    if ((role !== "teacher" && role !== "admin") || typeof username !== "string") {
      clearCurrentStaff();
      return null;
    }

    return { role, username };
  } catch {
    clearCurrentStaff();
    return null;
  }
}

export function clearCurrentStaff() {
  if (!isBrowser()) return;
  localStorage.removeItem(CURRENT_STAFF_KEY);
  window.dispatchEvent(new Event("staff-session-changed"));
}

export function getStaffDashboardPath(role?: CurrentStaff["role"] | null): string {
  if (role === "admin") return "/admin-dashboard";
  return "/teacher-dashboard";
}
