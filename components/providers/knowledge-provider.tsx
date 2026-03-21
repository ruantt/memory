"use client";

import { createContext, useContext, useState } from "react";
import { uiCopy } from "@/lib/copy/zh-cn";
import { initialKnowledgeItems } from "@/lib/mock-data";
import type {
  FileSource,
  KnowledgeItem,
  KnowledgeSource,
  LinkSource,
  WorkspaceSource,
} from "@/lib/types";

type CreateKnowledgeInput = {
  title?: string;
  content: string;
  topic: string;
  tags: string[];
};

type LinkSourceInput = {
  title?: string;
  url: string;
};

type KnowledgeContextValue = {
  items: KnowledgeItem[];
  workspaceSources: WorkspaceSource[];
  addKnowledge: (input: CreateKnowledgeInput) => KnowledgeItem;
  deleteKnowledge: (id: string) => void;
  addKnowledgeSources: (ids: string[]) => void;
  addLocalFiles: (files: File[]) => void;
  addLinkSource: (input: LinkSourceInput) => void;
  updateLinkSource: (id: string, input: LinkSourceInput) => void;
  removeWorkspaceSource: (id: string) => void;
};

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

function createSummary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

function createKnowledgeSource(item: KnowledgeItem): KnowledgeSource {
  return {
    id: item.id,
    type: "knowledge",
    knowledgeId: item.id,
    title: item.title,
    summary: item.summary,
    topic: item.topic,
    tags: item.tags,
    createdAt: item.createdAt,
  };
}

function resolveFileType(file: File) {
  if (file.type.startsWith("image/")) {
    return "图片";
  }

  const extension = file.name.split(".").pop()?.trim();

  if (extension) {
    return extension.toUpperCase();
  }

  return "文件";
}

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function KnowledgeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const filtersCopy = uiCopy.library.filters;
  const workspaceSourcesCopy = uiCopy.workspace.sources;
  const [items, setItems] = useState(initialKnowledgeItems);
  const [workspaceSources, setWorkspaceSources] = useState<WorkspaceSource[]>(() =>
    initialKnowledgeItems.slice(0, 2).map(createKnowledgeSource)
  );

  const addKnowledge = ({ title, content, topic, tags }: CreateKnowledgeInput) => {
    const nextTopic =
      topic === filtersCopy.allTopics ? filtersCopy.defaultTopic : topic;
    const trimmedTitle = title?.trim();
    const trimmedContent = content.trim();
    const normalizedTags = tags.map((tag) => tag.trim()).filter(Boolean);

    const newItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      title: trimmedTitle || filtersCopy.untitledNote,
      summary: createSummary(trimmedContent),
      content: trimmedContent,
      tags: normalizedTags.length > 0 ? normalizedTags : [nextTopic],
      createdAt: new Date().toISOString(),
      topic: nextTopic,
    };

    setItems((currentItems) => [newItem, ...currentItems]);

    return newItem;
  };

  const deleteKnowledge = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    setWorkspaceSources((currentSources) =>
      currentSources.filter(
        (source) => source.type !== "knowledge" || source.knowledgeId !== id
      )
    );
  };

  const addKnowledgeSources = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    setWorkspaceSources((currentSources) => {
      const existingIds = new Set(
        currentSources
          .filter((source): source is KnowledgeSource => source.type === "knowledge")
          .map((source) => source.knowledgeId)
      );
      const nextSources = items
        .filter((item) => ids.includes(item.id) && !existingIds.has(item.id))
        .map(createKnowledgeSource);

      if (nextSources.length === 0) {
        return currentSources;
      }

      return [...nextSources, ...currentSources];
    });
  };

  const addLocalFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const nextSources: FileSource[] = files.map((file) => ({
      id: crypto.randomUUID(),
      type: "file",
      title: file.name,
      fileMeta: {
        name: file.name,
        type: resolveFileType(file),
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    }));

    setWorkspaceSources((currentSources) => [...nextSources, ...currentSources]);
  };

  const addLinkSource = ({ title, url }: LinkSourceInput) => {
    const normalizedUrl = normalizeUrl(url);
    const trimmedTitle = title?.trim();

    if (!normalizedUrl) {
      return;
    }

    const nextSource: LinkSource = {
      id: crypto.randomUUID(),
      type: "link",
      title:
        trimmedTitle || normalizedUrl || workspaceSourcesCopy.linkUntitled,
      url: normalizedUrl,
    };

    setWorkspaceSources((currentSources) => [nextSource, ...currentSources]);
  };

  const updateLinkSource = (id: string, { title, url }: LinkSourceInput) => {
    const normalizedUrl = normalizeUrl(url);
    const trimmedTitle = title?.trim();

    if (!normalizedUrl) {
      return;
    }

    setWorkspaceSources((currentSources) =>
      currentSources.map((source) => {
        if (source.type !== "link" || source.id !== id) {
          return source;
        }

        return {
          ...source,
          title:
            trimmedTitle || normalizedUrl || workspaceSourcesCopy.linkUntitled,
          url: normalizedUrl,
        };
      })
    );
  };

  const removeWorkspaceSource = (id: string) => {
    setWorkspaceSources((currentSources) =>
      currentSources.filter((source) => source.id !== id)
    );
  };

  return (
    <KnowledgeContext.Provider
      value={{
        items,
        workspaceSources,
        addKnowledge,
        deleteKnowledge,
        addKnowledgeSources,
        addLocalFiles,
        addLinkSource,
        updateLinkSource,
        removeWorkspaceSource,
      }}
    >
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
