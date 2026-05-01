import { NextResponse } from "next/server";
import { scryptSync, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const staffSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: z.enum(["admin", "teacher"]),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
});

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to process staff request");
  }
  return "Failed to process staff request";
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("staff_credentials")
      .select("id, username, role, full_name, email, is_active, last_login, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ staff: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = staffSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const passwordHash = hashPassword(parsed.password);

    const { data, error } = await supabase
      .from("staff_credentials")
      .insert({
        username: parsed.username,
        password_hash: passwordHash,
        role: parsed.role,
        full_name: parsed.fullName || null,
        email: parsed.email || null,
      })
      .select("id, username, role, full_name, email, is_active, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ staff: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
