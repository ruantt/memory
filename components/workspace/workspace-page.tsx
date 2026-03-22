"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { ChatPanel } from "@/components/workspace/chat-panel";
import { GenerationPanel } from "@/components/workspace/generation-panel";
import { SourcesPanel } from "@/components/workspace/sources-panel";
import { useKnowledge } from "@/components/providers/knowledge-provider";
import { uiCopy } from "@/lib/copy/zh-cn";

type WorkspacePageProps = {
  focusedSourceId?: string;
};

export function WorkspacePage({ focusedSourceId }: WorkspacePageProps) {
  const {
    items,
    workspaceSources,
    addKnowledgeSources,
    addLocalFiles,
    addLinkSource,
    updateLinkSource,
    removeWorkspaceSource,
  } = useKnowledge();
  const workspaceHeaderCopy = uiCopy.workspace.header;
  const focusedSource = workspaceSources.find((source) => source.id === focusedSourceId);
  const sourceCitations = workspaceSources.map((source) => ({
    id: source.id,
    title: source.title,
    scope: "local" as const,
    sourceType: source.type,
    ...(source.type === "link" ? { url: source.url } : {}),
  }));
  const [allowWebFallback, setAllowWebFallback] = useState(false);
  const syncFocusedKnowledge = useEffectEvent((sourceId: string) => {
    if (items.some((item) => item.id === sourceId)) {
      addKnowledgeSources([sourceId]);
    }
  });

  useEffect(() => {
    if (!focusedSourceId) {
      return;
    }

    syncFocusedKnowledge(focusedSourceId);
  }, [focusedSourceId]);

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:h-[calc(100dvh-3rem)] xl:overflow-hidden">
        <header className="shrink-0 rounded-[28px] border border-border/70 bg-background/95 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {workspaceHeaderCopy.eyebrow}
          </p>
          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {workspaceHeaderCopy.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {workspaceHeaderCopy.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={allowWebFallback}
                  onChange={(event) => setAllowWebFallback(event.target.checked)}
                  className="size-4 rounded border-border/80"
                />
                <span>{workspaceHeaderCopy.webFallbackToggle}</span>
              </label>

              {focusedSource ? (
                <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {workspaceHeaderCopy.focusedSourcePrefix}{" "}
                  <span className="font-medium text-foreground">
                    {focusedSource.title}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <SourcesPanel
            knowledgeItems={items}
            sources={workspaceSources}
            focusedSourceId={focusedSourceId}
            onAddKnowledgeSources={addKnowledgeSources}
            onAddLocalFiles={addLocalFiles}
            onAddLinkSource={addLinkSource}
            onUpdateLinkSource={updateLinkSource}
            onRemoveSource={removeWorkspaceSource}
          />
          <ChatPanel
            sourceCitations={sourceCitations}
            selectedSources={workspaceSources}
            allowWebFallback={allowWebFallback}
          />
          <GenerationPanel
            sourceCitations={sourceCitations}
            selectedSources={workspaceSources}
            allowWebFallback={allowWebFallback}
          />
        </div>
      </div>
    </div>
  );
}
