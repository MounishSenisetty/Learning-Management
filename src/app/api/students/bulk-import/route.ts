import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const bulkImportSchema = z.object({
  students: z.array(
    z.object({
      fullName: z.string().min(1),
      rollNumber: z.string().min(1),
      pin: z.string().min(1),
      email: z.string().email().optional(),
      age: z.number().int().min(10).max(100).optional(),
      gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
      program: z.string().optional(),
      yearOfStudy: z.number().int().min(1).max(12).optional(),
      institution: z.string().optional(),
      priorLabExperience: z.boolean().optional(),
      cohort: z.string().optional(),
    })
  ).min(1),
});

function hashPin(pin: string): string {
  const crypto = require("node:crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to process bulk import");
  }
  return "Failed to process bulk import";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bulkImportSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const results = [];
    const errors = [];

    for (let i = 0; i < parsed.students.length; i++) {
      try {
        const student = parsed.students[i];
        const normalizedRollNumber = student.rollNumber.trim().toUpperCase();
        const pinHash = hashPin(student.pin);

        // Check if student already exists
        const { data: existing, error: fetchError } = await supabase
          .from("students")
          .select("id")
          .eq("roll_number", normalizedRollNumber)
          .eq("pin", pinHash)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          errors.push({
            index: i,
            rollNumber: student.rollNumber,
            error: "Student with this roll number and PIN already exists",
          });
          continue;
        }

        const payload = {
          full_name: student.fullName,
          roll_number: normalizedRollNumber,
          pin: pinHash,
          email: student.email || null,
          age: student.age || null,
          gender: student.gender || null,
          program: student.program || null,
          year_of_study: student.yearOfStudy || null,
          institution: student.institution || null,
          prior_lab_experience: student.priorLabExperience || false,
          cohort: student.cohort || null,
        };

        const { data, error } = await supabase
          .from("students")
          .insert(payload)
          .select("id, full_name, roll_number, email, student_code")
          .single();

        if (error) throw error;

        results.push({
          index: i,
          ...data,
          status: "success",
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(
      {
        imported: results.length,
        failed: errors.length,
        total: parsed.students.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: errors.length > 0 ? 207 : 201 } // 207 Multi-Status if partial failure
    );
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
