import { ExperimentType } from "@/types/domain";

const CURRENT_STUDENT_KEY = "lm_current_student";
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
  localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
}

export function getCurrentStudent(): CurrentStudent | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(CURRENT_STUDENT_KEY);
  return raw ? JSON.parse(raw) : null;
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
  return raw ? JSON.parse(raw) : null;
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
