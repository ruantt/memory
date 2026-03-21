"use client";

import { useState } from "react";
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

type ImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { title: string; content: string }) => void;
  selectedNotebook: string;
  selectedTopic: string;
};

export function ImportModal({
  open,
  onOpenChange,
  onSave,
  selectedNotebook,
  selectedTopic,
}: ImportModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const resolvedNotebook =
    selectedNotebook === "All notebooks" ? "Inbox" : selectedNotebook;
  const resolvedTopic = selectedTopic === "All topics" ? "Quick Capture" : selectedTopic;

  function resetForm() {
    setTitle("");
    setContent("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  }

  function handleSave() {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    onSave({
      title: title.trim(),
      content: trimmedContent,
    });
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Import knowledge</DialogTitle>
          <DialogDescription>
            Add one note with a title and raw content. Data stays local in mock state for now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <label htmlFor="note-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="note-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled Note"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="note-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste or write the note content here..."
              className="min-h-40 rounded-2xl"
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
            This note will be placed in <span className="font-medium text-foreground">{resolvedNotebook}</span>
            {" / "}
            <span className="font-medium text-foreground">{resolvedTopic}</span>.
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={!content.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
