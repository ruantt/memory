import { Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GenerationPanelProps = {
  summaryParagraphs: string[];
  prdSections: Array<{
    heading: string;
    items: string[];
  }>;
};

export function GenerationPanel({
  summaryParagraphs,
  prdSections,
}: GenerationPanelProps) {
  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-border/70 bg-background/95">
      <div className="border-b border-border/70 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Sparkles className="size-3.5" />
          Generate
        </div>
        <h2 className="mt-2 text-lg font-semibold">Mock output panel</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Switch between a lightweight summary and a PRD-oriented outline.
        </p>
      </div>

      <Tabs defaultValue="summary" className="flex flex-1 flex-col">
        <div className="px-5 pt-5">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="prd-outline">PRD Outline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="flex-1 overflow-y-auto p-5 pt-4">
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

        <TabsContent value="prd-outline" className="flex-1 overflow-y-auto p-5 pt-4">
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
