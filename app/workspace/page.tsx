import { WorkspacePage } from "@/components/workspace/workspace-page";

type WorkspaceProps = {
  searchParams: Promise<{
    source?: string | string[];
  }>;
};

export default async function Workspace({ searchParams }: WorkspaceProps) {
  const resolvedSearchParams = await searchParams;
  const focusedSourceId = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;

  return <WorkspacePage focusedSourceId={focusedSourceId} />;
}
