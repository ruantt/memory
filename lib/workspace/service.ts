import { createHash } from "node:crypto";
import {
  answerWorkspaceChatWithDeepSeek,
  generateWorkspaceContentWithDeepSeek,
} from "@/lib/ai/deepseek";
import type { Citation, WorkspaceSource } from "@/lib/types";
import { fetchWebpage } from "@/lib/web/fetch";
import { webSearch, type WebSearchResult } from "@/lib/web/search";
import {
  assessWorkspaceSources,
  buildWorkspaceCitations,
  buildWorkspaceSourceContext,
  type WebSupplementSource,
} from "@/lib/workspace/sources";

const MAX_WEB_SEARCH_RESULTS = 5;
const MAX_WEB_FETCH_RESULTS = 4;
const SEARCH_LANGUAGE_HINT = "中文";
const SEARCH_TIMEZONE = "Asia/Shanghai";
const SEARCH_STOPWORDS = new Set([
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
  "还有",
  "最近",
  "最新",
  "今天",
  "今日",
  "新闻",
  "消息",
  "发布",
  "最近发布",
  "latest",
  "recent",
  "today",
  "news",
  "release",
]);
const REALTIME_KEYWORDS = [
  "今天",
  "今日",
  "昨天",
  "明天",
  "最近",
  "最新",
  "近期",
  "刚刚",
  "实时",
  "现在",
  "本周",
  "本月",
  "今年",
  "新闻",
  "快讯",
  "天气",
  "股价",
  "汇率",
  "价格",
  "比分",
  "赛程",
  "版本",
  "发布",
  "上线",
  "发布会",
  "latest",
  "recent",
  "today",
  "current",
  "news",
  "weather",
  "release",
  "launch",
];

type WorkspaceTaskBase = {
  selectedSources: WorkspaceSource[];
  allowWebFallback?: boolean;
};

type WorkspaceChatInput = WorkspaceTaskBase & {
  question: string;
};

type WorkspaceGenerateInput = WorkspaceTaskBase & {
  mode: "summary" | "prd";
};

type SearchPlan = {
  queries: string[];
  preferFreshness: boolean;
};

export type WorkspaceChatResponse = {
  answer: string;
  citations: Citation[];
  usedWebFallback: boolean;
  insufficiencyReason?: string;
};

export type WorkspaceGenerateResponse = {
  content: string;
  citations: Citation[];
  usedWebFallback: boolean;
  insufficiencyReason?: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function createWebSourceId(url: string) {
  return `web:${createHash("sha1").update(url).digest("hex").slice(0, 12)}`;
}

function buildLocalOnlyMessage(reason: string) {
  return `${reason} 当前资料不足，请添加资料或开启联网补充。`;
}

function buildWebFallbackUnavailableMessage(reason: string) {
  return `${reason} 已尝试联网补充，但暂未获取到可用网页结果，请补充资料后再试。`;
}

function formatDateToken(offsetDays = 0) {
  const baseDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: SEARCH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(baseDate).reduce<Record<string, string>>(
    (accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    },
    {}
  );
  const year = parts.year ?? "";
  const month = parts.month ?? "";
  const day = parts.day ?? "";

  return {
    iso: `${year}-${month}-${day}`,
    zh: `${year}年${month}月${day}日`,
  };
}

function isLikelyRealtimeRequest(text: string) {
  const normalizedText = text.toLowerCase();

  return REALTIME_KEYWORDS.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );
}

function extractSearchTerms(text: string) {
  const englishWords = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [];
  const chineseSegments = text.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const chineseWords = chineseSegments.flatMap((segment) => {
    if (segment.length <= 4) {
      return [segment];
    }

    const terms = new Set<string>();

    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index + size <= segment.length; index += 1) {
        terms.add(segment.slice(index, index + size));
      }
    }

    return Array.from(terms);
  });

  return dedupeStrings([...englishWords, ...chineseWords]).filter(
    (term) => !SEARCH_STOPWORDS.has(term)
  );
}

function rewriteRelativeDateTerms(question: string) {
  const today = formatDateToken(0);
  const yesterday = formatDateToken(-1);
  const tomorrow = formatDateToken(1);

  return question
    .replace(/今天|今日/g, today.iso)
    .replace(/昨天/g, yesterday.iso)
    .replace(/明天/g, tomorrow.iso);
}

function buildSourceHints(selectedSources: WorkspaceSource[]) {
  const titles = selectedSources.slice(0, 3).map((source) => source.title);
  const topics = selectedSources
    .map((source) => source.topic ?? "")
    .filter(Boolean)
    .slice(0, 2);
  const tags = selectedSources
    .flatMap((source) => source.tags ?? [])
    .filter(Boolean)
    .slice(0, 4);

  return dedupeStrings([...titles, ...topics, ...tags]);
}

