"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookMarked,
  Check,
  FileText,
  Globe,
  Layers3,
  Link2,
  PencilLine,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uiCopy } from "@/lib/copy/zh-cn";
import { formatFileSize, formatShortDate } from "@/lib/format";
import type { KnowledgeItem, LinkSource, WorkspaceSource } from "@/lib/types";
import { cn } from "@/lib/utils";

type SourcesPanelProps = {
  knowledgeItems: KnowledgeItem[];
  sources: WorkspaceSource[];
  focusedSourceId?: string;
  onAddKnowledgeSources: (ids: string[]) => void;
  onAddLocalFiles: (files: File[]) => void;
  onAddLinkSource: (input: { title?: string; url: string }) => void;
  onUpdateLinkSource: (id: string, input: { title?: string; url: string }) => void;
  onRemoveSource: (id: string) => void;
};

type AddDialogTab = "knowledge" | "file" | "link";

type LinkDraft = {
  id?: string;
  title: string;
  url: string;
};

function normalizeLinkUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function isValidLink(url: string) {
  try {
    new URL(normalizeLinkUrl(url));
    return true;
  } catch {
    return false;
  }
}

function truncateText(value: string | undefined, maxLength: number) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function getTagPreview(tags: string[] | undefined, maxCount = 2) {
  const resolvedTags = tags ?? [];
  const visibleTags = resolvedTags.slice(0, maxCount);

  return {
    visibleTags,
    hiddenCount: Math.max(0, resolvedTags.length - visibleTags.length),
  };
}

