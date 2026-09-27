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

  const handleItemClick = (
    e: React.MouseEvent,
    item: { href: string; dashboardTab?: string },
  ) => {
    // Only intercept when user is ALREADY on /dashboard AND clicking a dashboard-internal tab
    if (item.dashboardTab && pathname === "/dashboard") {
      if (status !== "authenticated") {
        e.preventDefault();
        router.push("/auth");
        return;
      }
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("morsel_switch_tab", {
          detail: { tab: item.dashboardTab },
        }),
      );
      router.replace(item.href, { scroll: false });
      return;
    }

    // For all other routes (Profile, Home, Auth, or navigating to Dashboard from another page):
    // Do NOT preventDefault! Let standard Next.js page navigation occur smoothly.
  };

  const navItems = [
    {
      name: "Home",
      icon: Home,
      href: "/",
      show: true,
    },
    {
      name: "Scan Food",
      icon: Camera,
      href: "/dashboard?tab=scanner",
      dashboardTab: "scanner",
      show: true,
    },
    {
      name: "My Fridge",
      icon: Refrigerator,
      href: "/dashboard?tab=inventory",
      dashboardTab: "inventory",
      show: true,
    },
    {
      name: "Profile",
      icon: User,
      href: "/profile",
      show: status === "authenticated",
    },
    {
      name: "Sign In",
      icon: LogIn,
      href: "/auth",
      show: status === "unauthenticated",
    },
  ];

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1rem)]">
      <div className="flex items-center gap-1 sm:gap-2.5 bg-white/95 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-slate-900 shadow-2xl dark:bg-slate-900/95 dark:border-slate-700">
        {navItems.map((item, idx) => {
          if (!item.show) return null;
          const isActive =
            item.name === "Home"
              ? pathname === "/"
              : pathname === "/dashboard" && item.dashboardTab
              ? currentTab === item.dashboardTab
              : pathname === item.href;

          return (
            <Tooltip key={`${item.name}-${idx}`}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={(e) => handleItemClick(e, item)}
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
            <div className="w-0.5 h-5 sm:h-6 bg-slate-300 dark:bg-slate-700 mx-0.5 sm:mx-1" />
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
          "p-2 sm:p-2.5 rounded-full transition-all",
          isActive
            ? "bg-sky-900 text-white shadow-md dark:bg-sky-700"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
          isButton &&
            "text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        )}
      >
        <Icon size={18} className="sm:w-5 sm:h-5" />
      </motion.div>
      {isActive && (
        <motion.div
          layoutId="activeDot"
          className="absolute -bottom-0.5 sm:-bottom-1 w-1.5 h-1.5 rounded-full bg-sky-900 dark:bg-sky-400"
        />
      )}
    </div>
  );
}
