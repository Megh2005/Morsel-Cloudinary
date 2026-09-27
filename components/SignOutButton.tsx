"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth");
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-lg px-4 py-3 font-medium bg-red-600 text-white hover:bg-red-700 border-2 border-slate-900 hover:shadow-md transition-all"
    >
      Sign Out
    </button>
  );
}