function getHostname(url: string) {
  try {
    const hostname = new URL(normalizeLinkUrl(url)).hostname;

    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getLinkStatusLabel(source: LinkSource) {
  if (source.status === "loading") {
    return uiCopy.workspace.sources.linkStatusLoading;
  }

  if (source.status === "error") {
    return uiCopy.workspace.sources.linkStatusError;
  }

  return uiCopy.workspace.sources.linkStatusReady;
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-border/70 bg-muted/10 px-4 py-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      {description ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  countLabel,
}: {
  icon: typeof BookMarked;
  title: string;
  countLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      <span className="text-xs text-muted-foreground">{countLabel}</span>
    </div>
  );
}

export function SourcesPanel({
  knowledgeItems,
  sources,
  focusedSourceId,
  onAddKnowledgeSources,
  onAddLocalFiles,
  onAddLinkSource,
  onUpdateLinkSource,
  onRemoveSource,
}: SourcesPanelProps) {
  const sourcesCopy = uiCopy.workspace.sources;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState<AddDialogTab>("knowledge");
  const [knowledgeTopicFilter, setKnowledgeTopicFilter] = useState<string>(
    sourcesCopy.allTopics
  );
  const [knowledgeTagFilter, setKnowledgeTagFilter] = useState<string>(
    sourcesCopy.allTags
  );
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [pendingKnowledgeIds, setPendingKnowledgeIds] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ title: "", url: "" });
  const [linkError, setLinkError] = useState("");

  const knowledgeSources = sources.filter(
    (source): source is Extract<WorkspaceSource, { type: "knowledge" }> =>
      source.type === "knowledge"
  );
  const fileSources = sources.filter(
    (source): source is Extract<WorkspaceSource, { type: "file" }> =>
      source.type === "file"
  );
  const linkSources = sources.filter(
    (source): source is LinkSource => source.type === "link"
  );
  const selectedKnowledgeIds = new Set(
    knowledgeSources.map((source) => source.knowledgeId)
  );
  const topicOptions = [
    sourcesCopy.allTopics,
    ...Array.from(new Set(knowledgeItems.map((item) => item.topic))),
  ];
  const tagOptions = [
    sourcesCopy.allTags,
    ...Array.from(new Set(knowledgeItems.flatMap((item) => item.tags))),
  ];
  const normalizedKnowledgeSearch = knowledgeSearch.trim().toLowerCase();
  const filteredKnowledgeItems = knowledgeItems.filter((item) => {
    const matchesTopic =
      knowledgeTopicFilter === sourcesCopy.allTopics ||
      item.topic === knowledgeTopicFilter;
    const matchesTag =
      knowledgeTagFilter === sourcesCopy.allTags ||
      item.tags.includes(knowledgeTagFilter);
    const matchesSearch =
      normalizedKnowledgeSearch.length === 0 ||
      item.title.toLowerCase().includes(normalizedKnowledgeSearch);

    return matchesTopic && matchesTag && matchesSearch;
  });

  function resetLinkDraft() {
    setLinkDraft({ title: "", url: "" });
    setLinkError("");
  }

  function openAddDialog(tab: AddDialogTab = "knowledge") {
    setAddDialogTab(tab);
    setPendingKnowledgeIds([]);

    if (tab !== "link") {
      resetLinkDraft();
    }

    setIsAddDialogOpen(true);
  }

  function openEditLinkDialog(source: LinkSource) {
    setAddDialogTab("link");
    setPendingKnowledgeIds([]);
    setLinkDraft({
      id: source.id,
      title: source.title,
      url: source.url,
    });
    setLinkError("");
    setIsAddDialogOpen(true);
  }

  function handleAddDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingKnowledgeIds([]);
      resetLinkDraft();
    }

    setIsAddDialogOpen(nextOpen);
  }

  function togglePendingKnowledge(id: string) {
    setPendingKnowledgeIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id]
    );
  }

  function handleAddKnowledgeSources() {
    onAddKnowledgeSources(pendingKnowledgeIds);
    setPendingKnowledgeIds([]);
    setIsAddDialogOpen(false);
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);

    if (nextFiles.length > 0) {
      onAddLocalFiles(nextFiles);
    }

    event.target.value = "";
  }

  function handleSaveLink() {
    if (!isValidLink(linkDraft.url)) {
      setLinkError(sourcesCopy.linkInvalidUrl);
      return;
    }

    const payload = {
      title: linkDraft.title.trim(),
      url: normalizeLinkUrl(linkDraft.url),
    };

    if (linkDraft.id) {
      onUpdateLinkSource(linkDraft.id, payload);
    } else {
      onAddLinkSource(payload);
    }

    resetLinkDraft();
    setIsAddDialogOpen(false);
  }

  const footerPrimaryLabel =
    addDialogTab === "knowledge"
      ? sourcesCopy.pickerSave
      : addDialogTab === "file"
        ? uiCopy.common.finish
        : linkDraft.id
          ? sourcesCopy.linkSaveEdit
          : sourcesCopy.linkSaveCreate;

  const footerPrimaryDisabled =
    addDialogTab === "knowledge"
      ? pendingKnowledgeIds.length === 0
      : addDialogTab === "file"
        ? false
        : !linkDraft.url.trim();

  function handleFooterPrimaryAction() {
    if (addDialogTab === "knowledge") {
      handleAddKnowledgeSources();
      return;
    }

    if (addDialogTab === "link") {
      handleSaveLink();
      return;
    }

    setIsAddDialogOpen(false);
  }

  return (
    <aside className="flex h-full min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background/95 xl:min-h-0">
      <div className="shrink-0 border-b border-border/70 p-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {sourcesCopy.back}
        </Link>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Layers3 className="size-3.5" />
          {sourcesCopy.eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold">{sourcesCopy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sourcesCopy.description(sources.length)}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {sources.length === 0 ? (
          <EmptyStateCard
            title={sourcesCopy.emptyTitle}
            description={sourcesCopy.emptyDescription}
          />
        ) : null}

        <section className="space-y-3">
          <SectionLabel
            icon={BookMarked}
            title={sourcesCopy.knowledgeSectionTitle}
            countLabel={sourcesCopy.sourceCount(knowledgeSources.length)}
          />

          {knowledgeSources.length > 0 ? (
            <div className="space-y-2">
              {knowledgeSources.map((source) => {
                const { visibleTags, hiddenCount } = getTagPreview(source.tags);
                const isFocused = source.knowledgeId === focusedSourceId;

                return (
                  <article
                    key={source.id}
                    className={cn(
                      "rounded-[20px] border border-border/70 bg-muted/10 px-3.5 py-3",
                      isFocused && "border-primary/40 ring-1 ring-primary/15"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-foreground">
                          {source.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {sourcesCopy.knowledgeBadge}
                          </Badge>
                          {source.topic ? (
                            <Badge variant="outline" className="rounded-full">
                              {source.topic}
                            </Badge>
                          ) : null}
                          {visibleTags.map((tag) => (
                            <Badge key={tag} variant="outline" className="rounded-full">
                              {tag}
                            </Badge>
                          ))}
                          {hiddenCount > 0 ? (
                            <Badge variant="outline" className="rounded-full">
                              +{hiddenCount}
                            </Badge>
                          ) : null}
                        </div>
                        {source.summary ? (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {truncateText(source.summary, 58)}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveSource(source.id)}
                        aria-label={`${sourcesCopy.remove} ${source.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyStateCard title={sourcesCopy.knowledgeEmpty} />
          )}
        </section>

        <section className="space-y-3">
          <SectionLabel
            icon={FileText}
            title={sourcesCopy.fileSectionTitle}
            countLabel={sourcesCopy.sourceCount(fileSources.length)}
          />

          {fileSources.length > 0 ? (
            <div className="space-y-2">
              {fileSources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-[20px] border border-border/70 bg-muted/10 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {source.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {sourcesCopy.fileBadge}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {source.fileMeta.type}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {formatFileSize(source.fileMeta.size)} ·{" "}
                        {formatShortDate(source.fileMeta.uploadedAt)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemoveSource(source.id)}
                      aria-label={`${sourcesCopy.remove} ${source.title}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStateCard title={sourcesCopy.fileEmpty} />
          )}
        </section>

        <section className="space-y-3">
          <SectionLabel
            icon={Globe}
            title={sourcesCopy.linkSectionTitle}
            countLabel={sourcesCopy.sourceCount(linkSources.length)}
          />

          {linkSources.length > 0 ? (
            <div className="space-y-2">
              {linkSources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-[20px] border border-border/70 bg-muted/10 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {source.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {sourcesCopy.linkBadge}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {getHostname(source.url)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {getLinkStatusLabel(source)}
                        </Badge>
                        {source.status === "ready"
                          ? source.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={`${source.id}-${tag}`}
                                variant="outline"
                                className="rounded-full"
                              >
                                {tag}
                              </Badge>
                            ))
                          : null}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {source.status === "loading"
                          ? sourcesCopy.linkParsingHint
                          : source.status === "error"
                            ? source.errorMessage || sourcesCopy.linkResolveError
                            : truncateText(source.summary || source.url, 88)}
                      </p>
                      <p className="mt-2 truncate text-xs leading-5 text-muted-foreground">
                        {source.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditLinkDialog(source)}
                        aria-label={`${sourcesCopy.linkEditButton} ${source.title}`}
                      >
                        <PencilLine className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveSource(source.id)}
                        aria-label={`${sourcesCopy.remove} ${source.title}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStateCard title={sourcesCopy.linkEmpty} />
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-border/70 p-4">
        <Button onClick={() => openAddDialog()} className="h-11 w-full rounded-2xl">
          <Plus className="size-4" />
          {sourcesCopy.addButton}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelection}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="h-[min(90vh,860px)] max-w-[1200px] gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border/70 p-6 pb-5">
            <DialogTitle>{sourcesCopy.addDialogTitle}</DialogTitle>
            <DialogDescription>{sourcesCopy.addDialogDescription}</DialogDescription>
          </DialogHeader>

          <Tabs
            value={addDialogTab}
            onValueChange={(value) => setAddDialogTab(value as AddDialogTab)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 border-b border-border/70 px-6 py-4">
              <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl">
                <TabsTrigger value="knowledge">{sourcesCopy.knowledgeTab}</TabsTrigger>
                <TabsTrigger value="file">{sourcesCopy.fileTab}</TabsTrigger>
                <TabsTrigger value="link">{sourcesCopy.linkTab}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="knowledge"
              className="flex min-h-0 flex-1 flex-col px-6 py-5"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="shrink-0">
                  <h3 className="text-sm font-medium text-foreground">
                    {sourcesCopy.pickerTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {sourcesCopy.pickerDescription}
                  </p>
                </div>

                <div className="shrink-0 rounded-[24px] border border-border/70 bg-muted/10 p-4">
                  <div className="grid gap-3 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <label
                        htmlFor="knowledge-topic-filter"
                        className="text-sm font-medium"
                      >
                        {sourcesCopy.topicFilterLabel}
                      </label>
                      <select
                        id="knowledge-topic-filter"
                        value={knowledgeTopicFilter}
                        onChange={(event) => setKnowledgeTopicFilter(event.target.value)}
                        className="h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {topicOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="knowledge-tag-filter"
                        className="text-sm font-medium"
                      >
                        {sourcesCopy.tagFilterLabel}
                      </label>
                      <select
                        id="knowledge-tag-filter"
                        value={knowledgeTagFilter}
                        onChange={(event) => setKnowledgeTagFilter(event.target.value)}
                        className="h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {tagOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="knowledge-search" className="text-sm font-medium">
                        {sourcesCopy.searchLabel}
                      </label>
                      <Input
                        id="knowledge-search"
                        value={knowledgeSearch}
                        onChange={(event) => setKnowledgeSearch(event.target.value)}
                        placeholder={sourcesCopy.searchPlaceholder}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 rounded-[20px] border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  {sourcesCopy.pickerSelected(pendingKnowledgeIds.length)}
                </div>

                {filteredKnowledgeItems.length > 0 ? (
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-3">
                      {filteredKnowledgeItems.map((item) => {
                        const { visibleTags, hiddenCount } = getTagPreview(item.tags, 3);
                        const isAlreadyAdded = selectedKnowledgeIds.has(item.id);
                        const isPending = pendingKnowledgeIds.includes(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={isPending}
                            onClick={() => {
                              if (!isAlreadyAdded) {
                                togglePendingKnowledge(item.id);
                              }
                            }}
                            className={cn(
                              "w-full rounded-[24px] border px-5 py-4 text-left transition-colors",
                              isAlreadyAdded
                                ? "border-border/70 bg-muted/20 opacity-70"
                                : isPending
                                  ? "border-primary/40 bg-primary/8"
                                  : "border-border/70 bg-background hover:border-foreground/20 hover:bg-muted/20"
                            )}
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-medium text-foreground">
                                  {item.title}
                                </h3>

                                {item.summary ? (
                                  <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
                                    {truncateText(item.summary, 150)}
                                  </p>
                                ) : null}

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge variant="outline" className="rounded-full">
                                    {item.topic}
                                  </Badge>
                                  {visibleTags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="rounded-full">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {hiddenCount > 0 ? (
                                    <Badge variant="outline" className="rounded-full">
                                      +{hiddenCount}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2 lg:pt-0.5">
                                {isAlreadyAdded ? (
                                  <Badge className="rounded-full">
                                    {sourcesCopy.alreadyAdded}
                                  </Badge>
                                ) : (
                                  <span
                                    className={cn(
                                      "flex size-10 items-center justify-center rounded-full border transition-colors",
                                      isPending
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border/70 bg-muted/10 text-muted-foreground"
                                    )}
                                  >
                                    {isPending ? (
                                      <Check className="size-4" />
                                    ) : (
                                      <Plus className="size-4" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyStateCard title={sourcesCopy.pickerEmpty} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="file" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                <section className="rounded-[24px] border border-border/70 bg-muted/10 p-5">
                  <h3 className="text-sm font-medium text-foreground">
                    {sourcesCopy.fileSectionTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {sourcesCopy.fileDialogDescription}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 h-11 w-full rounded-2xl"
                  >
                    <Upload className="size-4" />
                    {sourcesCopy.fileDialogAction}
                  </Button>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {sourcesCopy.fileDialogHint}
                  </p>
                </section>

                <section className="space-y-3 rounded-[24px] border border-border/70 bg-background p-5">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {sourcesCopy.fileDialogListTitle}
                    </h3>
                  </div>

                  {fileSources.length > 0 ? (
                    <div className="space-y-2">
                      {fileSources.map((source) => (
                        <article
                          key={source.id}
                          className="rounded-[18px] border border-border/70 bg-muted/10 px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-medium text-foreground">
                                {source.title}
                              </h4>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="rounded-full">
                                  {source.fileMeta.type}
                                </Badge>
                                <Badge variant="outline" className="rounded-full">
                                  {formatFileSize(source.fileMeta.size)}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {sourcesCopy.fileUploadedAt}{" "}
                                {formatShortDate(source.fileMeta.uploadedAt)}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onRemoveSource(source.id)}
                              aria-label={`${sourcesCopy.remove} ${source.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard title={sourcesCopy.fileEmpty} />
                  )}
                </section>
              </div>
            </TabsContent>

            <TabsContent value="link" className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_360px]">
                <section className="rounded-[24px] border border-border/70 bg-background p-5">
                  <h3 className="text-sm font-medium text-foreground">
                    {linkDraft.id
                      ? sourcesCopy.linkDialogEditTitle
                      : sourcesCopy.linkDialogCreateTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {sourcesCopy.linkDialogTabDescription}
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="link-title" className="text-sm font-medium">
                        {sourcesCopy.linkTitleLabel}
                      </label>
                      <Input
                        id="link-title"
                        value={linkDraft.title}
                        onChange={(event) =>
                          setLinkDraft((currentDraft) => ({
                            ...currentDraft,
                            title: event.target.value,
                          }))
                        }
                        placeholder={sourcesCopy.linkTitlePlaceholder}
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="link-url" className="text-sm font-medium">
                        {sourcesCopy.linkUrlLabel}
                      </label>
                      <Input
                        id="link-url"
                        value={linkDraft.url}
                        onChange={(event) => {
                          setLinkDraft((currentDraft) => ({
                            ...currentDraft,
                            url: event.target.value,
                          }));
                          setLinkError("");
                        }}
                        placeholder={sourcesCopy.linkUrlPlaceholder}
                        className="h-10 rounded-xl"
                      />
                      {linkError ? (
                        <p className="text-xs leading-5 text-destructive">{linkError}</p>
                      ) : null}
                    </div>

                    {linkDraft.url.trim() ? (
                      <div className="rounded-[18px] border border-border/70 bg-muted/10 px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          {sourcesCopy.linkDomainLabel}
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {getHostname(linkDraft.url)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="space-y-3 rounded-[24px] border border-border/70 bg-muted/10 p-5">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {sourcesCopy.linkSectionTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {sourcesCopy.linkSectionDescription}
                    </p>
                  </div>

                  {linkSources.length > 0 ? (
                    <div className="space-y-2">
                      {linkSources.map((source) => (
                        <article
                          key={source.id}
                          className="rounded-[18px] border border-border/70 bg-background px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-medium text-foreground">
                                {source.title}
                              </h4>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="rounded-full">
                                  {getHostname(source.url)}
                                </Badge>
                                <Badge variant="outline" className="rounded-full">
                                  {getLinkStatusLabel(source)}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {source.status === "loading"
                                  ? sourcesCopy.linkParsingHint
                                  : source.status === "error"
                                    ? source.errorMessage || sourcesCopy.linkResolveError
                                    : truncateText(source.summary || source.url, 72)}
                              </p>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-border underline-offset-3 transition-colors hover:text-foreground"
                              >
                                <Link2 className="size-3.5" />
                                <span className="truncate">{truncateText(source.url, 42)}</span>
                              </a>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditLinkDialog(source)}
                                aria-label={`${sourcesCopy.linkEditButton} ${source.title}`}
                              >
                                <PencilLine className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onRemoveSource(source.id)}
                                aria-label={`${sourcesCopy.remove} ${source.title}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard title={sourcesCopy.linkEmpty} />
                  )}
                </section>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0 border-t border-border/70 bg-muted/30 px-6 py-4">
            <DialogClose render={<Button variant="outline" />}>
              {uiCopy.common.cancel}
            </DialogClose>
            <Button
              onClick={handleFooterPrimaryAction}
              disabled={footerPrimaryDisabled}
            >
              {footerPrimaryLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
