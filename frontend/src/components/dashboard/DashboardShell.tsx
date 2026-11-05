"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@components/dashboard/Sidebar";
import { Icon } from "@components/dashboard/icons";
import ThemeToggle from "@components/theme/ThemeToggle";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-transparent text-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[280px]">
        <header className="dashboard-mobile-header sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-zinc-300 transition hover:bg-violet-400/10 hover:text-violet-200"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold tracking-tight">Orbit API</span>
          <ThemeToggle className="ml-auto" />
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
