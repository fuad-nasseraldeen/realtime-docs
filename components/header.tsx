"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Realtime Docs
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {status === "loading" ? (
            <span className="text-slate-200">Loading...</span>
          ) : session ? (
            <>
              <Link
                href="/docs"
                className="text-slate-200 hover:text-white transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/profile"
                className="text-slate-200 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <Link
                href="https://github.com/fuad-nasseraldeen/realtime-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-white transition-colors"
              >
                GitHub
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-slate-200 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