function buildSearchQuery(parts: string[]) {
  return normalizeText(dedupeStrings(parts).join(" "));
}

function buildChatSearchPlan(
  question: string,
  selectedSources: WorkspaceSource[]
): SearchPlan {
  const trimmedQuestion = question.trim();
  const sourceHints = buildSourceHints(selectedSources);
  const focusTerms = extractSearchTerms(trimmedQuestion).slice(0, 8);
  const preferFreshness = isLikelyRealtimeRequest(trimmedQuestion);
  const today = formatDateToken(0);
  const rewrittenQuestion = preferFreshness
    ? rewriteRelativeDateTerms(trimmedQuestion)
    : trimmedQuestion;
  const queries = dedupeStrings([
    buildSearchQuery([
      rewrittenQuestion,
      focusTerms.join(" "),
      ...sourceHints.slice(0, 3),
      SEARCH_LANGUAGE_HINT,
      ...(preferFreshness ? [today.iso, "最新"] : []),
    ]),
    buildSearchQuery([
      focusTerms.join(" "),
      ...sourceHints.slice(0, 2),
      SEARCH_LANGUAGE_HINT,
      ...(preferFreshness ? [today.zh, "最新", "最近"] : []),
    ]),
    buildSearchQuery([
      trimmedQuestion,
      ...sourceHints.slice(0, 2),
      SEARCH_LANGUAGE_HINT,
    ]),
  ]);

  return {
    queries,
    preferFreshness,
  };
}

function buildGenerationSearchPlan(
  mode: "summary" | "prd",
  selectedSources: WorkspaceSource[]
): SearchPlan {
  const sourceHints = buildSourceHints(selectedSources);
  const seedText = sourceHints.join(" ");
  const preferFreshness = isLikelyRealtimeRequest(seedText);
  const today = formatDateToken(0);
  const modeHints =
    mode === "prd" ? ["产品需求", "方案", "背景"] : ["总结", "资料", "背景"];
  const queries = dedupeStrings([
    buildSearchQuery([
      ...sourceHints,
      ...modeHints,
      SEARCH_LANGUAGE_HINT,
      ...(preferFreshness ? [today.iso, "最新"] : []),
    ]),
    buildSearchQuery([
      ...sourceHints.slice(0, 3),
      ...modeHints.slice(0, 2),
      SEARCH_LANGUAGE_HINT,
      ...(preferFreshness ? [today.zh, "最近"] : []),
    ]),
  ]);

  return {
    queries,
    preferFreshness,
  };
}

async function executeSearchPlan(searchPlan: SearchPlan) {
  for (const query of searchPlan.queries) {
    if (!query) {
      continue;
    }

    const results = await webSearch(query, MAX_WEB_SEARCH_RESULTS, {
      preferFreshness: searchPlan.preferFreshness,
    });

    if (results.length > 0) {
      return {
        query,
        results,
      };
    }
  }

  return {
    query: searchPlan.queries[0] ?? "",
    results: [] as WebSearchResult[],
  };
}

function createSnippetOnlyWebSource(result: WebSearchResult) {
  const snippet = normalizeText(result.snippet);

  if (!snippet) {
    return null;
  }

  return {
    id: createWebSourceId(result.url),
    title: result.title,
    url: result.url,
    summary: snippet,
    content: snippet,
    tags: dedupeStrings(["联网补充", "搜索摘要", result.source]).slice(0, 4),
    source: result.source,
    provider: result.provider,
    snippetOnly: true,
  } satisfies WebSupplementSource;
}

function createFetchedWebSource(result: WebSearchResult, page: Awaited<ReturnType<typeof fetchWebpage>>) {
  const fallbackSnippet = normalizeText(result.snippet);
  const summary = normalizeText(page.summary || fallbackSnippet);
  const content = normalizeText(
    page.content || [page.summary, fallbackSnippet].filter(Boolean).join(" ")
  );

  return {
    id: createWebSourceId(page.url),
    title: page.title || result.title,
    url: page.url,
    summary,
    content,
    tags: dedupeStrings([
      ...page.tags,
      "联网补充",
      result.source,
      "网页正文",
    ]).slice(0, 5),
    source: result.source,
    provider: result.provider,
    snippetOnly: false,
  } satisfies WebSupplementSource;
}

