import { NextResponse } from "next/server";
import {
  DeepSeekConfigError,
  answerWorkspaceChatWithDeepSeek,
} from "@/lib/ai/deepseek";
import type { WorkspaceSource } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { question, selectedSources } = (await request.json()) as {
      question?: string;
      selectedSources?: WorkspaceSource[];
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "请输入问题。" }, { status: 400 });
    }

    const result = await answerWorkspaceChatWithDeepSeek({
      question,
      selectedSources: Array.isArray(selectedSources) ? selectedSources : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof DeepSeekConfigError
        ? error.message
        : "问答失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
