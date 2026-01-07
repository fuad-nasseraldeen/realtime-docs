import Link from "next/link";

interface DocPageProps {
  params: {
    id: string;
  };
}

export default function DocPage({ params }: DocPageProps) {
  const { id } = params;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-slate-400">
            Document ID:{" "}
            <span className="font-mono text-slate-300">{id}</span>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Collaborative editor placeholder
          </h1>
          <p className="text-sm text-slate-400">
            Replace this with a realtime editor (e.g. TipTap / Lexical / custom)
            wired to your backend.
          </p>
        </div>
        <Link
          href="/docs"
          className="text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          Back to docs
        </Link>
      </div>

      <div className="flex min-h-[320px] flex-col gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Editor surface
        </p>
        <div className="flex-1 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
          Start typing here once the editor is wired up. This is just a static
          placeholder for now.
        </div>
      </div>
    </div>
  );
}

