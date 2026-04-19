import { NextResponse } from "next/server";
import { randomBytes, scryptSync } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { legacyPinSetupSchema } from "@/lib/validation";

function withStudentCode<T extends Record<string, unknown>>(row: T) {
  const rest = { ...(row as T & { pin_hash?: string | null }) };
  delete rest.pin_hash;
  return {
    ...rest,
    student_code: ((rest as Record<string, unknown>).student_code as string | null | undefined) ?? null,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to setup PIN");
  }
  return "Failed to setup PIN";
}

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = legacyPinSetupSchema.parse(body);
    const normalizedRollNumber = parsed.rollNumber.trim().toUpperCase();
    const normalizedEmail = parsed.email?.trim().toLowerCase() ?? "";
    const normalizedFullName = parsed.fullName?.trim().toLowerCase() ?? "";

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort, pin_hash")
      .eq("roll_number", normalizedRollNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Unable to verify account for PIN setup." }, { status: 401 });
    }

    if (data.pin_hash) {
      return NextResponse.json({ error: "PIN already exists for this account. Please login." }, { status: 409 });
    }

    const storedEmail = String(data.email ?? "").trim().toLowerCase();
    const storedName = String(data.full_name ?? "").trim().toLowerCase();

    const verifiedByEmail = Boolean(storedEmail && normalizedEmail && storedEmail === normalizedEmail);
    const verifiedByName = Boolean(!storedEmail && normalizedFullName && storedName === normalizedFullName);

    if (!verifiedByEmail && !verifiedByName) {
      return NextResponse.json(
        { error: "Unable to verify account for PIN setup. Check your roll number and verification details." },
        { status: 401 },
      );
    }

    const pinHash = hashPin(parsed.pin);

    const { data: updated, error: updateError } = await supabase
      .from("students")
      .update({ pin_hash: pinHash })
      .eq("id", data.id)
      .select("id, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ student: withStudentCode(updated) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
