import Link from "next/link";

const mockDocs = [
  { id: "getting-started", title: "Getting started", updatedAt: "Just now" },
  { id: "team-notes", title: "Team notes", updatedAt: "2 hours ago" },
  { id: "roadmap", title: "Roadmap Q1", updatedAt: "Yesterday" },
] as const;

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your docs</h1>
          <p className="text-sm text-slate-400">
            This is a placeholder list &mdash; hook it up to real data later.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
          disabled
        >
          New document (coming soon)
        </button>
      </div>

      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
        {mockDocs.map((doc) => (
          <Link
            key={doc.id}
            href={`/docs/${doc.id}`}
            className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-800/70"
          >
            <div className="space-y-0.5">
              <p className="font-medium text-slate-100">{doc.title}</p>
              <p className="text-xs text-slate-400">
                Last updated: {doc.updatedAt}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Open
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

