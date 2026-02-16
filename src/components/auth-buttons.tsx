"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-700"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      type="button"
    >
      Sign in with Google
    </button>
  );
}

export function UserMenu() {
  const { data } = useSession();

  if (!data?.user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300">{data.user.email}</span>
      <button
        className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
