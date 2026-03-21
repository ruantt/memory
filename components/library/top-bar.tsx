import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TopBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onCreateKnowledge: () => void;
  resultCount: number;
};

export function TopBar({
  searchValue,
  onSearchChange,
  onCreateKnowledge,
  resultCount,
}: TopBarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Library
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Knowledge cards, kept deliberately small
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {resultCount} notes ready for retrieval, reuse, and drafting.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
        <div className="relative w-full xl:min-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title, summary, content, or tag"
            className="h-10 rounded-xl pl-10"
          />
        </div>

        <Button onClick={onCreateKnowledge} className="h-10 rounded-xl px-4">
          <Plus className="size-4" />
          新增知识
        </Button>
      </div>
    </div>
  );
}
