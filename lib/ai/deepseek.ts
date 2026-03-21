import OpenAI from "openai";
import {
  DeepSeekConfigError,
  getRequiredDeepSeekConfig,
} from "@/lib/ai/config";
import {
  buildKnowledgeEnrichMessages,
  buildWorkspaceChatMessages,
  buildWorkspaceGenerateMessages,
} from "@/lib/ai/prompts";
import type { Citation, WorkspaceSource } from "@/lib/types";

const MAX_SOURCE_SNIPPET_LENGTH = 1200;

type EnrichKnowledgeInput = {
  content: string;
  topic?: string;
  title?: string;
  tags?: string[];
};

type WorkspaceChatInput = {
  question: string;
  selectedSources: WorkspaceSource[];
};

type WorkspaceGenerateInput = {
  mode: "summary" | "prd";
  selectedSources: WorkspaceSource[];
};

export type EnrichedKnowledge = {
  title: string;
  summary: string;
  tags: string[];
};

export type WorkspaceChatResult = {
  answer: string;
  citations: Citation[];
};

export type WorkspaceGenerateResult = {
  content: string;
};

export { DeepSeekConfigError };

function createDeepSeekClient() {
  const { apiKey, baseURL } = getRequiredDeepSeekConfig();

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function isReasonerModel(model: string) {
  return model.toLowerCase().includes("reasoner");
}

function truncateText(value: string | undefined, maxLength: number) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function stripMarkdownFences(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeParseJson(value: string) {
  const normalized = stripMarkdownFences(value);

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function fallbackTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const firstLine = normalized.split(/[。！？!?]/)[0]?.trim() || normalized;

  if (!firstLine) {
    return "未命名知识";
  }

  return truncateText(firstLine, 18) || "未命名知识";
}

function fallbackSummary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "暂无摘要。";
  }

  return truncateText(normalized, 88) || "暂无摘要。";
}

function fallbackTags(content: string, topic?: string) {
  const nextTags = new Set<string>();
  const normalized = content.toLowerCase();

  if (topic?.trim()) {
    nextTags.add(topic.trim());
  }

  const keywordMap = [
    { keyword: "用户", tag: "用户研究" },
    { keyword: "访谈", tag: "访谈" },
    { keyword: "prd", tag: "PRD" },
    { keyword: "产品", tag: "产品规划" },
    { keyword: "竞品", tag: "竞品分析" },
    { keyword: "ai", tag: "AI" },
    { keyword: "总结", tag: "总结" },
  ];

  keywordMap.forEach(({ keyword, tag }) => {
    if (normalized.includes(keyword) && nextTags.size < 4) {
      nextTags.add(tag);
    }
  });

  nextTags.add("知识整理");

  return Array.from(nextTags).slice(0, 4);
}

function normalizeTagArray(tags: unknown) {
  const values = Array.isArray(tags) ? tags : [];

  return Array.from(
    new Set(
      values
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter(Boolean)
    )
  );
}

function mergeTags({
  userTags,
  modelTags,
  topic,
  content,
}: {
  userTags: string[];
  modelTags: unknown;
  topic?: string;
  content: string;
}) {
  const merged = Array.from(
    new Set([
      ...userTags,
      ...normalizeTagArray(modelTags),
      ...fallbackTags(content, topic),
    ])
  );

  return merged.slice(0, 4);
}

function buildSourceContext(selectedSources: WorkspaceSource[]) {
  return selectedSources
    .map((source, index) => {
      const baseLines = [
        `资料 ${index + 1}`,
        `ID: ${source.id}`,
        `类型: ${source.type}`,
        `标题: ${source.title}`,
      ];

      if (source.topic) {
        baseLines.push(`主题: ${source.topic}`);
      }

      if (source.tags?.length) {
        baseLines.push(`标签: ${source.tags.join("、")}`);
      }

      if (source.summary) {
        baseLines.push(`摘要: ${truncateText(source.summary, 220)}`);
      }

      if (source.type === "knowledge") {
        baseLines.push(
          `正文: ${truncateText(
            source.content ?? source.summary ?? "",
            MAX_SOURCE_SNIPPET_LENGTH
          )}`
        );
      }

      if (source.type === "file") {
        baseLines.push(`文件类型: ${source.fileMeta.type}`);
        baseLines.push(`文件大小: ${source.fileMeta.size}`);
        baseLines.push("可用信息: 仅文件元信息，未解析文件正文");
      }

      if (source.type === "link") {
        baseLines.push(`链接: ${source.url}`);
        baseLines.push("可用信息: 仅链接标题和 URL，未抓取网页正文");
      }

      return baseLines.join("\n");
    })
    .join("\n\n");
}

