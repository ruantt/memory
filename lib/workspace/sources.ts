import type { Citation, WorkspaceSource } from "@/lib/types";

const MAX_SOURCE_SNIPPET_LENGTH = 1200;
const MIN_LOCAL_TEXT_LENGTH = 320;
const MIN_LOCAL_TEXT_LENGTH_WITHOUT_KEYWORD_HIT = 1200;
const QUESTION_STOPWORDS = new Set([
  "什么",
  "怎么",
  "如何",
  "为什么",
  "是不是",
  "是否",
  "可以",
  "需要",
  "应该",
  "一下",
  "一下子",
  "请问",
  "关于",
  "有关",
  "这个",
  "那个",
  "哪些",
  "哪个",
  "以及",
  "还有",
  "then",
  "with",
  "that",
  "this",
  "what",
  "when",
  "where",
  "which",
  "would",
  "should",
  "could",
]);

export type WebSupplementSource = {
  id: string;
  title: string;
  url: string;
  summary: string;
  content: string;
  tags: string[];
  source: string;
  provider: string;
  snippetOnly?: boolean;
};

export type WorkspaceSourceAssessment = {
  isInsufficient: boolean;
  reason: string;
};

function normalizeText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string | undefined, maxLength: number) {
  const normalized = normalizeText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function hasUsableSourceContent(source: WorkspaceSource) {
  if (source.type === "knowledge") {
    return Boolean(normalizeText(source.content || source.summary));
  }

  if (source.type === "link") {
    return source.status === "ready" && Boolean(normalizeText(source.content));
  }

  return false;
}

function getSourceAssessmentText(source: WorkspaceSource) {
  if (source.type === "knowledge") {
    return normalizeText(
      [source.title, source.summary, source.content, source.topic, source.tags?.join(" ")]
        .filter(Boolean)
        .join(" ")
    );
  }

  if (source.type === "link" && source.status === "ready") {
    return normalizeText(
      [source.title, source.summary, source.content, source.tags.join(" ")]
        .filter(Boolean)
        .join(" ")
    );
  }

  return "";
}

function getLocalSourceLabel(source: WorkspaceSource) {
  if (source.type === "knowledge") {
    return "本地知识库";
  }

  if (source.type === "file") {
    return "本地资料";
  }

  return "网页链接";
}

function formatLocalSourceContext(source: WorkspaceSource, index: number) {
  const baseLines = [
    `资料 ${index + 1}`,
    "来源范围: 本地资料",
    `来源类型: ${getLocalSourceLabel(source)}`,
    `ID: ${source.id}`,
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
    baseLines.push("可用信息: 仅文件元信息，未解析文件正文。");
  }

  if (source.type === "link") {
    baseLines.push(`链接: ${source.url}`);

    if (source.status === "loading") {
      baseLines.push("可用信息: 网页正在解析中，正文尚不可用。");
    } else if (source.status === "error") {
      baseLines.push(
        `可用信息: 网页解析失败。${source.errorMessage ? `原因：${source.errorMessage}` : ""}`
      );
    } else {
      baseLines.push(
        `正文: ${truncateText(
          source.content || source.summary,
          MAX_SOURCE_SNIPPET_LENGTH
        )}`
      );
    }
  }

  return baseLines.join("\n");
}

function formatWebSourceContext(source: WebSupplementSource, index: number) {
  const baseLines = [
    `资料 ${index + 1}`,
    "来源范围: 联网补充",
    "来源类型: 联网搜索结果",
    `ID: ${source.id}`,
    `标题: ${source.title}`,
    `链接: ${source.url}`,
    `结果来源: ${source.source}`,
    `搜索提供方: ${source.provider}`,
  ];

  if (source.tags.length > 0) {
    baseLines.push(`标签: ${source.tags.join("、")}`);
  }

  if (source.summary) {
    baseLines.push(`摘要: ${truncateText(source.summary, 220)}`);
  }

  if (source.snippetOnly) {
    baseLines.push("可用信息: 网页正文抓取失败，仅保留搜索结果摘要。");
  }

  baseLines.push(`正文: ${truncateText(source.content, MAX_SOURCE_SNIPPET_LENGTH)}`);

  return baseLines.join("\n");
}

function createLocalCitation(source: WorkspaceSource): Citation {
  return {
    id: source.id,
    title: source.title,
    scope: "local",
    sourceType: source.type,
    ...(source.type === "link" ? { url: source.url } : {}),
  };
}

function createWebCitation(source: WebSupplementSource): Citation {
  return {
    id: source.id,
    title: source.title,
    scope: "web",
    sourceType: "web",
    url: source.url,
  };
}

function extractQuestionKeywords(question: string) {
  const englishWords = question.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [];
  const chineseSegments = question.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const chineseWords = chineseSegments.flatMap((segment) => {
    if (segment.length <= 4) {
      return [segment];
    }

    const tokens = new Set<string>();

    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index + size <= segment.length; index += 1) {
        tokens.add(segment.slice(index, index + size));
      }
    }

    return Array.from(tokens);
  });

  return Array.from(new Set([...englishWords, ...chineseWords])).filter(
    (token) => !QUESTION_STOPWORDS.has(token)
  );
}

