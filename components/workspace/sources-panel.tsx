import Link from "next/link";
import { ArrowLeft, BookMarked, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { uiCopy } from "@/lib/copy/zh-cn";
import { formatShortDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

type SourcesPanelProps = {
  sources: KnowledgeItem[];
};

export function SourcesPanel({ sources }: SourcesPanelProps) {
  const sourcesCopy = uiCopy.workspace.sources;

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-border/70 bg-background/95">
      <div className="border-b border-border/70 p-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {sourcesCopy.back}
        </Link>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Layers3 className="size-3.5" />
          {sourcesCopy.eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold">{sourcesCopy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sourcesCopy.description(sources.length)}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {sources.map((source) => (
          <article
            key={source.id}
            className="rounded-[22px] border border-border/70 bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium leading-6 text-foreground">
                  {source.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatShortDate(source.createdAt)}
                </p>
              </div>
              <BookMarked className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {source.summary}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {source.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full">
                  {tag}
                </Badge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
