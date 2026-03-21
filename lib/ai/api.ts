import type { Citation, WorkspaceSource } from "@/lib/types";

type EnrichKnowledgePayload = {
  content: string;
  topic?: string;
  title?: string;
  tags?: string[];
};

type EnrichKnowledgeResponse = {
  title: string;
  summary: string;
  tags: string[];
};

type WorkspaceChatPayload = {
  question: string;
  selectedSources: WorkspaceSource[];
};

type WorkspaceChatResponse = {
  answer: string;
  citations: Citation[];
};

type WorkspaceGeneratePayload = {
  mode: "summary" | "prd";
  selectedSources: WorkspaceSource[];
};

type WorkspaceGenerateResponse = {
  content: string;
};

async function postJson<TResponse>(
  url: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & TResponse;

  if (!response.ok) {
    throw new Error(data.error || "请求失败，请稍后再试。");
  }

  return data;
}

export function enrichKnowledge(payload: EnrichKnowledgePayload) {
  return postJson<EnrichKnowledgeResponse>("/api/knowledge/enrich", payload);
}

export function chatWithWorkspace(payload: WorkspaceChatPayload) {
  return postJson<WorkspaceChatResponse>("/api/workspace/chat", payload);
}

export function generateWorkspaceContent(payload: WorkspaceGeneratePayload) {
  return postJson<WorkspaceGenerateResponse>("/api/workspace/generate", payload);
}
