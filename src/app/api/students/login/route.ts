import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { studentLoginSchema } from "@/lib/validation";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to login student");
  }
  return "Failed to login student";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = studentLoginSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const query = supabase
      .from("students")
      .select("id, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort")
      .eq("roll_number", parsed.rollNumber)
      .limit(1);

    const { data, error } = await query;
    if (error) throw error;

    const student = data?.[0] ?? null;
    if (!student) {
      return NextResponse.json({ error: "No student found with this roll number. Please register first." }, { status: 404 });
    }

    if (parsed.email && student.email && parsed.email.toLowerCase() !== String(student.email).toLowerCase()) {
      return NextResponse.json({ error: "Email does not match this roll number." }, { status: 401 });
    }

    return NextResponse.json({ student }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
