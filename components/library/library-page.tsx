"use client";

import { useDeferredValue, useState } from "react";
import { FileSearch } from "lucide-react";
import { DetailDrawer } from "@/components/library/detail-drawer";
import { ImportModal } from "@/components/library/import-modal";
import { KnowledgeCard } from "@/components/library/knowledge-card";
import { Sidebar } from "@/components/library/sidebar";
import { TopBar } from "@/components/library/top-bar";
import { useKnowledge } from "@/components/providers/knowledge-provider";
import { uiCopy } from "@/lib/copy/zh-cn";
import type { KnowledgeItem } from "@/lib/types";

export function LibraryPage() {
  const { items, addKnowledge, deleteKnowledge } = useKnowledge();
  const filtersCopy = uiCopy.library.filters;
  const emptyStateCopy = uiCopy.library.emptyState;
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const [selectedTopic, setSelectedTopic] = useState<string>(filtersCopy.allTopics);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<KnowledgeItem | null>(null);

  const topicOptions = Array.from(
    new Set([filtersCopy.defaultTopic, ...items.map((item) => item.topic)])
  );
  const sidebarTopics = [filtersCopy.allTopics, ...topicOptions];
  const effectiveSelectedTopic = sidebarTopics.includes(selectedTopic)
    ? selectedTopic
    : filtersCopy.allTopics;
  const normalizedQuery = deferredSearchValue.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    const matchesTopic =
      effectiveSelectedTopic === filtersCopy.allTopics ||
      item.topic === effectiveSelectedTopic;
    const matchesSearch =
      normalizedQuery.length === 0 ||
      [item.title, item.summary, item.content, item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesTopic && matchesSearch;
  });

  function handleCreateKnowledge(values: {
    title: string;
    content: string;
    topic: string;
    tags: string[];
  }) {
    addKnowledge(values);
  }

  function handleDeleteKnowledge(id: string) {
    deleteKnowledge(id);
    setActiveItem((currentItem) => (currentItem?.id === id ? null : currentItem));
  }

  return (
    <div className="min-h-screen bg-[#f6f5f2] p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
        <Sidebar
          topics={sidebarTopics}
          selectedTopic={effectiveSelectedTopic}
          onTopicChange={setSelectedTopic}
          totalNotes={items.length}
        />

        <main className="flex min-h-[calc(100vh-3rem)] flex-1 flex-col rounded-[28px] border border-border/70 bg-background/95 p-5">
          <TopBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onCreateKnowledge={() => setIsImportOpen(true)}
            resultCount={filteredItems.length}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.map((item) => (
              <KnowledgeCard key={item.id} item={item} onOpen={() => setActiveItem(item)} />
            ))}

            {filteredItems.length === 0 ? (
              <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-muted/20 px-6 text-center">
                <FileSearch className="size-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">{emptyStateCopy.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {emptyStateCopy.description}
                </p>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <ImportModal
        key={`import-${effectiveSelectedTopic}-${isImportOpen ? "open" : "closed"}`}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSave={handleCreateKnowledge}
        selectedTopic={effectiveSelectedTopic}
        availableTopics={topicOptions}
      />
      <DetailDrawer
        item={activeItem}
        open={Boolean(activeItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveItem(null);
          }
        }}
        onDelete={handleDeleteKnowledge}
      />
    </div>
  );
}
