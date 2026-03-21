"use client";

import { createContext, useContext, useState } from "react";
import { uiCopy } from "@/lib/copy/zh-cn";
import { initialKnowledgeItems } from "@/lib/mock-data";
import type { KnowledgeItem } from "@/lib/types";

type CreateKnowledgeInput = {
  title?: string;
  content: string;
  notebook: string;
  topic: string;
};

type KnowledgeContextValue = {
  items: KnowledgeItem[];
  addKnowledge: (input: CreateKnowledgeInput) => KnowledgeItem;
};

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

function createSummary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

export function KnowledgeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const filtersCopy = uiCopy.library.filters;
  const [items, setItems] = useState(initialKnowledgeItems);

  const addKnowledge = ({ title, content, notebook, topic }: CreateKnowledgeInput) => {
    const nextNotebook =
      notebook === filtersCopy.allNotebooks ? filtersCopy.defaultNotebook : notebook;
    const nextTopic =
      topic === filtersCopy.allTopics ? filtersCopy.defaultTopic : topic;
    const trimmedTitle = title?.trim();
    const trimmedContent = content.trim();

    const newItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      title: trimmedTitle || filtersCopy.untitledNote,
      summary: createSummary(trimmedContent),
      content: trimmedContent,
      tags: [nextTopic],
      createdAt: new Date().toISOString(),
      notebook: nextNotebook,
      topic: nextTopic,
    };

    setItems((currentItems) => [newItem, ...currentItems]);

    return newItem;
  };

  return (
    <KnowledgeContext.Provider value={{ items, addKnowledge }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);

  if (!context) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider.");
  }

  return context;
}
