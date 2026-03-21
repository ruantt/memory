import { ArrowUpRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

type KnowledgeCardProps = {
  item: KnowledgeItem;
  onOpen: () => void;
};

export function KnowledgeCard({ item, onOpen }: KnowledgeCardProps) {
  return (
    <button type="button" onClick={onOpen} className="group h-full text-left">
      <Card className="h-full rounded-[24px] bg-background/90 transition-all hover:-translate-y-0.5 hover:ring-foreground/15">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-[15px] leading-6">{item.title}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2 leading-6">
                {item.summary}
              </CardDescription>
            </div>
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            <span>{formatShortDate(item.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
