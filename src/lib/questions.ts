import { ExperimentType } from "@/types/domain";

export interface Question {
  id: string;
  section: "equipment" | "preparation" | "calibration" | "recording" | "analysis";
  text: string;
  options: string[];
  answerIndex: number;
  hint?: string;
}

export type AssessmentModule = "pre-test" | "post-test";

const commonQuestions: Record<ExperimentType, Question[]> = {
  ECG: [
    {
      id: "ecg-1",
      section: "analysis",
      text: "Which ECG waveform component corresponds to ventricular depolarization?",
      options: ["P wave", "QRS complex", "T wave", "PR interval"],
      answerIndex: 1,
    },
    {
      id: "ecg-2",
      section: "recording",
      text: "If RR intervals increase while recording, what usually happens to heart rate?",
      options: ["Higher heart rate", "Lower heart rate", "No rhythm change", "Artifact only"],
      answerIndex: 1,
    },
    {
      id: "ecg-3",
      section: "calibration",
      text: "Which paper speed is standard for routine ECG interpretation?",
      options: ["10 mm/s", "25 mm/s", "50 mm/s", "100 mm/s"],
      answerIndex: 1,
    },
    {
      id: "ecg-4",
      section: "preparation",
      text: "Why is skin preparation (cleaning/abrading) important before electrode placement?",
      options: [
        "To reduce skin-electrode impedance and improve signal quality",
        "To increase baseline drift",
        "To reduce sampling frequency",
        "To eliminate the need for calibration",
      ],
      answerIndex: 0,
    },
    {
      id: "ecg-5",
      section: "equipment",
      text: "Which item is primarily used to improve conduction between skin and electrode?",
      options: ["Alcohol swab", "Conductive gel", "DAQ cable", "Abrasive pad only"],
      answerIndex: 1,
    },
  ],
  EMG: [
    {
      id: "emg-1",
      section: "analysis",
      text: "EMG signal amplitude is most directly related to:",
      options: ["Bone density", "Electrical activity in muscles", "Blood glucose", "Blood pressure"],
      answerIndex: 1,
    },
    {
      id: "emg-2",
      section: "recording",
      text: "During stronger voluntary contraction, EMG amplitude typically:",
      options: ["Lower motor unit recruitment", "Higher motor unit recruitment", "No contraction", "Lower sampling rate"],
      answerIndex: 1,
    },
    {
      id: "emg-3",
      section: "calibration",
      text: "A commonly used preprocessing step before EMG envelope extraction is:",
      options: ["Histogram equalization", "Rectification", "Image segmentation", "Color normalization"],
      answerIndex: 1,
    },
    {
      id: "emg-4",
      section: "preparation",
      text: "What is the main purpose of proper electrode placement along muscle fibers in EMG?",
      options: [
        "Increase motion artifact",
        "Capture cleaner motor unit activity",
        "Reduce amplifier gain",
        "Avoid using reference electrode",
      ],
      answerIndex: 1,
    },
    {
      id: "emg-5",
      section: "equipment",
      text: "Which component helps convert analog EMG signal into digital form for analysis?",
      options: ["Conductive gel", "Alcohol swab", "DAQ system", "Elastic band"],
      answerIndex: 2,
    },
  ],
};

const defaultAssessmentQuestions: Record<AssessmentModule, Record<ExperimentType, Question[]>> = {
  "pre-test": commonQuestions,
  "post-test": {
    ECG: commonQuestions.ECG.map((question) => ({
      ...question,
      options: [...question.options],
    })),
    EMG: commonQuestions.EMG.map((question) => ({
      ...question,
      options: [...question.options],
    })),
  },
};

