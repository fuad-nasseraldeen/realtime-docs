"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface Doc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  accessRole?: "owner" | "editor" | "viewer";
}

interface Collaborator {
  userId: string;
  email: string;
  role: "viewer" | "editor";
  addedAt: string;
}

export default function DocPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"viewer" | "editor">("editor");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [roleChangeNotification, setRoleChangeNotification] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingCollaborator, setRemovingCollaborator] = useState<string | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

  const fetchDoc = useCallback(async () => {
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
    } catch {
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/docs/${id}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data.collaborators || []);
      }
    } catch {
      // Silently fail - not critical
    }
  }, [id]);

  useEffect(() => {
    if (doc) {
      fetchCollaborators();
    }
  }, [doc, fetchCollaborators]);

  // Poll for role changes
  useEffect(() => {
    if (!doc || status !== "authenticated") return;

    const checkRoleChanges = async () => {
      try {
        const res = await fetch(`/api/docs/${id}`);
        if (res.ok) {
          const updatedDoc = await res.json();
          const oldRole = doc.accessRole;
          const newRole = updatedDoc.accessRole;

          if (oldRole && newRole && oldRole !== newRole) {
            setRoleChangeNotification(`Your role has been updated to: ${newRole}`);
            setTimeout(() => setRoleChangeNotification(null), 5000);
            // Re-fetch document to update permissions
            await fetchDoc();
          }
        }
      } catch {
        // Silently fail
      }
    };

    const interval = setInterval(checkRoleChanges, 3000);
    return () => clearInterval(interval);
  }, [doc, id, status, fetchDoc]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDoc();
    }
  }, [status, router, fetchDoc]);

  useEffect(() => {
    if (!doc) return;

    // Clean up previous Yjs instance if document ID changed
    if (providerRef.current) {
      providerRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    // Initialize Yjs
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const ytext = ydoc.getText("content");
    ytextRef.current = ytext;

    // Connect to WebSocket server
    const provider = new WebsocketProvider("ws://localhost:1234", id, ydoc, {
      connect: true,
    });
    providerRef.current = provider;

    console.log(`[Yjs] Initializing for document: ${id}`);

    // Handle WebSocket errors
    provider.on("connection-error", (event: Event) => {
      console.error(`[Yjs] Connection error:`, event);
      setConnectionStatus("disconnected");
    });

    provider.on("connection-close", (event: CloseEvent | null) => {
      if (event) {
        console.log(`[Yjs] Connection closed:`, event);
      } else {
        console.log(`[Yjs] Connection closed`);
      }
      setConnectionStatus("disconnected");
    });

    // Track if we're currently updating from Yjs to prevent feedback loop
    let isUpdatingFromYjs = false;

    // Update textarea from Yjs
    const syncYjsToTextarea = () => {
      if (!textareaRef.current || isUpdatingFromYjs) return;
      
      const ytextValue = ytext.toString();
      const textareaValue = textareaRef.current.value;
      
      if (textareaValue !== ytextValue) {
        isUpdatingFromYjs = true;
        const cursorPos = textareaRef.current.selectionStart;
        const scrollPos = textareaRef.current.scrollTop;
        
        textareaRef.current.value = ytextValue;
        
        // Restore cursor position
        const newPos = Math.min(cursorPos, ytextValue.length);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newPos, newPos);
            textareaRef.current.scrollTop = scrollPos;
          }
          isUpdatingFromYjs = false;
        }, 10);
      }
    };

    // Observe Yjs text changes - fires for ALL changes (local and remote)
    const textObserver = () => {
      console.log(`[Yjs] Text observer fired, length: ${ytext.length}`);
      syncYjsToTextarea();
    };
    ytext.observe(textObserver);

    // Also listen for document updates to catch remote changes
    ydoc.on("update", (update: Uint8Array, origin: any) => {
      console.log(`[Yjs] Document update, origin:`, origin);
      // Sync if it's a remote update (not from our own input)
      if (origin !== "user-input") {
        syncYjsToTextarea();
      }
    });

    // Handle connection status
    provider.on("status", (event: { status: string }) => {
      console.log(`[Yjs] Connection status: ${event.status}`);
      setConnectionStatus(event.status as "connected" | "connecting" | "disconnected");
      
      if (event.status === "connected") {
        // Wait for sync, then initialize content
        setTimeout(() => {
          if (ytext.length === 0 && doc.content) {
            // No content from WebSocket, use database content
            ytext.insert(0, doc.content);
          }
          syncYjsToTextarea();
        }, 500);
      }
    });

    // Handle textarea input - sync to Yjs
    const handleInput = (e: Event) => {
      if (isUpdatingFromYjs) return; // Prevent feedback loop
      
      const target = e.target as HTMLTextAreaElement;
      const newValue = target.value;
      const currentYjsValue = ytext.toString();

      if (newValue !== currentYjsValue) {
        console.log(`[Yjs] Textarea changed, syncing to Yjs: ${newValue.length} chars`);
        // Replace entire content - Yjs will optimize and sync correctly
        ydoc.transact(() => {
          // Clear existing content
          const len = ytext.length;
          if (len > 0) {
            ytext.delete(0, len);
          }
          // Insert new content
          if (newValue.length > 0) {
            ytext.insert(0, newValue);
          }
        }, "user-input");
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("input", handleInput);
    }

    // Initial sync
    const initTimeout = setTimeout(() => {
      syncYjsToTextarea();
    }, 200);

    return () => {
      clearTimeout(initTimeout);
      ytext.unobserve(textObserver);
      if (provider) {
        provider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
      if (textarea) {
        textarea.removeEventListener("input", handleInput);
      }
    };
  }, [doc, id]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError("");
    setShareSuccess("");
    setSharing(true);

    try {
      const res = await fetch(`/api/docs/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail, role: shareRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShareError(data.error || "Failed to share document");
        setSharing(false);
        return;
      }

      const wasUpdate = collaborators.some(c => c.email === shareEmail);
      setShareSuccess(
        wasUpdate
          ? `Role updated for ${shareEmail} to ${shareRole}`
          : `Document shared with ${shareEmail} as ${shareRole}`
      );
      setShareEmail("");
      setCollaborators(data.collaborators || []);
    } catch {
      setShareError("Failed to share document");
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    if (!doc || !ytextRef.current) return;
    
    // Check if user can edit
    if (doc.accessRole === "viewer") {
      setError("Viewers cannot save documents");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const content = ytextRef.current.toString();
      const res = await fetch(`/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) {
        throw new Error("Failed to save document");
      }

      const updated = await res.json();
      // Don't update doc state to avoid re-initializing Yjs
      // The Yjs content is already synced, we just update the title if needed
      if (updated.title !== title) {
        setTitle(updated.title);
      }
    } catch {
      setError("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (collaboratorUserId: string, newRole: "viewer" | "editor") => {
    const collaborator = collaborators.find(c => c.userId === collaboratorUserId);
    if (!collaborator) return;

    setUpdatingRole(collaboratorUserId);
    setShareError("");
    setShareSuccess("");

    try {
      const res = await fetch(`/api/docs/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: collaborator.email, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShareError(data.error || "Failed to update role");
        return;
      }

      setShareSuccess(`Role updated for ${collaborator.email} to ${newRole}`);
      setCollaborators(data.collaborators || []);
    } catch {
      setShareError("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string) => {
    const collaborator = collaborators.find(c => c.userId === collaboratorUserId);
    if (!collaborator) return;

    if (!confirm(`Are you sure you want to remove ${collaborator.email} from this document?`)) {
      return;
    }

    setRemovingCollaborator(collaboratorUserId);
    setShareError("");
    setShareSuccess("");

    try {
      const res = await fetch(`/api/docs/${id}/collaborators?userId=${collaboratorUserId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setShareError(data.error || "Failed to remove collaborator");
        return;
      }

      setShareSuccess(`${collaborator.email} has been removed`);
      setCollaborators(data.collaborators || []);
    } catch {
      setShareError("Failed to remove collaborator");
    } finally {
      setRemovingCollaborator(null);
    }
  };

  const handleDelete = async () => {
    if (!doc || doc.accessRole !== "owner") {
      setError("Only the owner can delete this document");
      return;
    }

    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/docs/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete document");
      }

      // Redirect to docs list after successful deletion
      router.push("/docs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
      setDeleting(false);
    }
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-300">
              Document ID: <span className="font-mono text-slate-200">{id}</span>
            </p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-900/30 text-green-300 border border-green-800"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800"
                  : "bg-red-900/30 text-red-300 border border-red-800"
              }`}
            >
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                ? "Connecting"
                : "Disconnected"}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={doc?.accessRole === "viewer"}
            className="text-xl font-semibold tracking-tight bg-transparent border-none outline-none text-white w-full placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Document title..."
          />
        </div>
        <div className="flex items-center gap-2">
          {doc && doc.accessRole !== "viewer" && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          {doc && doc.accessRole === "owner" && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
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

      {connectionStatus === "disconnected" && (
        <div className="rounded-md bg-yellow-900/20 border border-yellow-800 px-3 py-2 text-sm text-yellow-300">
          ⚠️ Real-time sync is disabled. Please start the WebSocket server by running{" "}
          <code className="bg-slate-800 px-1 py-0.5 rounded text-xs">npm run realtime</code> in a separate terminal.
        </div>
      )}

      {roleChangeNotification && (
        <div className="rounded-md bg-blue-900/20 border border-blue-800 px-3 py-2 text-sm text-blue-300 flex items-center justify-between">
          <span>{roleChangeNotification}</span>
          <button
            onClick={() => setRoleChangeNotification(null)}
            className="ml-2 text-blue-200 hover:text-blue-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex min-h-[320px] flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            {doc && doc.accessRole === "viewer" && (
              <div className="rounded-md bg-yellow-900/20 border border-yellow-800 px-3 py-2 text-sm text-yellow-300">
                You are viewing this document. Editing is disabled.
              </div>
            )}
            <textarea
              ref={textareaRef}
              disabled={doc?.accessRole === "viewer"}
              className="flex-1 rounded-md border border-slate-700 bg-slate-800 p-3 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Start typing your document content here..."
              rows={20}
            />
          </div>
        </div>

        <div className="space-y-4">
          {doc && doc.accessRole === "owner" && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Share Document</h3>
              <form onSubmit={handleShare} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value as "viewer" | "editor")}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={sharing}
                  className="w-full inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sharing ? "Sharing..." : "Share"}
                </button>
                {shareError && (
                  <p className="text-xs text-red-300">{shareError}</p>
                )}
                {shareSuccess && (
                  <p className="text-xs text-green-300">{shareSuccess}</p>
                )}
              </form>
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Collaborators</h3>
            <div className="space-y-2">
              <div className="text-xs text-slate-300">
                <span className="font-medium">Owner:</span>{" "}
                <span className="text-slate-200">{doc && doc.accessRole === "owner" ? "You" : "Document owner"}</span>
              </div>
              {collaborators.length > 0 ? (
                collaborators.map((collab) => (
                  <div key={collab.userId} className="flex items-center justify-between gap-2 p-2 rounded bg-slate-800/50">
                    <div className="flex-1">
                      <div className="text-xs text-slate-200 font-medium">{collab.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Role: <span className="text-slate-300">{collab.role}</span>
                      </div>
                    </div>
                    {doc && doc.accessRole === "owner" && (
                      <div className="flex items-center gap-1">
                        <select
                          value={collab.role}
                          onChange={(e) => handleUpdateRole(collab.userId, e.target.value as "viewer" | "editor")}
                          disabled={updatingRole === collab.userId}
                          className="text-[10px] rounded border border-slate-600 bg-slate-700 text-white px-1.5 py-0.5 disabled:opacity-50"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => handleRemoveCollaborator(collab.userId)}
                          disabled={removingCollaborator === collab.userId}
                          className="text-[10px] text-red-300 hover:text-red-200 px-1.5 py-0.5 rounded hover:bg-red-900/20 disabled:opacity-50"
                          title="Remove collaborator"
                        >
                          {removingCollaborator === collab.userId ? "..." : "×"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No collaborators yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
