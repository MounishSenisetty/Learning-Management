import { NextResponse } from "next/server";
import { scryptSync } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

interface StaffLoginBody {
  role?: "teacher" | "admin";
  username?: string;
  password?: string;
}

function unauthorized() {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

function verifyPassword(inputPassword: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const computedHash = scryptSync(inputPassword, salt, 64).toString("hex");
    return computedHash === hash;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StaffLoginBody;
    const role = body.role;
    const username = (body.username ?? "").trim();
    const password = (body.password ?? "").trim();

    if (!role || !username || !password) {
      return unauthorized();
    }

    const supabase = getSupabaseAdmin();

    // First try database credentials
    const { data: staffData, error: dbError } = await supabase
      .from("staff_credentials")
      .select("id, username, role, full_name, email, is_active")
      .eq("username", username)
      .eq("role", role)
      .eq("is_active", true)
      .maybeSingle();

    if (!dbError && staffData) {
      // Get password hash
      const { data: authData } = await supabase
        .from("staff_credentials")
        .select("password_hash")
        .eq("id", staffData.id)
        .single();

      if (authData && verifyPassword(password, authData.password_hash)) {
        // Update last login
        await supabase.from("staff_credentials").update({ last_login: new Date().toISOString() }).eq("id", staffData.id);

        return NextResponse.json({
          staff: {
            id: staffData.id,
            role: staffData.role,
            username: staffData.username,
            fullName: staffData.full_name,
          },
        });
      }
    }

    // Fallback to environment variables (for initial setup)
    const expectedUsername =
      role === "teacher"
        ? process.env.TEACHER_USERNAME ?? "teacher"
        : process.env.ADMIN_USERNAME ?? "admin";

    const expectedPassword =
      role === "teacher"
        ? process.env.TEACHER_PASSWORD ?? "teacher123"
        : process.env.ADMIN_PASSWORD ?? "admin123";

    if (username !== expectedUsername || password !== expectedPassword) {
      return unauthorized();
    }

    return NextResponse.json({ staff: { role, username } });
  } catch {
    return unauthorized();
  }
}
