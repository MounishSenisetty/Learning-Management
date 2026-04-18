export type ExperimentType = "EMG" | "ECG";

export interface Student {
  id: string;
  student_code: string | null;
  roll_number: string;
  full_name: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  program: string | null;
  year_of_study: number | null;
  institution: string | null;
  prior_lab_experience: boolean | null;
  cohort: string | null;
  created_at: string;
}

export interface AttemptPayload {
  studentId: string;
  experimentType: ExperimentType;
  preTestScore: number;
  postTestScore: number;
  timeTakenSeconds: number;
  engagementScore: number;
  retentionScore?: number | null;
  survey: {
    understanding: number;
    engagement: number;
    difficulty: number;
    usability: number;
    confidence: number;
    feedbackText?: string;
  };
}

export interface AttemptRecord {
  attempt_id: string;
  student_id: string;
  roll_number: string;
  full_name: string;
  experiment_type: ExperimentType;
  attempt_number: number;
  pre_test_score: number;
  post_test_score: number;
  learning_gain: number;
  normalized_gain: number | null;
  efficiency: number | null;
  time_taken_seconds: number;
  engagement_score: number | null;
  retention_score: number | null;
  created_at: string;
}
