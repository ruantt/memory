export type KnowledgeItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  createdAt: string;
  notebook: string;
  topic: string;
};

export type Citation = {
  id: string;
  title: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
};
