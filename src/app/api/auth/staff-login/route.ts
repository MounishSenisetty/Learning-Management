import { NextResponse } from "next/server";

interface StaffLoginBody {
  role?: "teacher" | "admin";
  username?: string;
  password?: string;
}

function unauthorized() {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
