import { z } from "zod";
import { PIN_PATTERN } from "./pin";

const pinSchema = z.string().trim().regex(PIN_PATTERN, "PIN must be 4 to 8 digits");

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  rollNumber: z.string().trim().min(2).max(40),
  pin: pinSchema,
  email: z.string().email().optional().or(z.literal("")),
  age: z.number().int().min(10).max(100),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  program: z.string().trim().min(2).max(120),
  yearOfStudy: z.number().int().min(1).max(12),
  institution: z.string().trim().max(160).optional().or(z.literal("")),
  priorLabExperience: z.boolean(),
  cohort: z.string().trim().max(80).optional().or(z.literal("")),
});

export const studentLoginSchema = z.object({
  rollNumber: z.string().trim().min(2).max(40),
  pin: pinSchema,
});

export const legacyPinSetupSchema = z.object({
  rollNumber: z.string().trim().min(2).max(40),
  email: z.string().email().optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  pin: pinSchema,
});

export const surveySchema = z.object({
  understanding: z.number().int().min(1).max(5),
  engagement: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  usability: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
  feedbackText: z.string().max(4000).optional(),
});

export const createAttemptSchema = z.object({
  studentId: z.string().uuid(),
  experimentType: z.enum(["EMG", "ECG"]),
  preTestScore: z.number().min(0).max(100),
  postTestScore: z.number().min(0).max(100),
  timeTakenSeconds: z.number().int().positive(),
  engagementScore: z.number().min(0).max(100),
  retentionScore: z.number().min(0).max(100).nullable().optional(),
  preTestDurationSeconds: z.number().int().min(0).optional(),
  postTestDurationSeconds: z.number().int().min(0).optional(),
  workflowDurationSeconds: z.number().int().min(0).optional(),
  simulationSkipped: z.boolean().optional(),
  interactionCount: z.number().int().min(0).optional(),
  sectionDurations: z
    .array(
      z.object({
        section: z.enum(["equipment", "preparation", "calibration", "recording", "analysis"]),
        durationSeconds: z.number().int().min(0),
      }),
    )
    .optional(),
  integrityIndicators: z
    .object({
      tabSwitchCount: z.number().int().min(0),
      inactivityCount: z.number().int().min(0),
      inactivitySeconds: z.number().int().min(0),
      abnormalPatternScore: z.number().min(0).max(100),
    })
    .optional(),
  checkpointTelemetry: z
    .array(
      z.object({
        questionId: z.string(),
        section: z.enum(["equipment", "preparation", "calibration", "recording", "analysis"]),
        totalAttempts: z.number().int().min(0),
        wrongAttempts: z.number().int().min(0),
        hintShownCount: z.number().int().min(0),
        reselectionsAfterHint: z.number().int().min(0),
        passed: z.boolean(),
      }),
    )
    .optional(),
  survey: surveySchema,
});