async function gatherWebSupplement(searchPlan: SearchPlan) {
  if (searchPlan.queries.length === 0) {
    return [];
  }

  const { results } = await executeSearchPlan(searchPlan);

  if (results.length === 0) {
    return [];
  }

  const supplementSources = new Map<string, WebSupplementSource>();
  const primaryResults = results.slice(0, MAX_WEB_FETCH_RESULTS);
  const remainingResults = results.slice(MAX_WEB_FETCH_RESULTS, MAX_WEB_SEARCH_RESULTS);
  const fetchedResults = await Promise.allSettled(
    primaryResults.map(async (result) => {
      const page = await fetchWebpage(result.url, { summarizeWithAI: false });
      return createFetchedWebSource(result, page);
    })
  );

  primaryResults.forEach((result, index) => {
    const fetchedResult = fetchedResults[index];

    if (fetchedResult?.status === "fulfilled") {
      supplementSources.set(fetchedResult.value.url, fetchedResult.value);
      return;
    }

    const snippetOnlySource = createSnippetOnlyWebSource(result);

    if (snippetOnlySource) {
      supplementSources.set(snippetOnlySource.url, snippetOnlySource);
    }
  });

  remainingResults.forEach((result) => {
    const snippetOnlySource = createSnippetOnlyWebSource(result);

    if (snippetOnlySource && !supplementSources.has(snippetOnlySource.url)) {
      supplementSources.set(snippetOnlySource.url, snippetOnlySource);
    }
  });

  return Array.from(supplementSources.values()).slice(0, MAX_WEB_SEARCH_RESULTS);
}

export async function answerWorkspaceQuestion({
  question,
  selectedSources,
  allowWebFallback = false,
}: WorkspaceChatInput): Promise<WorkspaceChatResponse> {
  const assessment = assessWorkspaceSources({
    selectedSources,
    question,
  });

  if (assessment.isInsufficient && !allowWebFallback) {
    return {
      answer: buildLocalOnlyMessage(assessment.reason),
      citations: buildWorkspaceCitations({ localSources: selectedSources }),
      usedWebFallback: false,
      insufficiencyReason: assessment.reason,
    };
  }

  const webSources =
    assessment.isInsufficient && allowWebFallback
      ? await gatherWebSupplement(buildChatSearchPlan(question, selectedSources))
      : [];

  if (assessment.isInsufficient && allowWebFallback && webSources.length === 0) {
    return {
      answer: buildWebFallbackUnavailableMessage(assessment.reason),
      citations: buildWorkspaceCitations({ localSources: selectedSources }),
      usedWebFallback: false,
      insufficiencyReason: assessment.reason,
    };
  }

  const result = await answerWorkspaceChatWithDeepSeek({
    question,
    sourceContext: buildWorkspaceSourceContext({
      localSources: selectedSources,
      webSources,
    }),
  });

  return {
    answer: result.answer,
    citations: buildWorkspaceCitations({
      localSources: selectedSources,
      webSources,
    }),
    usedWebFallback: webSources.length > 0,
    insufficiencyReason: assessment.isInsufficient ? assessment.reason : undefined,
  };
}

export async function generateWorkspaceResult({
  mode,
  selectedSources,
  allowWebFallback = false,
}: WorkspaceGenerateInput): Promise<WorkspaceGenerateResponse> {
  const assessment = assessWorkspaceSources({
    selectedSources,
  });

  if (assessment.isInsufficient && !allowWebFallback) {
    return {
      content: buildLocalOnlyMessage(assessment.reason),
      citations: buildWorkspaceCitations({ localSources: selectedSources }),
      usedWebFallback: false,
      insufficiencyReason: assessment.reason,
    };
  }

  let webSources: WebSupplementSource[] = [];

  if (assessment.isInsufficient && allowWebFallback) {
    const searchPlan = buildGenerationSearchPlan(mode, selectedSources);

    if (searchPlan.queries.length === 0) {
      return {
        content: "当前资料为空，无法确定联网补充的主题，请先添加资料后再生成。",
        citations: [],
        usedWebFallback: false,
        insufficiencyReason: assessment.reason,
      };
    }

    webSources = await gatherWebSupplement(searchPlan);

    if (webSources.length === 0) {
      return {
        content: buildWebFallbackUnavailableMessage(assessment.reason),
        citations: buildWorkspaceCitations({ localSources: selectedSources }),
        usedWebFallback: false,
        insufficiencyReason: assessment.reason,
      };
    }
  }

  const result = await generateWorkspaceContentWithDeepSeek({
    mode,
    sourceContext: buildWorkspaceSourceContext({
      localSources: selectedSources,
      webSources,
    }),
  });

  return {
    content: result.content,
    citations: buildWorkspaceCitations({
      localSources: selectedSources,
      webSources,
    }),
    usedWebFallback: webSources.length > 0,
    insufficiencyReason: assessment.isInsufficient ? assessment.reason : undefined,
  };
}
