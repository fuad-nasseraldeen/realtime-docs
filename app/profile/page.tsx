"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-200">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-white">Profile</h1>
        <p className="text-sm text-slate-200">
          Your account information
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-200">
            Email
          </label>
          <p className="text-sm text-white">{session.user.email}</p>
        </div>

        {session.user.id && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200">
              User ID
            </label>
            <p className="font-mono text-sm text-white">{session.user.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
