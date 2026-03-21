"use client";

import { ChatPanel } from "@/components/workspace/chat-panel";
import { GenerationPanel } from "@/components/workspace/generation-panel";
import { SourcesPanel } from "@/components/workspace/sources-panel";
import { useKnowledge } from "@/components/providers/knowledge-provider";
import { generationOutputs, initialMessages } from "@/lib/mock-data";

type WorkspacePageProps = {
  focusedSourceId?: string;
};

export function WorkspacePage({ focusedSourceId }: WorkspacePageProps) {
  const { items } = useKnowledge();
  const focusedSource = items.find((item) => item.id === focusedSourceId);
  const remainingSources = items.filter((item) => item.id !== focusedSourceId);
  const selectedSources = focusedSource
    ? [focusedSource, ...remainingSources.slice(0, 2)]
    : items.slice(0, 3);
  const sourceCitations = selectedSources.map(({ id, title }) => ({ id, title }));

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 rounded-[28px] border border-border/70 bg-background/95 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Workspace
          </p>
          <div className="mt-2 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Ask, synthesize, and draft from selected notes
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Three-panel MVP layout with mock chat history, citation chips, and generation tabs.
              </p>
            </div>

            {focusedSource ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Focused source: <span className="font-medium text-foreground">{focusedSource.title}</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <SourcesPanel sources={selectedSources} />
          <ChatPanel initialMessages={initialMessages} sourceCitations={sourceCitations} />
          <GenerationPanel
            summaryParagraphs={generationOutputs.summary}
            prdSections={generationOutputs.prdOutline}
          />
        </div>
      </div>
    </div>
  );
}
