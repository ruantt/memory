import { NextResponse } from "next/server";
import { DeepSeekConfigError } from "@/lib/ai/deepseek";
import type { WorkspaceSource } from "@/lib/types";
import { generateWorkspaceResult } from "@/lib/workspace/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { mode, selectedSources, allowWebFallback } = (await request.json()) as {
      mode?: "summary" | "prd";
      selectedSources?: WorkspaceSource[];
      allowWebFallback?: boolean;
    };

    if (mode !== "summary" && mode !== "prd") {
      return NextResponse.json(
        { error: "生成模式无效。" },
        { status: 400 }
      );
    }

    const result = await generateWorkspaceResult({
      mode,
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
          : "生成失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
