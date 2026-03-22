import { NextResponse } from "next/server";
import { DeepSeekConfigError } from "@/lib/ai/deepseek";
import type { WorkspaceSource } from "@/lib/types";
import { answerWorkspaceQuestion } from "@/lib/workspace/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { question, selectedSources, allowWebFallback } = (await request.json()) as {
      question?: string;
      selectedSources?: WorkspaceSource[];
      allowWebFallback?: boolean;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "请输入问题。" }, { status: 400 });
    }

    const result = await answerWorkspaceQuestion({
      question,
      selectedSources: Array.isArray(selectedSources) ? selectedSources : [],
      allowWebFallback: Boolean(allowWebFallback),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof DeepSeekConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "问答失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
