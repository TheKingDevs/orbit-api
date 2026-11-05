import type { Metadata } from "next";
import Link from "next/link";
import ShinyButton from "@components/landing/ShinyButton";
import { Icon } from "@components/dashboard/icons";

export const metadata: Metadata = {
  title: "Orbit API — Tudo na mesma órbita",
  description: "Recursos de API para bots e automações."
};

export default function Home() {
  return (
    <main className="orbit-home-hero page-enter">
      <svg
        aria-hidden="true"
        className="orbit-home-horizon"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="orbit-home-horizon-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--orbit-hero-arc)" stopOpacity="0.12" />
            <stop offset="48%" stopColor="var(--orbit-hero-core)" stopOpacity="0.96" />
            <stop offset="72%" stopColor="var(--orbit-hero-arc)" stopOpacity="0.82" />
            <stop offset="100%" stopColor="var(--orbit-hero-arc)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path
          className="orbit-home-horizon-glow"
          d="M -120 -22 C 420 -24 870 74 1170 318 C 1465 558 1695 870 2025 1175"
          fill="none"
          stroke="url(#orbit-home-horizon-gradient)"
          strokeLinecap="round"
          strokeWidth="34"
        />
        <path
          className="orbit-home-horizon-core"
          d="M -120 -22 C 420 -24 870 74 1170 318 C 1465 558 1695 870 2025 1175"
          fill="none"
          stroke="url(#orbit-home-horizon-gradient)"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>

      <div className="orbit-home-content mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center text-center">
        <h1 className="orbit-home-title max-w-6xl text-balance text-[clamp(3.25rem,5.6vw,5.6rem)] font-normal leading-[0.98] tracking-[-0.045em] text-white">
          Tudo o que seu bot precisa,
          <br className="hidden sm:block" />
          <span>na mesma órbita</span>
        </h1>

        <p className="orbit-home-description mt-6 max-w-2xl text-[15px] leading-relaxed text-white/75 sm:text-lg">
          Integre mídia, inteligência artificial, criação visual e utilitários
          com uma única API para seus bots e projetos.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
          <ShinyButton
            href="/app"
            label="Começar agora"
            fillColor="var(--shiny-fill)"
            labelColor="var(--shiny-label)"
            accentColor="var(--shiny-accent)"
            accentSoftColor="var(--shiny-accent-soft)"
            sweepDuration={7.5}
            easeDuration={0.45}
            arcWidth={4}
            cornerRadius={18}
            showSpeckle={false}
            showSheen={false}
          />
          <Link
            href="/recursos"
            className="group orbit-home-secondary inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300"
          >
            Explorar recursos
            <Icon name="chevron" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

    </main>
  );
}
