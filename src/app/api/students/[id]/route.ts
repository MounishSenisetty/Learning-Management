import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomBytes, scryptSync } from "node:crypto";

const updateStudentSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  age: z.number().int().min(10).max(100).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  program: z.string().optional(),
  yearOfStudy: z.number().int().min(1).max(12).optional(),
  institution: z.string().optional(),
  priorLabExperience: z.boolean().optional(),
  cohort: z.string().optional(),
  pin: z.string().min(1).optional(),
});

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to process student");
  }
  return "Failed to process student";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({ student: data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStudentSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const payload: Record<string, unknown> = {};

    if (parsed.fullName) payload.full_name = parsed.fullName;
    if (parsed.email) payload.email = parsed.email;
    if (parsed.age !== undefined) payload.age = parsed.age;
    if (parsed.gender) payload.gender = parsed.gender;
    if (parsed.program) payload.program = parsed.program;
    if (parsed.yearOfStudy !== undefined) payload.year_of_study = parsed.yearOfStudy;
    if (parsed.institution) payload.institution = parsed.institution;
    if (parsed.priorLabExperience !== undefined) payload.prior_lab_experience = parsed.priorLabExperience;
    if (parsed.cohort) payload.cohort = parsed.cohort;
    if (parsed.pin) payload.pin = hashPin(parsed.pin);

    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select("id, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort, student_code")
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({ student: data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
