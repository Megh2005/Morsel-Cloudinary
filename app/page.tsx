"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleAuthR4edirect = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  const handleLearnMore = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] flex items-center justify-center py-10 px-4">
      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-4xl mx-auto text-center">
          <h1 className="mb-8 capitalize text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
            Now it is your turn to save every
            <br />
            <span className="text-sky-900 dark:text-sky-400">Morsel</span>
          </h1>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <button
              onClick={handleAuthR4edirect}
              className="w-full sm:w-auto rounded-xl px-8 py-3.5 font-bold text-base sm:text-lg bg-sky-800 text-white hover:bg-sky-900 border-2 border-slate-900 hover:shadow-md ease-in-out transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
