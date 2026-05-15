import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("v_student_attempt_summary")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const attemptsRaw = data ?? [];
    const attemptsMap = new Map<string, any>();
    for (const a of attemptsRaw) {
      const key = String(a.attempt_id);
      const existing = attemptsMap.get(key);
      if (!existing) {
        attemptsMap.set(key, a);
        continue;
      }
      const existingTs = new Date(existing.created_at).getTime();
      const currentTs = new Date(a.created_at).getTime();
      if (currentTs > existingTs) {
        attemptsMap.set(key, a);
      }
    }
    const attempts = Array.from(attemptsMap.values());

    return NextResponse.json({ attempts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch history" }, { status: 400 });
  }
}
