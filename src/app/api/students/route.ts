import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createStudentSchema } from "@/lib/validation";

function generateStudentCode(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `STU-${random}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to create student");
  }
  return "Failed to create student";
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("students")
      .select("id, student_code, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ students: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createStudentSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const payload = {
      full_name: parsed.fullName,
      roll_number: parsed.rollNumber,
      student_code: generateStudentCode(),
      email: parsed.email || null,
      age: parsed.age,
      gender: parsed.gender,
      program: parsed.program,
      year_of_study: parsed.yearOfStudy,
      institution: parsed.institution || null,
      prior_lab_experience: parsed.priorLabExperience,
      cohort: parsed.cohort || null,
    };

    const { data: existing, error: fetchError } = await supabase
      .from("students")
      .select("id, student_code, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort")
      .eq("roll_number", parsed.rollNumber)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      return NextResponse.json({ student: existing }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select("id, student_code, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort")
      .single();

    if (error) throw error;

    return NextResponse.json({ student: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
