"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import OrbitLogo from "@components/landing/OrbitLogo";
import LiquidNavbar, { NimbusIcons } from "@components/landing/LiquidNavbar";
import ThemeToggle from "@components/theme/ThemeToggle";
import { useTheme } from "@components/theme/ThemeProvider";

const NAV_LINKS = [
  { label: "Início", href: "/", icon: NimbusIcons.home, fx: "glow" as const },
  { label: "Recursos", href: "/recursos", icon: NimbusIcons.globe, fx: "spin" as const },
  { label: "Benefícios", href: "/beneficios", icon: NimbusIcons.sparkles, fx: "pop" as const },
  { label: "Como funciona", href: "/como-funciona", icon: NimbusIcons.flow, fx: "wave" as const },
  { label: "FAQ", href: "/faq", icon: NimbusIcons.help, fx: "pop" as const }
];

export default function LandingHeader() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    NAV_LINKS.findIndex((link) => link.href === pathname)
  );

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="landing-header mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-5 lg:flex lg:h-[72px] lg:justify-between lg:gap-5 lg:py-0">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5 rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <OrbitLogo className="h-8 w-auto" />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Orbit
          </span>
          <span className="rounded-md border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-violet-300">
            API
          </span>
        </Link>

        <nav className="landing-header-nav col-span-2 order-3 mx-auto max-w-full lg:order-none">
          <LiquidNavbar
            items={NAV_LINKS}
            defaultActive={0}
            active={activeIndex}
            tone={theme}
            compact={false}
            sound={false}
            className="landing-liquid-nav"
          />
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            aria-label="Abrir dashboard"
            className="landing-header-cta flex h-10 items-center justify-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/[0.12] px-4 text-[13px] font-semibold text-violet-100 shadow-[0_8px_28px_-18px_rgba(139,142,255,0.85)] backdrop-blur-xl transition hover:border-violet-200/45 hover:bg-violet-300/[0.2] hover:text-white"
          >
            <span className="landing-header-cta-label">Dashboard</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
