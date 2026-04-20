import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { studentLoginSchema } from "@/lib/validation";

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
    return String((error as { message?: unknown }).message ?? "Failed to login student");
  }
  return "Failed to login student";
}

function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;

  const providedHash = scryptSync(pin, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const providedBuffer = Buffer.from(providedHash, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = studentLoginSchema.parse(body);
    const supabase = getSupabaseAdmin();
    const normalizedRollNumber = parsed.rollNumber.trim().toUpperCase();

    const query = supabase
      .from("students")
      .select("id, full_name, roll_number, email, age, gender, program, year_of_study, institution, prior_lab_experience, cohort, pin_hash")
      .eq("roll_number", normalizedRollNumber)
      .limit(1);

    const { data, error } = await query;
    if (error) throw error;

    const student = data?.[0] ?? null;
    if (!student) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const studentRecord = student as { pin_hash?: string | null };
    const pinHash = String(studentRecord.pin_hash ?? "");
    if (!pinHash) {
      return NextResponse.json(
        {
          error: "This account needs PIN setup before login.",
          code: "LEGACY_PIN_SETUP_REQUIRED",
        },
        { status: 428 },
      );
    }

    if (!verifyPin(parsed.pin, pinHash)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    return NextResponse.json({ student: withStudentCode(student) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
