type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type KnowledgeEnrichPromptInput = {
  content: string;
  topic?: string;
  title?: string;
  tags?: string[];
};

type WorkspaceChatPromptInput = {
  question: string;
  sourceContext: string;
};

type WorkspaceGeneratePromptInput = {
  mode: "summary" | "prd";
  sourceContext: string;
};

function formatOptionalValue(label: string, value?: string) {
  return `${label}: ${value?.trim() ? value.trim() : "未提供"}`;
}

function formatOptionalTags(tags?: string[]) {
  const normalizedTags = (tags ?? []).map((tag) => tag.trim()).filter(Boolean);

  return `用户已填写标签: ${
    normalizedTags.length > 0 ? normalizedTags.join("、") : "未提供"
  }`;
}

export function buildKnowledgeEnrichMessages({
  content,
  topic,
  title,
  tags,
}: KnowledgeEnrichPromptInput): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是个人知识库的知识整理助手。",
        "目标：提炼标题、摘要、标签。",
        "必须只输出合法 json，不要输出 markdown、解释、代码块或额外文本。",
        'json 格式必须严格为 {"title":"","summary":"","tags":[""]}。',
        "规则：",
        "1. title 是适合作为知识卡片的中文标题，尽量控制在 18 个字以内。",
        "2. summary 是 1 到 2 句中文摘要，控制在 40 到 90 个字。",
        "3. tags 输出 2 到 4 个中文短标签，不重复，不带 #。",
        "4. 如果用户已经填写 title 或 tags，要把它们当作优先约束和上下文，不要机械重复。",
        "5. 如果原始内容不足以支持判断，也要给出尽量稳妥的标题、摘要和标签。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请基于以下信息做知识整理，并只返回 json。",
        formatOptionalValue("用户已填写标题", title),
        formatOptionalValue("topic", topic),
        formatOptionalTags(tags),
        "原始内容：",
        content,
      ].join("\n\n"),
    },
  ];
}

export function buildWorkspaceChatMessages({
  question,
  sourceContext,
}: WorkspaceChatPromptInput): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是个人知识库工作台中的问答助手。",
        "目标：只基于已选资料回答问题。",
        "规则：",
        "1. 只能使用提供的资料内容，不要补充外部常识，不要编造资料中没有的信息。",
        "2. 某些资料可能只有文件元信息或链接元信息，这不代表你看过文件正文或网页正文。",
        '3. 如果资料不足，请明确写出“根据当前已选资料，暂时无法确认”，并补充说明还缺什么信息。',
        "4. 输出中文，简洁自然，适合直接显示在聊天区。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "以下是当前已选资料，请只基于这些资料回答。",
        sourceContext,
        "",
        `用户问题：${question}`,
      ].join("\n"),
    },
  ];
}

export function buildWorkspaceGenerateMessages({
  mode,
  sourceContext,
}: WorkspaceGeneratePromptInput): DeepSeekMessage[] {
  const modeInstruction =
    mode === "summary"
      ? [
          "当前任务：生成总结。",
          "请输出 3 到 5 段中文总结。",
          "每段聚焦一个核心结论，每段 1 到 3 句。",
          "不要输出总标题，直接输出内容。",
        ]
      : [
          "当前任务：生成 PRD 提纲。",
          "请使用 Markdown 输出。",
          "使用 `##` 组织 4 到 6 个部分。",
          "每个部分使用 `-` 列出 2 到 4 条要点。",
          "内容要简洁、可用，适合个人知识库 / 工作台场景。",
        ];

  return [
    {
      role: "system",
      content: [
        "你是个人知识库工作台的内容生成助手。",
        "目标：根据已选资料生成内容。",
        "规则：",
        "1. 只能根据提供资料生成，不要补充资料中没有依据的事实。",
        "2. 某些资料可能只有文件元信息或链接元信息，不要假装看过正文。",
        "3. 资料不足时，要明确写出“待补充”或“基于当前资料的假设”。",
        "4. 输出中文，自然、清晰，适合产品工作流。",
        ...modeInstruction,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "以下是当前已选资料，请基于这些资料完成生成。",
        sourceContext,
        "",
        `生成模式：${mode === "summary" ? "总结" : "PRD 提纲"}`,
      ].join("\n"),
    },
  ];
}
