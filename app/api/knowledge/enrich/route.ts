import { NextResponse } from "next/server";
import {
  DeepSeekConfigError,
  enrichKnowledgeWithDeepSeek,
} from "@/lib/ai/deepseek";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { content, topic, title, tags } = (await request.json()) as {
      content?: string;
      topic?: string;
      title?: string;
      tags?: string[];
    };

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "缺少需要整理的内容。" },
        { status: 400 }
      );
    }

    const result = await enrichKnowledgeWithDeepSeek({
      content,
      topic,
      title,
      tags: Array.isArray(tags)
        ? tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof DeepSeekConfigError
        ? error.message
        : "AI 整理失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
