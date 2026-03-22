import { NextResponse } from "next/server";
import { fetchWebpage } from "@/lib/web/fetch";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as {
      url?: string;
    };

    if (!url?.trim()) {
      return NextResponse.json({ error: "请输入网页链接。" }, { status: 400 });
    }

    const result = await fetchWebpage(url, {
      summarizeWithAI: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "网页解析失败，请稍后再试。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
