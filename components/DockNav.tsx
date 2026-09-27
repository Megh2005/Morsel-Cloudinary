"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, User, LogIn, LogOut, Camera, Refrigerator } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DockNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams?.get("tab") || "scanner";

  const handleTabClick = (e: React.MouseEvent, tab: string) => {
    if (status !== "authenticated") {
      e.preventDefault();
      router.push("/auth");
      return;
    }
    if (pathname === "/dashboard") {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("morsel_switch_tab", { detail: { tab } })
      );
      const newUrl = `/dashboard?tab=${tab}`;
      window.history.pushState(null, "", newUrl);
    }
  };

  const navItems = [
    {
      name: "Home",
      icon: Home,
      href: "/",
      tab: "home",
      show: true,
    },
    {
      name: "Scan Food",
      icon: Camera,
      href: status === "authenticated" ? "/dashboard?tab=scanner" : "/auth",
      tab: "scanner",
      show: true,
    },
    {
      name: "My Fridge",
      icon: Refrigerator,
      href: status === "authenticated" ? "/dashboard?tab=inventory" : "/auth",
      tab: "inventory",
      show: true,
    },
    {
      name: "Profile",
      icon: User,
      href: "/profile",
      tab: "profile",
      show: status === "authenticated",
    },
    {
      name: "Sign In",
      icon: LogIn,
      href: "/auth",
      tab: "auth",
      show: status === "unauthenticated",
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border-2 border-slate-900 shadow-2xl dark:bg-slate-900/95 dark:border-slate-700">
        {navItems.map((item, idx) => {
          if (!item.show) return null;
          const isActive =
            item.name === "Home"
              ? pathname === "/"
              : pathname === "/dashboard"
              ? currentTab === item.tab
              : pathname === item.href;

          return (
            <Tooltip key={`${item.name}-${idx}`}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.name !== "Home" && item.tab) {
                      handleTabClick(e, item.tab);
                    }
                  }}
                >
                  <DockItem item={item} isActive={isActive} isButton={false} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {status === "authenticated" && (
          <>
            <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => signOut()}>
                  <DockItem
                    item={{ name: "Logout", icon: LogOut }}
                    isActive={false}
                    isButton
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}

function DockItem({
  item,
  isActive,
  isButton = false,
}: {
  item: any;
  isActive: boolean;
  isButton?: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "p-2.5 rounded-full transition-all",
          isActive
            ? "bg-sky-900 text-white shadow-md dark:bg-sky-700"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
          isButton &&
            "text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        )}
      >
        <Icon size={20} />
      </motion.div>
      {isActive && (
        <motion.div
          layoutId="activeDot"
          className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-sky-900 dark:bg-sky-400"
        />
      )}
    </div>
  );
}
