import fs from "fs";
import path from "path";
import { NeuroSymbolicInsight } from "@/lib/analytics";

export interface PersonalizedRecommendation {
  student_name: string;
  student_id: string;
  experiment: string;
  last_attempt: number;
  pre_test_score: number;
  post_test_score: number;
  learning_gain: number;
  normalized_gain: number;
  neural_predicted_post: number;
  sym_mastery: string;
  sym_struggle: boolean;
  sym_hint_dependent: boolean;
  sym_speed_learner: boolean;
  sym_disengaged: boolean;
  recommended_difficulty: string;
  personalised_advice: string;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function loadPersonalizedRecommendations(): PersonalizedRecommendation[] {
  try {
    const csvPath = path.join(process.cwd(), "Results", "personalised_recommendations.csv");

    if (!fs.existsSync(csvPath)) {
      console.warn(`CSV file not found at ${csvPath}`);
      return [];
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n");

    if (lines.length < 2) {
      return [];
    }

    const headers = parseCSVLine(lines[0]);
    const recommendations: PersonalizedRecommendation[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length < headers.length) continue;

      const record: PersonalizedRecommendation = {
        student_name: values[0],
        student_id: values[1],
        experiment: values[2],
        last_attempt: parseInt(values[3]) || 0,
        pre_test_score: parseFloat(values[4]) || 0,
        post_test_score: parseFloat(values[5]) || 0,
        learning_gain: parseFloat(values[6]) || 0,
        normalized_gain: parseFloat(values[7]) || 0,
        neural_predicted_post: parseFloat(values[8]) || 0,
        sym_mastery: values[9],
        sym_struggle: values[10].toLowerCase() === "true",
        sym_hint_dependent: values[11].toLowerCase() === "true",
        sym_speed_learner: values[12].toLowerCase() === "true",
        sym_disengaged: values[13].toLowerCase() === "true",
        recommended_difficulty: values[14],
        personalised_advice: values[15],
      };

      recommendations.push(record);
    }

    return recommendations;
  } catch (error) {
    console.error("Error loading recommendations:", error);
    return [];
  }
}

export function convertRecommendationsToNeuroSymbolic(
  recommendations: PersonalizedRecommendation[],
): NeuroSymbolicInsight {
  const studentMap = new Map<
    string,
    {
      recommendations: PersonalizedRecommendation[];
      totalGain: number;
      count: number;
    }
  >();

  // Group by student ID
  for (const rec of recommendations) {
    const existing = studentMap.get(rec.student_id) || {
      recommendations: [],
      totalGain: 0,
      count: 0,
    };

    existing.recommendations.push(rec);
    existing.totalGain += rec.learning_gain;
    existing.count += 1;

    studentMap.set(rec.student_id, existing);
  }

  // Classify students
  const strugglingStudents: string[] = [];
  const highPerformers: string[] = [];
  const improvingStudents: string[] = [];

  for (const [studentId, data] of studentMap) {
    const avgGain = data.totalGain / data.count;
    const hasStruggles = data.recommendations.some((r) => r.sym_struggle);
    const hasHighGain = data.recommendations.some((r) => r.learning_gain > 30);
    const hasIncreaseRecommendation = data.recommendations.some(
      (r) => r.recommended_difficulty === "increase"
    );

    if (hasIncreaseRecommendation && hasHighGain) {
      highPerformers.push(studentId);
    } else if (hasStruggles && avgGain < 15) {
      strugglingStudents.push(studentId);
    } else if (avgGain > 20) {
      improvingStudents.push(studentId);
    }
  }

  // Generate findings
  const overallFindings: string[] = [];

  if (highPerformers.length > 0) {
    overallFindings.push(
      `${highPerformers.length} student(s) demonstrate high mastery with recommended challenge increase.`
    );
  }

  if (strugglingStudents.length > 0) {
    overallFindings.push(
      `${strugglingStudents.length} student(s) need targeted support with hints and scaffolding.`
    );
  }

  if (improvingStudents.length > 0) {
    overallFindings.push(
      `${improvingStudents.length} student(s) show consistent improvement across experiments.`
    );
  }

  const totalGain =
    Array.from(studentMap.values()).reduce((sum, data) => sum + data.totalGain / data.count, 0) /
    studentMap.size;

  overallFindings.push(`Average learning gain across all students: ${totalGain.toFixed(2)} points.`);

  // Build clusters
  const behavioralClusters = [];

  if (highPerformers.length > 0) {
    behavioralClusters.push({
      clusterId: "high-performers",
      label: "High Performers",
      size: highPerformers.length,
      characteristics: [
        "Mastery demonstrated",
        "Ready for advanced challenges",
        "Strong learning gains",
      ],
      studentIds: highPerformers,
      interventionSuggestion: "Provide advanced challenges and leadership opportunities",
    });
  }

  if (strugglingStudents.length > 0) {
    behavioralClusters.push({
      clusterId: "struggling",
      label: "Struggling Learners",
      size: strugglingStudents.length,
      characteristics: ["Need hints and scaffolding", "Lower learning gains", "Require support"],
      studentIds: strugglingStudents,
      interventionSuggestion: "Offer targeted tutorials and step-by-step guidance",
    });
  }

  if (improvingStudents.length > 0) {
    behavioralClusters.push({
      clusterId: "improving",
      label: "Improving Learners",
      size: improvingStudents.length,
      characteristics: ["Consistent progress", "Positive trajectory", "Engaged"],
      studentIds: improvingStudents,
      interventionSuggestion: "Maintain current learning pathway with incremental challenges",
    });
  }

  return {
    timestamp: new Date().toISOString(),
    totalStudents: studentMap.size,
    learningPatterns: Array.from(studentMap.entries()).map(([studentId, data]) => {
      const avgGain = data.totalGain / data.count;
      const firstRec = data.recommendations[0];

      return {
        studentId,
        patternType: data.recommendations.some((r) => r.recommended_difficulty === "increase")
          ? "efficient"
          : data.recommendations.some((r) => r.sym_struggle)
            ? "struggling"
            : "improving",
        confidence: 0.85,
        description:
          firstRec.personalised_advice ||
          `Student ${firstRec.student_name} - ${data.recommendations.length} attempt(s)`,
        metrics: {
          avgGain,
          avgTime: 0,
          consistency: 0.8,
          engagement: data.recommendations.some((r) => r.sym_disengaged) ? 0.5 : 0.8,
        },
      };
    }),
    behavioralClusters,
    overallFindings,
    priorityInterventions: [
      {
        priority: "high",
        intervention: "Provide targeted support for struggling learners",
        affectedStudents: strugglingStudents.length,
      },
      {
        priority: "medium",
        intervention: "Monitor and support improving learners",
        affectedStudents: improvingStudents.length,
      },
      {
        priority: "low",
        intervention: "Challenge high performers with advanced content",
        affectedStudents: highPerformers.length,
      },
    ],
  };
}
