export type KnowledgeItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  createdAt: string;
  topic: string;
};

export type SourceType = "knowledge" | "file" | "link";

export type FileSourceMeta = {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

type WorkspaceSourceBase = {
  id: string;
  title: string;
  summary?: string;
  topic?: string;
  tags?: string[];
  note?: string;
};

export type KnowledgeSource = WorkspaceSourceBase & {
  type: "knowledge";
  knowledgeId: string;
  createdAt: string;
};

export type FileSource = WorkspaceSourceBase & {
  type: "file";
  fileMeta: FileSourceMeta;
};

export type LinkSource = WorkspaceSourceBase & {
  type: "link";
  url: string;
};

export type WorkspaceSource = KnowledgeSource | FileSource | LinkSource;

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