function buildDefaultCitations(selectedSources: WorkspaceSource[]) {
  return Array.from(
    new Map(selectedSources.map(({ id, title }) => [id, { id, title }])).values()
  );
}

async function createChatCompletion({
  messages,
  temperature,
  maxTokens,
  responseFormat,
}: {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  maxTokens: number;
  responseFormat?: { type: "json_object" };
}) {
  const client = createDeepSeekClient();
  const { model } = getRequiredDeepSeekConfig();

  return client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    ...(isReasonerModel(model) ? {} : { temperature }),
    ...(responseFormat ? { response_format: responseFormat } : {}),
  });
}

export async function enrichKnowledgeWithDeepSeek({
  content,
  topic,
  title,
  tags,
}: EnrichKnowledgeInput): Promise<EnrichedKnowledge> {
  const trimmedContent = content.trim();
  const trimmedTopic = topic?.trim();
  const trimmedTitle = title?.trim();
  const normalizedUserTags = normalizeTagArray(tags).slice(0, 4);

  const completion = await createChatCompletion({
    temperature: 0.3,
    maxTokens: 500,
    responseFormat: { type: "json_object" },
    messages: buildKnowledgeEnrichMessages({
      content: trimmedContent,
      topic: trimmedTopic,
      title: trimmedTitle,
      tags: normalizedUserTags,
    }),
  });

  const contentText = completion.choices[0]?.message?.content?.trim() || "";
  const parsed = safeParseJson(contentText);
  const resolvedTitle =
    trimmedTitle ||
    (typeof parsed?.title === "string" ? parsed.title.trim() : "") ||
    fallbackTitle(trimmedContent);
  const summary =
    (typeof parsed?.summary === "string" ? parsed.summary.trim() : "") ||
    fallbackSummary(trimmedContent);
  const resolvedTags = mergeTags({
    userTags: normalizedUserTags,
    modelTags: parsed?.tags,
    topic: trimmedTopic,
    content: trimmedContent,
  });

  return {
    title: resolvedTitle,
    summary,
    tags: resolvedTags,
  };
}

export async function answerWorkspaceChatWithDeepSeek({
  question,
  selectedSources,
}: WorkspaceChatInput): Promise<WorkspaceChatResult> {
  const trimmedQuestion = question.trim();

  if (selectedSources.length === 0) {
    return {
      answer: "当前还没有选中任何资料，暂时无法基于资料回答。请先在左侧添加资料后再提问。",
      citations: [],
    };
  }

  const completion = await createChatCompletion({
    temperature: 0.3,
    maxTokens: 900,
    messages: buildWorkspaceChatMessages({
      question: trimmedQuestion,
      sourceContext: buildSourceContext(selectedSources),
    }),
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ||
    "根据当前已选资料，暂时无法生成有效回答。";

  return {
    answer,
    citations: buildDefaultCitations(selectedSources),
  };
}

export async function generateWorkspaceContentWithDeepSeek({
  mode,
  selectedSources,
}: WorkspaceGenerateInput): Promise<WorkspaceGenerateResult> {
  if (selectedSources.length === 0) {
    return {
      content: "当前还没有选中任何资料，暂时无法生成内容。请先在左侧添加资料。",
    };
  }

  const completion = await createChatCompletion({
    temperature: 0.4,
    maxTokens: 1200,
    messages: buildWorkspaceGenerateMessages({
      mode,
      sourceContext: buildSourceContext(selectedSources),
    }),
  });

  return {
    content:
      completion.choices[0]?.message?.content?.trim() ||
      "根据当前资料，暂时无法生成内容。",
  };
}
