import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uiCopy } from "@/lib/copy/zh-cn";
import type { Citation } from "@/lib/types";

type GenerationPanelProps = {
  summaryParagraphs: string[];
  prdSections: Array<{
    heading: string;
    items: string[];
  }>;
  sourceCitations: Citation[];
};

export function GenerationPanel({
  summaryParagraphs,
  prdSections,
  sourceCitations,
}: GenerationPanelProps) {
  const generationCopy = uiCopy.workspace.generation;

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

      <Tabs defaultValue="summary" className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            {summaryParagraphs.map((paragraph) => (
              <div
                key={paragraph}
                className="rounded-[22px] border border-border/70 bg-muted/20 p-4 text-sm leading-7 text-foreground"
              >
                {paragraph}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="prd-outline"
          className="min-h-0 flex-1 overflow-y-auto p-5 pt-4"
        >
          <div className="space-y-4">
            {prdSections.map((section) => (
              <section
                key={section.heading}
                className="rounded-[22px] border border-border/70 bg-muted/20 p-4"
              >
                <h3 className="text-sm font-medium text-foreground">{section.heading}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 size-1.5 rounded-full bg-foreground/50" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
