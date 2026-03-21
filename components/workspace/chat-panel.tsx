"use client";

import { useState } from "react";
import { MessageSquareText, SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uiCopy } from "@/lib/copy/zh-cn";
import type { Citation, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  initialMessages: Message[];
  sourceCitations: Citation[];
};

export function ChatPanel({ initialMessages, sourceCitations }: ChatPanelProps) {
  const chatCopy = uiCopy.workspace.chat;
  const [messages, setMessages] = useState(initialMessages);
  const [prompt, setPrompt] = useState("");

  function handleSend() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const nextMessages: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedPrompt,
        citations: [],
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: chatCopy.mockResponse,
        citations: sourceCitations.slice(0, 2),
      },
    ];

    setMessages(nextMessages);
    setPrompt("");
  }

  return (
    <section className="flex min-h-[72vh] flex-col rounded-[28px] border border-border/70 bg-background/95">
      <div className="border-b border-border/70 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <MessageSquareText className="size-3.5" />
          {chatCopy.eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold">{chatCopy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {chatCopy.description}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={message.id}
              className={cn("flex", isAssistant ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-7",
                  isAssistant
                    ? "border border-border/70 bg-muted/30 text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {isAssistant && message.citations.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.citations.map((citation) => (
                      <Badge key={citation.id} variant="outline" className="rounded-full">
                        {citation.title}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/70 bg-muted/20 p-4">
        <div className="rounded-[24px] border border-border/70 bg-background p-3">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={chatCopy.inputPlaceholder}
            className="min-h-24 border-none p-0 shadow-none focus-visible:ring-0"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{chatCopy.hint}</p>
            <Button onClick={handleSend} disabled={!prompt.trim()}>
              <SendHorizontal className="size-4" />
              {chatCopy.send}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
