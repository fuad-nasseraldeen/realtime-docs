"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  accessRole?: "owner" | "editor" | "viewer";
}

export default function DocsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newDocNotification, setNewDocNotification] = useState<string | null>(null);

  const fetchDocs = useCallback(async (showNotification = false) => {
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) {
        throw new Error("Failed to fetch docs");
      }
      const data = await res.json();
      
      // Check for new documents (documents that weren't in the previous list)
      setDocs((prevDocs) => {
        if (showNotification && prevDocs.length > 0) {
          const previousDocIds = new Set(prevDocs.map(d => d.id));
          const newDocs = data.filter((d: Doc) => !previousDocIds.has(d.id));
          if (newDocs.length > 0) {
            const docTitles = newDocs.map((d: Doc) => d.title).join(", ");
            setNewDocNotification(`New document${newDocs.length > 1 ? "s" : ""} shared with you: ${docTitles}`);
            setTimeout(() => setNewDocNotification(null), 5000);
          }
        }
        return data;
      });
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDocs();
      
      // Poll for new shared documents every 5 seconds
      const interval = setInterval(() => {
        fetchDocs(true); // Show notifications for new documents
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, router, fetchDocs]);

  const handleCreateDoc = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    setCreating(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDocTitle.trim() || "Untitled" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setError("Unauthorized. Please log in again.");
          router.push("/login");
          return;
        }
        throw new Error(data.error || "Failed to create document");
      }

      const newDoc = await res.json();
      setNewDocTitle("");
      router.push(`/docs/${newDoc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
      setCreating(false);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setDeletingId(docId);
    setError("");
    
    try {
      const res = await fetch(`/api/docs/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete document");
      }

      // Refresh the docs list
      await fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
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
        <p className="text-sm text-slate-200">Loading...</p>
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
          <h1 className="text-xl font-semibold tracking-tight text-white">Your docs</h1>
          <p className="text-sm text-slate-200">
            {docs.length === 0
              ? "Create your first document to get started"
              : `${docs.length} document${docs.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) {
                handleCreateDoc();
              }
            }}
            placeholder="Document title (optional)..."
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 w-48"
            disabled={creating}
          />
          <button
            onClick={() => handleCreateDoc()}
            disabled={creating}
            className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "New Document"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {newDocNotification && (
        <div className="rounded-md bg-green-900/20 border border-green-800 px-3 py-2 text-sm text-green-300 flex items-center justify-between">
          <span>{newDocNotification}</span>
          <button
            onClick={() => setNewDocNotification(null)}
            className="ml-2 text-green-200 hover:text-green-100"
          >
            ×
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-sm text-slate-200">No documents yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-800/70 transition-colors group"
            >
              <Link
                href={`/docs/${doc.id}`}
                className="flex items-center justify-between gap-2 flex-1"
              >
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{doc.title}</p>
                    {doc.accessRole && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          doc.accessRole === "owner"
                            ? "bg-blue-900/30 text-blue-300 border border-blue-800"
                            : doc.accessRole === "editor"
                            ? "bg-green-900/30 text-green-300 border border-green-800"
                            : "bg-slate-700/30 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {doc.accessRole}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Last updated: {formatDate(doc.updatedAt)}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  Open
                </span>
              </Link>
              {doc.accessRole === "owner" && (
                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  disabled={deletingId === doc.id}
                  className="ml-2 px-2 py-1 text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete document"
                >
                  {deletingId === doc.id ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
