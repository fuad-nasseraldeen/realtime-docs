"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDoc();
    }
  }, [status, router, id]);

  const fetchDoc = async () => {
    try {
      const res = await fetch(`/api/docs/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Document not found");
        } else if (res.status === 401) {
          router.push("/login");
        } else {
          setError("Failed to load document");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setDoc(data);
      setTitle(data.title);
      setContent(data.content || "");
    } catch (err) {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!doc) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) {
        throw new Error("Failed to save document");
      }

      const updated = await res.json();
      setDoc(updated);
    } catch (err) {
      setError("Failed to save document");
    } finally {
      setSaving(false);
    }
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

  if (error && !doc) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
        <Link
          href="/docs"
          className="text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          Back to docs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1 flex-1">
          <p className="text-xs text-slate-400">
            Document ID: <span className="font-mono text-slate-300">{id}</span>
          </p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold tracking-tight bg-transparent border-none outline-none text-slate-100 w-full"
            placeholder="Document title..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <Link
            href="/docs"
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            Back to docs
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-[320px] flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none font-mono"
          placeholder="Start typing your document content here..."
          rows={20}
        />
      </div>
    </div>
  );
}
