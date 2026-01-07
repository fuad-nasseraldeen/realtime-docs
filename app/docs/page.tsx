"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDocs();
    }
  }, [status, router]);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) {
        throw new Error("Failed to fetch docs");
      }
      const data = await res.json();
      setDocs(data);
    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDocTitle }),
      });

      if (!res.ok) {
        throw new Error("Failed to create document");
      }

      const newDoc = await res.json();
      router.push(`/docs/${newDoc.id}`);
    } catch (err) {
      setError("Failed to create document");
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your docs</h1>
          <p className="text-sm text-slate-400">
            {docs.length === 0
              ? "Create your first document to get started"
              : `${docs.length} document${docs.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <form onSubmit={handleCreateDoc} className="flex gap-2">
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            placeholder="Document title..."
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 w-48"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !newDocTitle.trim()}
            className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "New document"}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {docs.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-sm text-slate-400">No documents yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
          {docs.map((doc) => (
            <Link
              key={doc.id}
              href={`/docs/${doc.id}`}
              className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-800/70 transition-colors"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-slate-100">{doc.title}</p>
                <p className="text-xs text-slate-400">
                  Last updated: {formatDate(doc.updatedAt)}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                Open
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