export function buildWorkspaceSourceContext({
  localSources,
  webSources = [],
}: {
  localSources: WorkspaceSource[];
  webSources?: WebSupplementSource[];
}) {
  const sections: string[] = [];

  if (localSources.length > 0) {
    sections.push(
      ["本地资料：", ...localSources.map(formatLocalSourceContext)].join("\n\n")
    );
  }

  if (webSources.length > 0) {
    sections.push(
      ["联网补充：", ...webSources.map(formatWebSourceContext)].join("\n\n")
    );
  }

  return sections.join("\n\n");
}

export function buildWorkspaceCitations({
  localSources,
  webSources = [],
}: {
  localSources: WorkspaceSource[];
  webSources?: WebSupplementSource[];
}) {
  const citations = [
    ...localSources.map(createLocalCitation),
    ...webSources.map(createWebCitation),
  ];

  return Array.from(new Map(citations.map((citation) => [citation.id, citation])).values());
}

export function assessWorkspaceSources({
  selectedSources,
  question,
}: {
  selectedSources: WorkspaceSource[];
  question?: string;
}): WorkspaceSourceAssessment {
  if (selectedSources.length === 0) {
    return {
      isInsufficient: true,
      reason: "当前资料为空，缺少可直接使用的本地资料。",
    };
  }

  const usableSources = selectedSources.filter(hasUsableSourceContent);
  const pendingLinkCount = selectedSources.filter(
    (source) => source.type === "link" && source.status === "loading"
  ).length;
  const hasOnlyMetadata =
    usableSources.length === 0 &&
    selectedSources.some(
      (source) =>
        source.type === "file" ||
        (source.type === "link" && source.status !== "ready")
    );

  if (usableSources.length === 0) {
    if (pendingLinkCount > 0) {
      return {
        isInsufficient: true,
        reason: "当前网页仍在解析中，暂时还没有可用于回答的正文内容。",
      };
    }

    if (hasOnlyMetadata) {
      return {
        isInsufficient: true,
        reason: "当前资料主要是文件元信息或未解析网页，缺少可直接用于回答的正文。",
      };
    }

    return {
      isInsufficient: true,
      reason: "当前资料不足，缺少可直接用于回答的正文内容。",
    };
  }

  const combinedText = normalizeText(
    usableSources.map(getSourceAssessmentText).filter(Boolean).join("\n")
  );

  if (combinedText.length < MIN_LOCAL_TEXT_LENGTH) {
    return {
      isInsufficient: true,
      reason: "当前资料正文较少，可能不足以支撑稳定回答。",
    };
  }

  if (question?.trim()) {
    const keywords = extractQuestionKeywords(question.trim());

    if (keywords.length > 0 && combinedText.length < MIN_LOCAL_TEXT_LENGTH_WITHOUT_KEYWORD_HIT) {
      const normalizedText = combinedText.toLowerCase();
      const matchedKeywordCount = keywords.filter((keyword) =>
        normalizedText.includes(keyword.toLowerCase())
      ).length;

      if (matchedKeywordCount === 0) {
        return {
          isInsufficient: true,
          reason: "当前资料与问题的直接关联较弱，可能无法稳定回答。",
        };
      }
    }
  }

  return {
    isInsufficient: false,
    reason: "",
  };
}
