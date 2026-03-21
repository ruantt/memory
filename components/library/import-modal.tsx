"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { uiCopy } from "@/lib/copy/zh-cn";

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: {
    title: string;
    content: string;
    topic: string;
    tags: string[];
  }) => Promise<void> | void;
  selectedTopic: string;
  availableTopics: string[];
};

function normalizeTag(tag: string) {
  return tag.replace(/\s+/g, " ").trim();
}

export function ImportModal({
  open,
  onOpenChange,
  onSave,
  selectedTopic,
  availableTopics,
}: ImportModalProps) {
  const filtersCopy = uiCopy.library.filters;
  const modalCopy = uiCopy.library.modal;
  const resolvedTopic =
    selectedTopic === filtersCopy.allTopics
      ? filtersCopy.defaultTopic
      : selectedTopic;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState(resolvedTopic);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSubmitError("");
      setIsSaving(false);
    }

    onOpenChange(nextOpen);
  }

  function appendTags(rawValue: string) {
    const nextTags = rawValue
      .split(/[，,]/)
      .map((tag) => normalizeTag(tag))
      .filter(Boolean);

    if (nextTags.length === 0) {
      return;
    }

    setTags((currentTags) => {
      const mergedTags = [...currentTags];

      nextTags.forEach((tag) => {
        if (!mergedTags.includes(tag)) {
          mergedTags.push(tag);
        }
      });

      return mergedTags;
    });
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    setTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    appendTags(tagInput);
  }

  async function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent || isSaving) {
      return;
    }

    const normalizedTopic = topic || filtersCopy.defaultTopic;
    const pendingTags = tagInput
      .split(/[，,]/)
      .map((tag) => normalizeTag(tag))
      .filter(Boolean);
    const nextTags = Array.from(new Set([...tags, ...pendingTags]));

    setSubmitError("");
    setIsSaving(true);

    try {
      await onSave({
        title: title.trim(),
        content: trimmedContent,
        topic: normalizedTopic,
        tags: nextTags,
      });
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "AI 整理失败，请稍后再试。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[min(88vh,820px)] max-w-[960px] gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border/70 p-6 pb-4">
          <DialogTitle>{modalCopy.title}</DialogTitle>
          <DialogDescription>{modalCopy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="note-title" className="text-sm font-medium">
                  {modalCopy.titleLabel}
                </label>
                <Input
                  id="note-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={modalCopy.titlePlaceholder}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="note-content" className="text-sm font-medium">
                  {modalCopy.contentLabel}
                </label>
                <Textarea
                  id="note-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={modalCopy.contentPlaceholder}
                  className="min-h-[320px] rounded-[24px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="note-topic" className="text-sm font-medium">
                  {modalCopy.topicLabel}
                </label>
                <select
                  id="note-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {availableTopics.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {modalCopy.currentTopicHint} {modalCopy.topicHelp}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="note-tags" className="text-sm font-medium">
                  {modalCopy.tagsLabel}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="note-tags"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={modalCopy.tagsPlaceholder}
                    className="h-11 flex-1 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendTags(tagInput)}
                    className="h-11 shrink-0 rounded-xl px-4"
                  >
                    <Plus className="size-4" />
                    {modalCopy.addTag}
                  </Button>
                </div>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="rounded-full px-2.5 py-1 text-xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`${modalCopy.removeTag} ${tag}`}
                          className="ml-1.5 rounded-full text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <p className="text-xs leading-5 text-muted-foreground">
                  {modalCopy.tagsHint}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 bg-muted/30 px-6 py-4">
          {submitError ? (
            <p className="mr-auto text-sm text-destructive">{submitError}</p>
          ) : isSaving ? (
            <p className="mr-auto text-sm text-muted-foreground">AI 正在整理内容...</p>
          ) : null}
          <DialogClose render={<Button variant="outline" />}>
            {uiCopy.common.cancel}
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
            {isSaving ? "AI 整理中..." : modalCopy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
