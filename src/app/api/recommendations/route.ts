import { NextResponse } from "next/server";
import { loadPersonalizedRecommendations } from "@/lib/recommendations-processor";

export async function GET() {
  try {
    const recommendations = loadPersonalizedRecommendations();

    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Convert to display-friendly format
    const rows = recommendations.map((rec) => ({
      "Student Name": rec.student_name,
      "Student ID": rec.student_id,
      "Experiment": rec.experiment,
      "Last Attempt": rec.last_attempt,
      "Pre-Test Score": rec.pre_test_score.toFixed(1),
      "Post-Test Score": rec.post_test_score.toFixed(1),
      "Learning Gain": rec.learning_gain.toFixed(2),
      "Normalized Gain": rec.normalized_gain.toFixed(3),
      "Mastery Level": rec.sym_mastery,
      "Struggles": rec.sym_struggle ? "Yes" : "No",
      "Hint Dependent": rec.sym_hint_dependent ? "Yes" : "No",
      "Speed Learner": rec.sym_speed_learner ? "Yes" : "No",
      "Disengaged": rec.sym_disengaged ? "Yes" : "No",
      "Recommended Difficulty": rec.recommended_difficulty,
      "Personalised Advice": rec.personalised_advice,
    }));

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read recommendations";
    console.error("Recommendations API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
