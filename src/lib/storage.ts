import { ExperimentType } from "@/types/domain";

const CURRENT_STUDENT_KEY = "lm_current_student";
const CURRENT_FLOW_KEY = "lm_flow_state";
const isBrowser = () => typeof window !== "undefined";

export interface FlowState {
  experimentType: ExperimentType;
  preTestScore?: number;
  simulationStartedAt?: number;
  simulationEndedAt?: number;
  engagementScore?: number;
  postTestScore?: number;
  interactionCount?: number;
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
