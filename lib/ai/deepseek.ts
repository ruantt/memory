import OpenAI from "openai";
import {
  DeepSeekConfigError,
  getRequiredDeepSeekConfig,
} from "@/lib/ai/config";
import {
  buildKnowledgeEnrichMessages,
  buildWebpageSummaryMessages,
  buildWorkspaceChatMessages,
  buildWorkspaceGenerateMessages,
} from "@/lib/ai/prompts";

const MAX_WEBPAGE_SNIPPET_LENGTH = 5000;

type EnrichKnowledgeInput = {
  content: string;
  topic?: string;
  title?: string;
  tags?: string[];
  availableTopics?: string[];
};

type WebpageSummaryInput = {
  url: string;
  extractedTitle?: string;
  content: string;
};

type WorkspaceChatInput = {
  question: string;
  sourceContext: string;
};

type WorkspaceGenerateInput = {
  mode: "summary" | "prd";
  sourceContext: string;
};

export type EnrichedKnowledge = {
  title: string;
  summary: string;
  tags: string[];
  topic: string;
};

export type WebpageSummary = {
  title: string;
  summary: string;
  tags: string[];
};

export type WorkspaceChatResult = {
  answer: string;
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
  const firstLine = normalized.split(/[。！？?!]/)[0]?.trim() || normalized;

  if (!firstLine) {
    return "未命名资料";
  }

  return truncateText(firstLine, 24) || "未命名资料";
}

function fallbackSummary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "暂无摘要。";
  }

  return truncateText(normalized, 100) || "暂无摘要。";
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
    { keyword: "网页", tag: "网页资料" },
  ];

  keywordMap.forEach(({ keyword, tag }) => {
    if (normalized.includes(keyword) && nextTags.size < 4) {
      nextTags.add(tag);
    }
  });

  nextTags.add("资料整理");

  return Array.from(nextTags).slice(0, 4);
}

