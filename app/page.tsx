export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Realtime Docs scaffold
      </h1>
      <p className="max-w-xl text-sm text-slate-300">
        This is a minimal starting point for a collaborative docs app. Auth and
        realtime syncing are intentionally omitted for now so you can focus on
        your data model and editor experience.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>
            <span className="font-medium">/login</span> &amp;{" "}
            <span className="font-medium">/signup</span> &mdash; auth
            placeholders.
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>
            <span className="font-medium">/docs</span> &mdash; document list
            placeholder.
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>
            <span className="font-medium">/docs/[id]</span> &mdash; editor
            surface placeholder.
          </span>
        </li>
      </ul>
    </div>
  );
}
