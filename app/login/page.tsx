import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-slate-400">
          Sign in to access your collaborative documents.
        </p>
      </div>

      <form className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-xs font-medium text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="block w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="block w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
          disabled
        >
          Log in (coming soon)
        </button>
      </form>

      <p className="text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-sky-400 hover:text-sky-300"
        >
          Create one
        </Link>
        .
      </p>
    </div>
  );
}

