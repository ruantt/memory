import type { KnowledgeItem, Message } from "@/lib/types";

export const initialKnowledgeItems: KnowledgeItem[] = [
  {
    id: "note-memory-loop",
    title: "Memory Loop for Weekly Research",
    summary:
      "A simple note processing loop: capture, condense, tag, and resurface insights for recurring projects.",
    content:
      "When research notes pile up, the useful pattern is not more folders. It is a loop. Capture raw inputs fast, condense them into one paragraph, attach 2 or 3 tags, and review the strongest ideas once a week. This keeps the library small enough to stay reusable.",
    tags: ["Workflow", "Research"],
    createdAt: "2026-03-18T09:20:00.000Z",
    notebook: "Research Ops",
    topic: "Knowledge Workflow",
  },
  {
    id: "note-product-reviews",
    title: "What Makes Product Reviews Reusable",
    summary:
      "Reusable reviews separate observation, evidence, and recommendation so later prompts can cite them cleanly.",
    content:
      "A reusable product review should not be a stream of opinions. Break each review into observation, supporting evidence, and a recommendation. That structure makes the note easier to summarize, compare, or turn into a draft without re-reading the entire source.",
    tags: ["Product", "Writing"],
    createdAt: "2026-03-16T14:45:00.000Z",
    notebook: "Product Notes",
    topic: "Review Frameworks",
  },
  {
    id: "note-prd-source",
    title: "PRD Inputs from Customer Interviews",
    summary:
      "Interview notes become PRD inputs when pain points, workflow blockers, and success signals are normalized.",
    content:
      "A good PRD source note extracts three things from interviews: the repeated pain point, the workflow step where it happens, and the success signal that tells you the problem is solved. If those three fields are consistent, drafting an outline becomes much faster.",
    tags: ["PM", "PRD"],
    createdAt: "2026-03-14T07:30:00.000Z",
    notebook: "Product Notes",
    topic: "Planning",
  },
  {
    id: "note-ai-writing",
    title: "Using AI Without Losing Original Thinking",
    summary:
      "Treat models as drafting partners after the reasoning is written down, not before.",
    content:
      "AI works best after the core reasoning already exists in notes. Capture your position first, then use the model to compress, rearrange, or reframe. This prevents generic outputs and keeps the final draft tied to your actual perspective.",
    tags: ["AI", "Writing"],
    createdAt: "2026-03-12T11:10:00.000Z",
    notebook: "AI Studio",
    topic: "Drafting",
  },
  {
    id: "note-reading-signals",
    title: "Signals Worth Keeping from Long Reads",
    summary:
      "Preserve claims, counterpoints, and follow-up questions instead of entire passages.",
    content:
      "Long reads are easier to reuse when the note only keeps three kinds of fragments: the central claim, the strongest counterpoint, and the next question it creates. Those fragments travel better across summaries, chat answers, and planning docs than large copied excerpts.",
    tags: ["Reading", "Synthesis"],
    createdAt: "2026-03-09T16:05:00.000Z",
    notebook: "Reading Desk",
    topic: "Synthesis",
  },
];

export const initialMessages: Message[] = [
  {
    id: "msg-1",
    role: "user",
    content: "What is the common pattern across these notes for building a useful personal knowledge base?",
    citations: [],
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "The shared pattern is compression before retrieval. Each note reduces a larger source into a small reusable unit: a summary, a few tags, and one clear takeaway. That makes later drafting or questioning much easier because the context is already cleaned up.",
    citations: [
      { id: "note-memory-loop", title: "Memory Loop for Weekly Research" },
      { id: "note-reading-signals", title: "Signals Worth Keeping from Long Reads" },
    ],
  },
  {
    id: "msg-3",
    role: "user",
    content: "How would you turn that into a workspace rule for writing with AI?",
    citations: [],
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Use the workspace as a second pass, not a first pass. Start from distilled notes, then ask for summaries, outlines, or reframing. The model should operate on your structured knowledge, not replace the act of structuring it.",
    citations: [
      { id: "note-ai-writing", title: "Using AI Without Losing Original Thinking" },
      { id: "note-prd-source", title: "PRD Inputs from Customer Interviews" },
    ],
  },
];

export const generationOutputs = {
  summary: [
    "This library favors short, high-signal notes that preserve reasoning while stripping away noise. Most items highlight a repeatable method rather than a one-off observation.",
    "Across research, writing, and planning, the strongest pattern is to normalize notes into reusable fragments: takeaway, evidence, and next action. That makes downstream AI drafting more grounded and less generic.",
  ],
  prdOutline: [
    {
      heading: "Problem",
      items: [
        "Knowledge scattered across long notes is hard to reuse when drafting or asking targeted questions.",
        "Users need a lightweight workspace that keeps notes, citations, and generated content in one place.",
      ],
    },
    {
      heading: "Goals",
      items: [
        "Let users browse compact knowledge cards and inspect details quickly.",
        "Support a focused workspace where selected notes can back chat replies and generated outputs.",
      ],
    },
    {
      heading: "MVP Scope",
      items: [
        "Local mock knowledge library with create, search, and detail view.",
        "Workspace with selected sources, chat transcript, and tabbed generation panel.",
      ],
    },
  ],
};
