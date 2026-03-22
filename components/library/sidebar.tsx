import Link from "next/link";
import { BookCopy, Layers3, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { uiCopy } from "@/lib/copy/zh-cn";
import { cn } from "@/lib/utils";

type SidebarProps = {
  topics: string[];
  selectedTopic: string;
  onTopicChange: (value: string) => void;
  totalNotes: number;
};

export function Sidebar({
  topics,
  selectedTopic,
  onTopicChange,
  totalNotes,
}: SidebarProps) {
  const sidebarCopy = uiCopy.library.sidebar;

  return (
    <aside className="w-full rounded-[28px] border border-border/70 bg-background/95 p-5 md:max-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            <BookCopy className="size-3.5" />
            {sidebarCopy.badge}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{sidebarCopy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {sidebarCopy.description}
          </p>
        </div>

        <Link
          href="/workspace"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 justify-center"
          )}
        >
          {sidebarCopy.workspaceButton}
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers3 className="size-4 text-muted-foreground" />
          {sidebarCopy.statsTitle(totalNotes)}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sidebarCopy.statsDescription}
        </p>
      </div>

      <section className="mt-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Sparkles className="size-3.5" />
          {sidebarCopy.topics}
        </div>
        <div className="mt-3 space-y-1.5">
          {topics.map((topic) => {
            const isActive = topic === selectedTopic;

            return (
              <button
                key={topic}
                type="button"
                onClick={() => onTopicChange(topic)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{topic}</span>
                {isActive ? <Sparkles className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
