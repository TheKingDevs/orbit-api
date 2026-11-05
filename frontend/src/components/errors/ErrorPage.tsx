"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import OrbitLogo from "@components/landing/OrbitLogo";

interface ErrorPageProps {
  code: string;
  title: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
}

export default function ErrorPage({
  code,
  title,
  message,
  detail,
  onRetry
}: ErrorPageProps) {
  const pathname = usePathname();

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0a0a0c] px-6 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(167, 139, 250, 0.16), transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(124, 58, 237, 0.12), transparent 50%),
            linear-gradient(135deg, #12101a 0%, #08080c 100%)
          `
        }}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#111113]/90 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight"
        >
          <OrbitLogo className="h-8 w-auto" alt="Orbit API" />
          Orbit
          <span className="rounded border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-300">
            API
          </span>
        </Link>

        <span className="mt-8 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
          Erro {code}
        </span>

        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
          {title}
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
          {message}
        </p>

        {pathname ? (
          <p className="mt-4 break-all font-mono text-xs text-zinc-600">
            {pathname}
          </p>
        ) : null}

        {detail ? (
          <p className="mt-2 font-mono text-xs text-zinc-600">{detail}</p>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex h-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-5 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
            >
              Tentar novamente
            </button>
          ) : null}

          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            Voltar ao início
          </Link>

          <Link
            href="/app"
            className="flex h-11 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            Abrir dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
