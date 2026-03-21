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
};

export function GenerationPanel({
  sourceCitations,
  selectedSources,
}: GenerationPanelProps) {
  const generationCopy = uiCopy.workspace.generation;
  const [activeTab, setActiveTab] = useState<"summary" | "prd-outline">("summary");
  const [summaryContent, setSummaryContent] = useState("");
  const [prdContent, setPrdContent] = useState("");
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
      });

      if (mode === "summary") {
        setSummaryContent(response.content);
      } else {
        setPrdContent(response.content);
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
                disabled={loadingMode !== null || sourceCitations.length === 0}
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
                AI 正在基于当前已选资料生成总结...
              </div>
            ) : null}

            {!summaryContent && loadingMode !== "summary" && !errors.summary ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {sourceCitations.length > 0
                  ? "点击上方按钮，基于当前已选资料生成真实总结。"
                  : generationCopy.sourcesEmpty}
              </div>
            ) : null}

            {summaryContent && loadingMode !== "summary"
              ? summaryParagraphs.map((paragraph) => (
                  <div
                    key={paragraph}
                    className="rounded-[22px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 text-foreground"
                  >
                    {paragraph}
                  </div>
                ))
              : null}
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
                disabled={loadingMode !== null || sourceCitations.length === 0}
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
                AI 正在基于当前已选资料生成 PRD 提纲...
              </div>
            ) : null}

            {!prdContent && loadingMode !== "prd" && !errors.prd ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
                {sourceCitations.length > 0
                  ? "点击上方按钮，基于当前已选资料生成真实 PRD 提纲。"
                  : generationCopy.sourcesEmpty}
              </div>
            ) : null}

            {prdContent && loadingMode !== "prd"
              ? prdSections.map((section) => (
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
                ))
              : null}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
