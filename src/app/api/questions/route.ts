import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultQuestions } from "@/lib/questions";
import { getSupabaseAdmin } from "@/lib/supabase";

const moduleSchema = z.enum(["pre-test", "post-test"]);
const experimentTypeSchema = z.enum(["ECG", "EMG"]);
const sectionSchema = z.enum(["equipment", "preparation", "calibration", "recording", "analysis"]);

const questionSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    section: sectionSchema,
    text: z.string().trim().min(1).max(1200),
    options: z.array(z.string().trim().min(1).max(600)).min(2).max(8),
    answerIndex: z.number().int().min(0),
    hint: z.string().trim().max(500).optional(),
  })
  .superRefine((question, ctx) => {
    if (question.answerIndex >= question.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "answerIndex must point to one of the provided options",
        path: ["answerIndex"],
      });
    }
  });

const getQuerySchema = z.object({
  experimentType: experimentTypeSchema,
  module: moduleSchema,
});

const updateQuestionsSchema = z.object({
  experimentType: experimentTypeSchema,
  module: moduleSchema,
  questions: z.array(questionSchema).min(1).max(50),
});

interface SupabaseLikeError {
  code?: string;
  message?: string;
}

function isMissingQuestionBanksTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as SupabaseLikeError;
  const code = candidate.code ?? "";
  const message = (candidate.message ?? "").toLowerCase();

  return (
    code === "PGRST205" ||
    message.includes("question_banks") ||
    message.includes("could not find the table") ||
    message.includes("relation \"question_banks\" does not exist")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Failed to process question request");
  }
  return "Failed to process question request";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = getQuerySchema.parse({
      experimentType: searchParams.get("experimentType"),
      module: searchParams.get("module"),
    });

    const fallbackQuestions = getDefaultQuestions(parsedQuery.experimentType, parsedQuery.module);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("question_banks")
      .select("questions")
      .eq("experiment_type", parsedQuery.experimentType)
      .eq("module", parsedQuery.module)
      .maybeSingle();

    if (error) {
      if (isMissingQuestionBanksTable(error)) {
        return NextResponse.json({
          experimentType: parsedQuery.experimentType,
          module: parsedQuery.module,
          questions: fallbackQuestions,
          source: "defaults",
          warning: "question_banks table missing; serving default question set",
        });
      }
      throw error;
    }

    const parsedQuestions = z.array(questionSchema).safeParse(data?.questions);
    if (!parsedQuestions.success || parsedQuestions.data.length === 0) {
      return NextResponse.json({
        experimentType: parsedQuery.experimentType,
        module: parsedQuery.module,
        questions: fallbackQuestions,
        source: "defaults",
      });
    }

    return NextResponse.json({
      experimentType: parsedQuery.experimentType,
      module: parsedQuery.module,
      questions: parsedQuestions.data,
      source: "database",
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateQuestionsSchema.parse(body);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("question_banks")
      .upsert(
        {
          experiment_type: parsed.experimentType,
          module: parsed.module,
          questions: parsed.questions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "experiment_type,module" },
      )
      .select("questions")
      .single();

    if (error) {
      if (isMissingQuestionBanksTable(error)) {
        return NextResponse.json(
          {
            error: "Question bank storage is not initialized. Please run the latest Supabase schema (question_banks table) and retry.",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      experimentType: parsed.experimentType,
      module: parsed.module,
      questions: data?.questions ?? parsed.questions,
      message: "Questions updated successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
