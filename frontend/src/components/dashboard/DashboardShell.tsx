"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@components/dashboard/Sidebar";
import { Icon } from "@components/dashboard/icons";
import AppLoading from "@components/dashboard/AppLoading";

function PathnamePageContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  // Move o foco para o conteúdo após navegação no cliente, sem rolar a página.
  // Na carga inicial o foco permanece no topo do documento.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

function SidebarFallback() {
  return (
    <aside
      aria-hidden="true"
      className="fixed inset-y-0 left-0 z-50 hidden w-[280px] border-r border-white/[0.07] bg-[#111113] lg:block"
    />
  );
}

export default function DashboardShell({ children, hideNavigation = false }: { children: ReactNode; hideNavigation?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen || hideNavigation) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [hideNavigation, sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <a
        href="#main-content"
        className="sr-only rounded-lg border border-violet-400/30 bg-[#151517] px-4 py-2 text-sm font-medium text-violet-200 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:outline-none focus:ring-2 focus:ring-violet-300/50"
      >
        Pular para o conteúdo
      </a>

      {!hideNavigation ? <Suspense fallback={<SidebarFallback />}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense> : null}

      <div className={hideNavigation ? "" : "lg:pl-[280px]"}>
        {!hideNavigation ? <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-[#0b0b0d]/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-zinc-300 transition hover:bg-violet-400/10 hover:text-violet-200"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <span className="text-base font-semibold tracking-tight">Orbit API</span>
        </header> : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[900px] px-4 py-6 focus:outline-none sm:px-6 lg:py-10"
        >
          <Suspense fallback={<AppLoading label="Carregando página..." />}>
            <PathnamePageContent>{children}</PathnamePageContent>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
