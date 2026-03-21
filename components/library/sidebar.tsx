import Link from "next/link";
import { BookCopy, FolderKanban, Layers3, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { uiCopy } from "@/lib/copy/zh-cn";
import { cn } from "@/lib/utils";

type SidebarProps = {
  notebooks: string[];
  topics: string[];
  selectedNotebook: string;
  selectedTopic: string;
  onNotebookChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  totalNotes: number;
};

function FilterSection({
  icon: Icon,
  title,
  options,
  selectedValue,
  onSelect,
}: {
  icon: typeof FolderKanban;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="mt-3 space-y-1.5">
        {options.map((option) => {
          const isActive = option === selectedValue;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{option}</span>
              {isActive ? <Sparkles className="size-3.5" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Sidebar({
  notebooks,
  topics,
  selectedNotebook,
  selectedTopic,
  onNotebookChange,
  onTopicChange,
  totalNotes,
}: SidebarProps) {
  const sidebarCopy = uiCopy.library.sidebar;

  return (
    <aside className="w-full rounded-[28px] border border-border/70 bg-background/95 p-5 md:max-w-[280px]">
      <div className="flex items-start justify-between gap-3">
        <div>
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
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
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

      <div className="mt-6 space-y-6">
        <FilterSection
          icon={FolderKanban}
          title={sidebarCopy.notebooks}
          options={notebooks}
          selectedValue={selectedNotebook}
          onSelect={onNotebookChange}
        />
        <FilterSection
          icon={Sparkles}
          title={sidebarCopy.topics}
          options={topics}
          selectedValue={selectedTopic}
          onSelect={onTopicChange}
        />
      </div>
    </aside>
  );
}
