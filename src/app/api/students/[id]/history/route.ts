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

    return NextResponse.json({ attempts: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch history" }, { status: 400 });
  }
}
