"use client";

import { useState } from "react";
import { MessageSquareText, SendHorizontal } from "lucide-react";
import { chatWithWorkspace } from "@/lib/ai/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uiCopy } from "@/lib/copy/zh-cn";
import type { Citation, Message, WorkspaceSource } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  sourceCitations: Citation[];
  selectedSources: WorkspaceSource[];
  allowWebFallback: boolean;
};

function getCitationGroupLabel(citation: Citation) {
  if (citation.scope === "web") {
    return "联网补充";
  }

  if (citation.sourceType === "knowledge") {
    return "本地知识库";
  }

  if (citation.sourceType === "file") {
    return "本地资料";
  }

  return "网页链接";
}

export function ChatPanel({
  sourceCitations,
  selectedSources,
  allowWebFallback,
}: ChatPanelProps) {
  const chatCopy = uiCopy.workspace.chat;
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sourceCitationMap = new Map(
    sourceCitations.map((citation) => [citation.id, citation.title])
  );

  async function handleSend() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedPrompt,
      citations: [],
    };
    const pendingMessageId = crypto.randomUUID();

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        id: pendingMessageId,
        role: "assistant",
        content: "正在基于已选资料生成回答...",
        citations: [],
      },
    ]);
    setPrompt("");

    setIsLoading(true);

    try {
      const response = await chatWithWorkspace({
        question: trimmedPrompt,
        selectedSources,
        allowWebFallback,
      });

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === pendingMessageId
            ? {
                ...message,
                content: response.answer,
                citations: response.citations,
                usedWebFallback: response.usedWebFallback,
              }
            : message
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "问答失败，请稍后再试。";

      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === pendingMessageId
            ? {
                ...currentMessage,
                content: message,
                citations: [],
              }
            : currentMessage
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background/95 xl:min-h-0 xl:h-full">
      <div className="shrink-0 border-b border-border/70 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <MessageSquareText className="size-3.5" />
          {chatCopy.eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold">{chatCopy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {chatCopy.description}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border/70 bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
            {sourceCitations.length > 0
              ? "已接入真实问答。现在可以基于左侧已选资料直接提问。"
              : allowWebFallback
                ? "可直接提问；如果本地资料不足，系统会按需联网补充。"
                : "先在左侧选择资料，再开始提问。"}
          </div>
        ) : null}

        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          const resolvedCitations = message.citations.map((citation) => ({
            ...citation,
            title: sourceCitationMap.get(citation.id) ?? citation.title,
          }));
          const citationGroups = Array.from(
            resolvedCitations.reduce(
              (groups, citation) => {
                const groupLabel = getCitationGroupLabel(citation);
                const groupItems = groups.get(groupLabel) ?? [];
                groupItems.push(citation);
                groups.set(groupLabel, groupItems);
                return groups;
              },
              new Map<string, Citation[]>()
            )
          );

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
                {isAssistant && message.usedWebFallback ? (
                  <div className="mb-3">
                    <Badge variant="outline" className="rounded-full">
                      已使用联网补充
                    </Badge>
                  </div>
                ) : null}

                <p className="whitespace-pre-wrap">{message.content}</p>

                {isAssistant && resolvedCitations.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {chatCopy.citationsLabel}
                    </p>
                    <div className="space-y-2">
                      {citationGroups.map(([groupLabel, citations]) => (
                        <div key={groupLabel} className="space-y-2">
                          <p className="text-xs text-muted-foreground">{groupLabel}</p>
                          <div className="flex flex-wrap gap-2">
                            {citations.map((citation) => (
                              <Badge
                                key={citation.id}
                                variant="outline"
                                className="rounded-full"
                              >
                                {citation.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border/70 bg-background/95 p-4">
        <div className="rounded-[24px] border border-border/70 bg-background p-3">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={chatCopy.inputPlaceholder}
            className="min-h-24 border-none p-0 shadow-none focus-visible:ring-0"
          />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? allowWebFallback
                  ? "AI 正在分析资料，必要时会联网补充..."
                  : "AI 正在基于已选资料生成回答..."
                : sourceCitations.length > 0
                  ? allowWebFallback
                    ? chatCopy.hintWithWebFallback
                    : chatCopy.hint
                  : allowWebFallback
                    ? chatCopy.emptyHintWithWebFallback
                    : chatCopy.emptyHint}
            </p>
            <Button onClick={handleSend} disabled={isLoading || !prompt.trim()}>
              <SendHorizontal className="size-4" />
              {isLoading ? "回答中..." : chatCopy.send}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
