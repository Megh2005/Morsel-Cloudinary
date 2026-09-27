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
    <div className="relative h-screen">
      {/* Hero Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <div className="max-w-[70vw] text-center">
          <h1 className="mb-8 capitalize text-4xl font-bold sm:text-6xl lg:text-7xl text-slate-900 dark:text-white">
            Now it is your turn to save every
            <br />
            <span className="text-sky-900 dark:text-sky-400">Morsel</span>
          </h1>

          <div className="flex flex-wrap justify-center gap-8">
            <button
              onClick={handleAuthR4edirect}
              className="rounded-lg px-6 py-3 font-medium bg-sky-800 text-white hover:bg-sky-900 border-2 border-slate-900 hover:shadow-md ease-in-out transition-all"
            >
              Get Started
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
