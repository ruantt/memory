import { load } from "cheerio";

const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 8;
const SEARCH_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

type SearchProvider = "serper" | "duckduckgo";

type WebSearchOptions = {
  preferFreshness?: boolean;
};

type SearchResultCandidate = {
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
};

type SerperResponse = {
  answerBox?: {
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
  };
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
  }>;
  news?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
    date?: string;
  }>;
};

export type WebSearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  provider: SearchProvider;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_SEARCH_LIMIT);
}

function createResultId(url: string) {
  return `web:${url}`;
}

function resolveUrl(rawUrl: string) {
  const normalizedUrl = rawUrl.trim();

  if (!normalizedUrl) {
    return "";
  }

  try {
    return new URL(normalizedUrl).toString();
  } catch {
    return "";
  }
}

function resolveSourceLabel(url: string, fallbackSource?: string) {
  const normalizedFallback = normalizeText(fallbackSource ?? "");

  if (normalizedFallback) {
    return normalizedFallback;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "网页";
  }
}

function normalizeSearchResult(
  candidate: SearchResultCandidate,
  provider: SearchProvider
) {
  const title = normalizeText(candidate.title ?? "");
  const url = resolveUrl(candidate.url ?? "");
  const snippet = truncateText(candidate.snippet ?? "", 220);

  if (!title || !url) {
    return null;
  }

  return {
    id: createResultId(url),
    title,
    url,
    snippet,
    source: resolveSourceLabel(url, candidate.source),
    provider,
  } satisfies WebSearchResult;
}

function dedupeSearchResults(results: WebSearchResult[], limit: number) {
  const dedupedResults = new Map<string, WebSearchResult>();

  results.forEach((result) => {
    if (!dedupedResults.has(result.url)) {
      dedupedResults.set(result.url, result);
    }
  });

  return Array.from(dedupedResults.values()).slice(0, limit);
}

async function requestSerper({
  query,
  limit,
  endpoint,
}: {
  query: string;
  limit: number;
  endpoint: "search" | "news";
}) {
  const apiKey = process.env.SERPER_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: limit,
      hl: "zh-cn",
      gl: "cn",
      autocorrect: true,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Serper 搜索失败：HTTP ${response.status}`);
  }

  return (await response.json()) as SerperResponse;
}

function parseSerperResponse(data: SerperResponse, limit: number) {
  const rawCandidates: SearchResultCandidate[] = [];

  if (data.answerBox?.link) {
    rawCandidates.push({
      title: data.answerBox.title,
      url: data.answerBox.link,
      snippet: data.answerBox.snippet,
      source: data.answerBox.source,
    });
  }

  rawCandidates.push(
    ...(data.news ?? []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: item.source,
    }))
  );

  rawCandidates.push(
    ...(data.organic ?? []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: item.source,
    }))
  );

  return dedupeSearchResults(
    rawCandidates
      .map((candidate) => normalizeSearchResult(candidate, "serper"))
      .filter((candidate): candidate is WebSearchResult => candidate !== null),
    limit
  );
}

async function searchWithSerper(
  query: string,
  limit: number,
  options: WebSearchOptions = {}
): Promise<WebSearchResult[]> {
  const { preferFreshness = false } = options;
  const preferredEndpoint = preferFreshness ? "news" : "search";
  const preferredResponse = await requestSerper({
    query,
    limit,
    endpoint: preferredEndpoint,
  });
  const preferredResults = preferredResponse
    ? parseSerperResponse(preferredResponse, limit)
    : [];

  if (preferredResults.length > 0 || preferredEndpoint === "search") {
    return preferredResults;
  }

  const fallbackResponse = await requestSerper({
    query,
    limit,
    endpoint: "search",
  });

  return fallbackResponse ? parseSerperResponse(fallbackResponse, limit) : [];
}

function resolveDuckDuckGoUrl(rawUrl: string) {
  if (!rawUrl) {
    return "";
  }

  const normalizedUrl = rawUrl.startsWith("//")
    ? `https:${rawUrl}`
    : rawUrl.startsWith("/")
      ? `https://duckduckgo.com${rawUrl}`
      : rawUrl;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const redirectTarget = parsedUrl.searchParams.get("uddg");

    if (redirectTarget) {
      return decodeURIComponent(redirectTarget);
    }

    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
}

async function searchWithDuckDuckGo(
  query: string,
  limit: number
): Promise<WebSearchResult[]> {
  const response = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: SEARCH_REQUEST_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo 搜索失败：HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const results: WebSearchResult[] = [];

  $(".result").each((_, element) => {
    if (results.length >= limit) {
      return false;
    }

    const $element = $(element);
    const titleAnchorSelectors = [".result__title a", "a.result__a", "a.result-link"];
    const titleAnchor =
      titleAnchorSelectors
        .map((selector) => $element.find(selector).first())
        .find((candidate) => candidate.length > 0) ?? $element.find("a").first();
    const title = normalizeText(titleAnchor.text());
    const url = resolveUrl(resolveDuckDuckGoUrl(titleAnchor.attr("href") ?? ""));
    const snippet = truncateText($element.find(".result__snippet").first().text(), 220);

    if (!title || !url) {
      return;
    }

    const result = normalizeSearchResult(
      {
        title,
        url,
        snippet,
      },
      "duckduckgo"
    );

    if (result) {
      results.push(result);
    }
  });

  return dedupeSearchResults(results, limit);
}

async function searchWithFallbackProviders(
  query: string,
  limit: number
) {
  try {
    return await searchWithDuckDuckGo(query, limit);
  } catch {
    return [];
  }
}

export async function webSearch(
  query: string,
  limit?: number,
  options: WebSearchOptions = {}
) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const normalizedLimit = normalizeLimit(limit);
  const hasSerperKey = Boolean(process.env.SERPER_API_KEY?.trim());

  if (hasSerperKey) {
    try {
      const serperResults = await searchWithSerper(
        trimmedQuery,
        normalizedLimit,
        options
      );

      if (serperResults.length > 0) {
        return serperResults;
      }
    } catch {
      // Fall through to the non-key fallback provider.
    }
  }

  return searchWithFallbackProviders(trimmedQuery, normalizedLimit);
}
