import { load } from "cheerio";
import { summarizeWebpageWithDeepSeek } from "@/lib/ai/deepseek";

const MAX_EXTRACTED_CONTENT_LENGTH = 8000;
const WEB_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};
const CONTENT_CANDIDATE_SELECTORS = [
  "article",
  "main",
  "[role='main']",
  ".article",
  ".article-content",
  ".post-content",
  ".entry-content",
  ".content",
  ".markdown-body",
  ".prose",
  ".doc-main",
];
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "nav",
  "footer",
  "aside",
  "header",
  ".sidebar",
  ".site-footer",
  ".site-header",
  ".advertisement",
  ".ads",
  ".share",
  ".social",
];

export type FetchWebpageOptions = {
  summarizeWithAI?: boolean;
};

export type FetchedWebpage = {
  title: string;
  url: string;
  content: string;
  summary: string;
  tags: string[];
  fetchedAt: string;
};

type ExtractedWebpageContent = {
  title: string;
  content: string;
  metaDescription: string;
};

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    throw new Error("缺少网页链接。");
  }

  const normalizedUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return new URL(normalizedUrl).toString();
}

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

function fallbackTitle(url: string, extractedTitle: string) {
  if (extractedTitle) {
    return extractedTitle;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || "网页资料";
  } catch {
    return "网页资料";
  }
}

function fallbackSummary(content: string, metaDescription: string) {
  if (metaDescription) {
    return truncateText(metaDescription, 120) || "暂无摘要。";
  }

  return truncateText(content, 120) || "暂无摘要。";
}

function fallbackTags(url: string, content: string) {
  const tags = new Set<string>();

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    if (hostname) {
      tags.add(hostname);
    }
  } catch {
    // Ignore malformed fallback URL parsing here.
  }

  const normalizedContent = content.toLowerCase();
  const keywordMap = [
    { keyword: "产品", tag: "产品" },
    { keyword: "ai", tag: "AI" },
    { keyword: "开发", tag: "开发" },
    { keyword: "文档", tag: "文档" },
    { keyword: "教程", tag: "教程" },
    { keyword: "新闻", tag: "新闻" },
  ];

  keywordMap.forEach(({ keyword, tag }) => {
    if (normalizedContent.includes(keyword) && tags.size < 4) {
      tags.add(tag);
    }
  });

  tags.add("网页资料");

  return Array.from(tags).slice(0, 4);
}

function extractTitle($: ReturnType<typeof load>) {
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").first().text(),
  ]
    .map((value) => normalizeText(value ?? ""))
    .filter(Boolean);

  return candidates[0] ?? "";
}

function extractMetaDescription($: ReturnType<typeof load>) {
  const candidates = [
    $("meta[name='description']").attr("content"),
    $("meta[property='og:description']").attr("content"),
    $("meta[name='twitter:description']").attr("content"),
  ]
    .map((value) => normalizeText(value ?? ""))
    .filter(Boolean);

  return candidates[0] ?? "";
}

function scoreContentBlock(
  $: ReturnType<typeof load>,
  element: Parameters<ReturnType<typeof load>>[0]
) {
  const node = $(element);
  const text = normalizeText(node.text());
  const paragraphCount = node.find("p, li").length;
  const headingCount = node.find("h1, h2, h3").length;
  const linkCount = node.find("a").length;

  return {
    text,
    score:
      text.length +
      paragraphCount * 80 +
      headingCount * 30 -
      Math.min(linkCount * 8, 200),
  };
}

function extractHtmlContent(html: string): ExtractedWebpageContent {
  const $ = load(html);

  NOISE_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });

  $("br").replaceWith("\n");
  $("p, li, h1, h2, h3, h4, h5, h6, blockquote").each((_, element) => {
    $(element).append("\n");
  });

  const title = extractTitle($);
  const metaDescription = extractMetaDescription($);
  const candidates = CONTENT_CANDIDATE_SELECTORS.flatMap((selector) =>
    $(selector).toArray()
  );

  let bestText = "";
  let bestScore = -1;

  candidates.forEach((element) => {
    const candidate = scoreContentBlock($, element);

    if (candidate.score > bestScore && candidate.text.length >= 120) {
      bestScore = candidate.score;
      bestText = candidate.text;
    }
  });

  if (!bestText) {
    bestText = normalizeText($("body").text());
  }

  const content = truncateText(bestText || metaDescription, MAX_EXTRACTED_CONTENT_LENGTH);

  return {
    title,
    content,
    metaDescription,
  };
}

async function fetchWebpageResponse(url: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers: WEB_REQUEST_HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`网页抓取失败：HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  return {
    body,
    contentType,
    finalUrl: response.url || url,
  };
}

export async function fetchWebpage(
  url: string,
  options: FetchWebpageOptions = {}
): Promise<FetchedWebpage> {
  const normalizedUrl = normalizeUrl(url);
  const { summarizeWithAI = true } = options;
  const { body, contentType, finalUrl } = await fetchWebpageResponse(normalizedUrl);
  const fetchedAt = new Date().toISOString();
  const isHtml =
    contentType.includes("text/html") || contentType.includes("application/xhtml+xml");
  const extracted = isHtml
    ? extractHtmlContent(body)
    : {
        title: "",
        content: truncateText(body, MAX_EXTRACTED_CONTENT_LENGTH),
        metaDescription: "",
      };

  if (!extracted.content) {
    throw new Error("未能从网页中提取到可用正文。");
  }

  const baseTitle = fallbackTitle(finalUrl, extracted.title);
  const baseSummary = fallbackSummary(extracted.content, extracted.metaDescription);
  const baseTags = fallbackTags(finalUrl, extracted.content);

  if (!summarizeWithAI) {
    return {
      title: baseTitle,
      url: finalUrl,
      content: extracted.content,
      summary: baseSummary,
      tags: baseTags,
      fetchedAt,
    };
  }

  try {
    const summary = await summarizeWebpageWithDeepSeek({
      url: finalUrl,
      extractedTitle: extracted.title || baseTitle,
      content: extracted.content,
    });

    return {
      title: summary.title || baseTitle,
      url: finalUrl,
      content: extracted.content,
      summary: summary.summary || baseSummary,
      tags: summary.tags.length > 0 ? summary.tags : baseTags,
      fetchedAt,
    };
  } catch {
    return {
      title: baseTitle,
      url: finalUrl,
      content: extracted.content,
      summary: baseSummary,
      tags: baseTags,
      fetchedAt,
    };
  }
}
