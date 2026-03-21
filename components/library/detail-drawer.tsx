"use client";

import Link from "next/link";
import { BookOpenText, Clock3, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { uiCopy } from "@/lib/copy/zh-cn";
import { formatShortDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type DetailDrawerProps = {
  item: KnowledgeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DetailDrawer({ item, open, onOpenChange }: DetailDrawerProps) {
  if (!item) {
    return null;
  }

  const drawerCopy = uiCopy.library.drawer;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 pb-5 pr-12">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            <BookOpenText className="size-3.5" />
            {item.notebook}
          </div>
          <SheetTitle className="text-xl leading-8">{item.title}</SheetTitle>
          <SheetDescription className="leading-6">{item.summary}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <Clock3 className="size-3.5" />
                {drawerCopy.createdAt}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatShortDate(item.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <Tags className="size-3.5" />
                {drawerCopy.topic}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{item.topic}</p>
            </div>
          </div>

          <section>
            <h3 className="text-sm font-medium text-foreground">{drawerCopy.tags}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-medium text-foreground">
              {drawerCopy.originalContent}
            </h3>
            <div className="mt-3 rounded-[20px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 whitespace-pre-wrap text-foreground">
              {item.content}
            </div>
          </section>
        </div>

        <SheetFooter className="border-t border-border/70 bg-background/95">
          <Link
            href={`/workspace?source=${item.id}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center hover:bg-primary/90"
            )}
          >
            {drawerCopy.askButton}
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