function normalizeStringArray(values: unknown) {
  const resolvedValues = Array.isArray(values) ? values : [];

  return Array.from(
    new Set(
      resolvedValues
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeTagArray(tags: unknown) {
  return normalizeStringArray(tags);
}

function normalizeTopicValue(topic: unknown) {
  return typeof topic === "string" ? topic.trim() : "";
}

function findMatchingTopic(candidate: string, availableTopics: string[]) {
  const normalizedCandidate = candidate.trim().toLowerCase();

  if (!normalizedCandidate) {
    return "";
  }

  return (
    availableTopics.find(
      (availableTopic) => availableTopic.trim().toLowerCase() === normalizedCandidate
    ) || ""
  );
}

function findMentionedTopicInContent(content: string, availableTopics: string[]) {
  const normalizedContent = content.toLowerCase();

  return (
    availableTopics.find((availableTopic) =>
      normalizedContent.includes(availableTopic.trim().toLowerCase())
    ) || ""
  );
}

function resolveTopic({
  userTopic,
  modelTopic,
  modelTags,
  availableTopics,
  content,
}: {
  userTopic?: string;
  modelTopic: unknown;
  modelTags: unknown;
  availableTopics: string[];
  content: string;
}) {
  const normalizedUserTopic = userTopic?.trim();

  if (normalizedUserTopic) {
    return normalizedUserTopic;
  }

  const normalizedAvailableTopics = normalizeStringArray(availableTopics);
  const normalizedModelTopic = normalizeTopicValue(modelTopic);
  const normalizedModelTags = normalizeTagArray(modelTags);
  const fallbackTopicCandidates = fallbackTags(content);

  for (const candidate of [
    normalizedModelTopic,
    ...normalizedModelTags,
    ...fallbackTopicCandidates,
  ]) {
    const matchedTopic = findMatchingTopic(candidate, normalizedAvailableTopics);

    if (matchedTopic) {
      return matchedTopic;
    }
  }

  const mentionedTopic = findMentionedTopicInContent(content, normalizedAvailableTopics);

  if (mentionedTopic) {
    return mentionedTopic;
  }

  return (
    normalizedModelTopic ||
    normalizedModelTags[0] ||
    fallbackTopicCandidates.find((tag) => tag !== "资料整理") ||
    truncateText(fallbackTitle(content), 12) ||
    "快速记录"
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
  availableTopics,
}: EnrichKnowledgeInput): Promise<EnrichedKnowledge> {
  const trimmedContent = content.trim();
  const trimmedTopic = topic?.trim();
  const trimmedTitle = title?.trim();
  const normalizedUserTags = normalizeTagArray(tags).slice(0, 4);
  const normalizedAvailableTopics = normalizeStringArray(availableTopics);

  const completion = await createChatCompletion({
    temperature: 0.3,
    maxTokens: 500,
    responseFormat: { type: "json_object" },
    messages: buildKnowledgeEnrichMessages({
      content: trimmedContent,
      topic: trimmedTopic,
      title: trimmedTitle,
      tags: normalizedUserTags,
      availableTopics: normalizedAvailableTopics,
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
  const resolvedTopic = resolveTopic({
    userTopic: trimmedTopic,
    modelTopic: parsed?.topic,
    modelTags: parsed?.tags,
    availableTopics: normalizedAvailableTopics,
    content: trimmedContent,
  });
  const resolvedTags = mergeTags({
    userTags: normalizedUserTags,
    modelTags: parsed?.tags,
    topic: resolvedTopic,
    content: trimmedContent,
  });

  return {
    title: resolvedTitle,
    summary,
    tags: resolvedTags,
    topic: resolvedTopic,
  };
}

export async function summarizeWebpageWithDeepSeek({
  url,
  extractedTitle,
  content,
}: WebpageSummaryInput): Promise<WebpageSummary> {
  const trimmedContent = content.trim();
  const trimmedTitle = extractedTitle?.trim();

  const completion = await createChatCompletion({
    temperature: 0.3,
    maxTokens: 450,
    responseFormat: { type: "json_object" },
    messages: buildWebpageSummaryMessages({
      url: url.trim(),
      extractedTitle: trimmedTitle,
      content: truncateText(trimmedContent, MAX_WEBPAGE_SNIPPET_LENGTH),
    }),
  });

  const contentText = completion.choices[0]?.message?.content?.trim() || "";
  const parsed = safeParseJson(contentText);

  return {
    title:
      (typeof parsed?.title === "string" ? parsed.title.trim() : "") ||
      trimmedTitle ||
      fallbackTitle(trimmedContent),
    summary:
      (typeof parsed?.summary === "string" ? parsed.summary.trim() : "") ||
      fallbackSummary(trimmedContent),
    tags: mergeTags({
      userTags: [],
      modelTags: parsed?.tags,
      content: trimmedContent,
    }),
  };
}

export async function answerWorkspaceChatWithDeepSeek({
  question,
  sourceContext,
}: WorkspaceChatInput): Promise<WorkspaceChatResult> {
  const trimmedQuestion = question.trim();
  const trimmedSourceContext = sourceContext.trim();

  if (!trimmedSourceContext) {
    return {
      answer: "当前资料不足，暂时无法生成有效回答。",
    };
  }

  const completion = await createChatCompletion({
    temperature: 0.3,
    maxTokens: 900,
    messages: buildWorkspaceChatMessages({
      question: trimmedQuestion,
      sourceContext: trimmedSourceContext,
    }),
  });

  return {
    answer:
      completion.choices[0]?.message?.content?.trim() ||
      "根据当前资料，暂时无法生成有效回答。",
  };
}

export async function generateWorkspaceContentWithDeepSeek({
  mode,
  sourceContext,
}: WorkspaceGenerateInput): Promise<WorkspaceGenerateResult> {
  const trimmedSourceContext = sourceContext.trim();

  if (!trimmedSourceContext) {
    return {
      content: "当前资料不足，暂时无法生成内容。",
    };
  }

  const completion = await createChatCompletion({
    temperature: 0.4,
    maxTokens: 1200,
    messages: buildWorkspaceGenerateMessages({
      mode,
      sourceContext: trimmedSourceContext,
    }),
  });

  return {
    content:
      completion.choices[0]?.message?.content?.trim() ||
      "根据当前资料，暂时无法生成内容。",
  };
}
