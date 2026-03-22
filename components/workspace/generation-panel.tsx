"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { generateWorkspaceContent } from "@/lib/ai/api";
import { parseGeneratedSections, splitGeneratedParagraphs } from "@/lib/ai/presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uiCopy } from "@/lib/copy/zh-cn";
import type { Citation, WorkspaceSource } from "@/lib/types";

type GenerationPanelProps = {
  sourceCitations: Citation[];
  selectedSources: WorkspaceSource[];
  allowWebFallback: boolean;
};

function getCitationGroupLabel(citation: Citation) {
  if (citation.scope === "web") {
    return "联网补充";
  }

  if (citation.sourceType === "knowledge") {
    return "本地知识库";
  }

  if (citation.sourceType === "file") {
    return "本地资料";
  }

  return "网页链接";
}

export function GenerationPanel({
  sourceCitations,
  selectedSources,
  allowWebFallback,
}: GenerationPanelProps) {
  const generationCopy = uiCopy.workspace.generation;
  const [activeTab, setActiveTab] = useState<"summary" | "prd-outline">("summary");
  const [summaryContent, setSummaryContent] = useState("");
  const [prdContent, setPrdContent] = useState("");
  const [summaryCitations, setSummaryCitations] = useState<Citation[]>([]);
  const [prdCitations, setPrdCitations] = useState<Citation[]>([]);
  const [summaryUsedWebFallback, setSummaryUsedWebFallback] = useState(false);
  const [prdUsedWebFallback, setPrdUsedWebFallback] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"summary" | "prd" | null>(null);
  const [errors, setErrors] = useState<{ summary?: string; prd?: string }>({});
  const sourceSignature = useMemo(
    () =>
      selectedSources
        .map((source) => `${source.id}:${source.title}`)
        .join("|"),
    [selectedSources]
  );
  const summaryParagraphs = splitGeneratedParagraphs(summaryContent);
  const prdSections = parseGeneratedSections(prdContent);

  useEffect(() => {
    setSummaryContent("");
    setPrdContent("");
    setSummaryCitations([]);
    setPrdCitations([]);
    setSummaryUsedWebFallback(false);
    setPrdUsedWebFallback(false);
    setErrors({});
  }, [sourceSignature]);

  async function handleGenerate(mode: "summary" | "prd") {
    if (loadingMode) {
      return;
    }

    setLoadingMode(mode);
    setErrors((currentErrors) => ({ ...currentErrors, [mode]: undefined }));

    try {
      const response = await generateWorkspaceContent({
        mode,
        selectedSources,
        allowWebFallback,
      });

      if (mode === "summary") {
        setSummaryContent(response.content);
        setSummaryCitations(response.citations);
        setSummaryUsedWebFallback(response.usedWebFallback);
      } else {
        setPrdContent(response.content);
        setPrdCitations(response.citations);
        setPrdUsedWebFallback(response.usedWebFallback);
      }
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [mode]:
          error instanceof Error ? error.message : "生成失败，请稍后再试。",
      }));
    } finally {
      setLoadingMode(null);
    }
  }

  const summaryCitationGroups = Array.from(
    summaryCitations.reduce((groups, citation) => {
      const groupLabel = getCitationGroupLabel(citation);
      const groupItems = groups.get(groupLabel) ?? [];
      groupItems.push(citation);
      groups.set(groupLabel, groupItems);
      return groups;
    }, new Map<string, Citation[]>())
  );
  const prdCitationGroups = Array.from(
    prdCitations.reduce((groups, citation) => {
      const groupLabel = getCitationGroupLabel(citation);
      const groupItems = groups.get(groupLabel) ?? [];
      groupItems.push(citation);
      groups.set(groupLabel, groupItems);
      return groups;
    }, new Map<string, Citation[]>())
  );

  return (
    <aside className="flex h-full min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background/95 xl:min-h-0">
      <div className="shrink-0 border-b border-border/70 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Sparkles className="size-3.5" />
          {generationCopy.eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold">{generationCopy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {generationCopy.description}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {generationCopy.sourcesLabel}
          </p>
          {sourceCitations.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sourceCitations.map((citation) => (
                <Badge key={citation.id} variant="outline" className="rounded-full">
                  {citation.title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{generationCopy.sourcesEmpty}</p>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "summary" | "prd-outline")}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="shrink-0 px-5 pt-5">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="summary">{generationCopy.summaryTab}</TabsTrigger>
            <TabsTrigger value="prd-outline">
              {generationCopy.prdOutlineTab}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => handleGenerate("summary")}
                disabled={loadingMode !== null}
              >
                {loadingMode === "summary" ? "生成中..." : "生成总结"}
              </Button>
            </div>

            {errors.summary ? (
              <div className="rounded-[22px] border border-destructive/30 bg-destructive/5 p-4 text-sm leading-7 text-destructive">
                {errors.summary}
              </div>
            ) : null}

            {loadingMode === "summary" ? (
              <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {allowWebFallback
                  ? "AI 正在分析资料，必要时会联网补充后生成总结..."
                  : "AI 正在基于当前已选资料生成总结..."}
              </div>
            ) : null}

            {!summaryContent && loadingMode !== "summary" && !errors.summary ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {sourceCitations.length > 0
                  ? allowWebFallback
                    ? generationCopy.summaryHintWithWebFallback
                    : "点击上方按钮，基于当前已选资料生成真实总结。"
                  : allowWebFallback
                    ? generationCopy.emptyHintWithWebFallback
                    : generationCopy.sourcesEmpty}
              </div>
            ) : null}

            {summaryUsedWebFallback && summaryContent && loadingMode !== "summary" ? (
              <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
                <Badge variant="outline" className="rounded-full">
                  已使用联网补充
                </Badge>
              </div>
            ) : null}

            {summaryContent && loadingMode !== "summary" ? (
              <>
                {summaryParagraphs.map((paragraph) => (
                  <div
                    key={paragraph}
                    className="rounded-[22px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 text-foreground"
                  >
                    {paragraph}
                  </div>
                ))}

                {summaryCitationGroups.length > 0 ? (
                  <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {generationCopy.sourcesLabel}
                    </p>
                    <div className="mt-3 space-y-3">
                      {summaryCitationGroups.map(([groupLabel, citations]) => (
                        <div key={groupLabel} className="space-y-2">
                          <p className="text-xs text-muted-foreground">{groupLabel}</p>
                          <div className="flex flex-wrap gap-2">
                            {citations.map((citation) => (
                              <Badge
                                key={citation.id}
                                variant="outline"
                                className="rounded-full"
                              >
                                {citation.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent
          value="prd-outline"
          className="min-h-0 flex-1 overflow-y-auto p-5 pt-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={() => handleGenerate("prd")}
                disabled={loadingMode !== null}
              >
                {loadingMode === "prd" ? "生成中..." : "生成 PRD 提纲"}
              </Button>
            </div>

            {errors.prd ? (
              <div className="rounded-[22px] border border-destructive/30 bg-destructive/5 p-4 text-sm leading-7 text-destructive">
                {errors.prd}
              </div>
            ) : null}

            {loadingMode === "prd" ? (
              <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {allowWebFallback
                  ? "AI 正在分析资料，必要时会联网补充后生成 PRD 提纲..."
                  : "AI 正在基于当前已选资料生成 PRD 提纲..."}
              </div>
            ) : null}

            {!prdContent && loadingMode !== "prd" && !errors.prd ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {sourceCitations.length > 0
                  ? allowWebFallback
                    ? generationCopy.prdHintWithWebFallback
                    : "点击上方按钮，基于当前已选资料生成真实 PRD 提纲。"
                  : allowWebFallback
                    ? generationCopy.emptyHintWithWebFallback
                    : generationCopy.sourcesEmpty}
              </div>
            ) : null}

            {prdUsedWebFallback && prdContent && loadingMode !== "prd" ? (
              <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
                <Badge variant="outline" className="rounded-full">
                  已使用联网补充
                </Badge>
              </div>
            ) : null}

            {prdContent && loadingMode !== "prd" ? (
              <>
                {prdSections.map((section) => (
                  <section
                    key={`${section.heading}-${section.items.join("-")}`}
                    className="rounded-[22px] border border-border/70 bg-muted/20 p-4"
                  >
                    <h3 className="text-sm font-medium text-foreground">
                      {section.heading}
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                      {section.items.map((item) => (
                        <li
                          key={`${section.heading}-${item}`}
                          className="flex gap-2"
                        >
                          <span className="mt-2 size-1.5 rounded-full bg-foreground/50" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

                {prdCitationGroups.length > 0 ? (
                  <div className="rounded-[22px] border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {generationCopy.sourcesLabel}
                    </p>
                    <div className="mt-3 space-y-3">
                      {prdCitationGroups.map(([groupLabel, citations]) => (
                        <div key={groupLabel} className="space-y-2">
                          <p className="text-xs text-muted-foreground">{groupLabel}</p>
                          <div className="flex flex-wrap gap-2">
                            {citations.map((citation) => (
                              <Badge
                                key={citation.id}
                                variant="outline"
                                className="rounded-full"
                              >
                                {citation.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