const sectionCheckpointQuestions: Record<ExperimentType, Question[]> = {
  ECG: [
    {
      id: "ecg-cp-1",
      section: "equipment",
      text: "Checkpoint: Before proceeding, which combination is essential for ECG acquisition setup?",
      options: ["ECG amplifier + electrodes + DAQ", "Only gel", "Only swabs", "Only display monitor"],
      answerIndex: 0,
      hint: "Think of the full acquisition chain: sensing electrodes, amplification, and digitization.",
    },
    {
      id: "ecg-cp-2",
      section: "preparation",
      text: "Checkpoint: What does high skin-electrode impedance usually cause?",
      options: ["Cleaner waveform", "More noise/artifacts", "Higher sampling rate", "No effect"],
      answerIndex: 1,
      hint: "High impedance reduces contact quality and increases artifact pickup.",
    },
    {
      id: "ecg-cp-3",
      section: "calibration",
      text: "Checkpoint: Choosing an appropriate gain in ECG calibration mainly helps with:",
      options: ["Waveform visibility without clipping", "Battery life only", "Changing heart rhythm", "Removing all artifacts"],
      answerIndex: 0,
      hint: "Gain scales signal amplitude on screen; too low hides, too high clips.",
    },
    {
      id: "ecg-cp-4",
      section: "recording",
      text: "Checkpoint: Which rhythm feature is directly measured from successive R peaks?",
      options: ["QRS width only", "RR interval", "P wave polarity", "Electrode impedance"],
      answerIndex: 1,
      hint: "Heart rate and rhythm timing are derived from beat-to-beat R peak spacing.",
    },
    {
      id: "ecg-cp-5",
      section: "analysis",
      text: "Checkpoint: A regularly irregular pattern with variable RR intervals suggests:",
      options: ["Perfect normal sinus only", "Potential rhythm abnormality requiring interpretation", "Calibration failure only", "No physiological meaning"],
      answerIndex: 1,
      hint: "Variable RR patterns are clinically interpreted, not dismissed as pure device issues.",
    },
  ],
  EMG: [
    {
      id: "emg-cp-1",
      section: "equipment",
      text: "Checkpoint: Which hardware pair is critical to digitize EMG activity?",
      options: ["Surface electrodes + DAQ", "Only cuff", "Only gel", "Only skin marker"],
      answerIndex: 0,
      hint: "You need one sensor component and one acquisition component.",
    },
    {
      id: "emg-cp-2",
      section: "preparation",
      text: "Checkpoint: Why should electrode sites be cleaned before EMG recording?",
      options: ["To increase baseline drift", "To reduce impedance and improve signal quality", "To change muscle force", "To skip reference electrode"],
      answerIndex: 1,
      hint: "Skin prep is about better electrical contact and less noise.",
    },
    {
      id: "emg-cp-3",
      section: "calibration",
      text: "Checkpoint: Proper band-pass settings in EMG are used to:",
      options: ["Capture useful muscle frequencies and suppress noise", "Increase heart rate", "Convert EMG into ECG", "Delete all variability"],
      answerIndex: 0,
      hint: "Filters isolate useful EMG bandwidth and attenuate motion/powerline noise.",
    },
    {
      id: "emg-cp-4",
      section: "recording",
      text: "Checkpoint: During sustained stronger contraction, EMG RMS commonly:",
      options: ["Decreases", "Increases", "Becomes zero", "Remains unrelated"],
      answerIndex: 1,
      hint: "RMS generally rises with greater motor unit recruitment.",
    },
    {
      id: "emg-cp-5",
      section: "analysis",
      text: "Checkpoint: In EMG analysis, rectified + smoothed signal mainly represents:",
      options: ["Motor control envelope", "Bone density", "Blood pressure", "Electrode brand"],
      answerIndex: 0,
      hint: "Rectified-and-smoothed EMG is commonly used as activation/envelope trend.",
    },
  ],
};

function cloneQuestions(questions: Question[]): Question[] {
  return questions.map((question) => ({
    ...question,
    options: [...question.options],
  }));
}

export function getDefaultQuestions(type: ExperimentType, module: AssessmentModule = "pre-test"): Question[] {
  return cloneQuestions(defaultAssessmentQuestions[module][type]);
}

export function getQuestions(type: ExperimentType, module: AssessmentModule = "pre-test"): Question[] {
  return getDefaultQuestions(type, module);
}

export function getSectionCheckpointQuestions(type: ExperimentType): Question[] {
  return cloneQuestions(sectionCheckpointQuestions[type]);
}

interface QuestionsResponse {
  questions?: Question[];
}

export async function fetchQuestions(type: ExperimentType, module: AssessmentModule): Promise<Question[]> {
  const fallback = getDefaultQuestions(type, module);

  try {
    const params = new URLSearchParams({ experimentType: type, module });
    const response = await fetch(`/api/questions?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as QuestionsResponse;
    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return fallback;
    }

    return cloneQuestions(payload.questions);
  } catch {
    return fallback;
  }
}

export function scoreAnswers(questions: Question[], answers: number[]): number {
  if (!questions.length) return 0;
  const correct = questions.reduce((sum, question, idx) => {
    return sum + (answers[idx] === question.answerIndex ? 1 : 0);
  }, 0);
  return Number(((correct / questions.length) * 100).toFixed(2));
}
