export function splitGeneratedParagraphs(content: string) {
  const normalized = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [content.trim()].filter(Boolean);
}

export function parseGeneratedSections(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: Array<{ heading: string; items: string[] }> = [];
  let currentSection: { heading: string; items: string[] } | null = null;

  const pushCurrentSection = () => {
    if (!currentSection) {
      return;
    }

    if (currentSection.items.length === 0) {
      currentSection.items.push("待补充");
    }

    sections.push(currentSection);
  };

  lines.forEach((line) => {
    if (line.startsWith("## ")) {
      pushCurrentSection();
      currentSection = {
        heading: line.replace(/^##\s+/, "").trim() || "未命名章节",
        items: [],
      };
      return;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);

    if (bullet) {
      if (!currentSection) {
        currentSection = { heading: "PRD 提纲", items: [] };
      }

      currentSection.items.push(bullet[1].trim());
      return;
    }

    if (!currentSection) {
      currentSection = {
        heading: line.replace(/[:：]$/, "").trim() || "PRD 提纲",
        items: [],
      };
      return;
    }

    currentSection.items.push(line);
  });

  pushCurrentSection();

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      heading: "PRD 提纲",
      items: content
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    },
  ];
}
