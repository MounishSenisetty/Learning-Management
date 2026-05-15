import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), "Results", "personalised_recommendations.csv");
    const raw = await fs.readFile(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return NextResponse.json([], { status: 200 });

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = cols[i] ?? "";
      });
      return obj;
    });

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: "Failed to read recommendations" }, { status: 500 });
  }
}
