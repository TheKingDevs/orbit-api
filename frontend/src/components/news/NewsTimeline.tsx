import Link from "next/link";
import { Icon } from "@components/dashboard/icons";
import UsageOverview from "@components/news/UsageOverview";
import { APP_VERSION } from "@lib/appVersion";
import { NEWS } from "@lib/news";

export default function NewsTimeline() {
  return (
    <div className="mx-auto w-full">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#151517] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          <Icon name="star" className="h-3.5 w-3.5 text-violet-300" />
          Acompanhe as novidades
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          Novidades
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-400">
          Tudo o que foi implementado na Orbit API, em ordem cronológica.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-500">
          Versão atual
          <span className="font-semibold text-zinc-300">{APP_VERSION}</span>
        </span>
      </header>

      <UsageOverview />

      <ol className="relative mt-10 space-y-10">
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-[5px] top-2 w-px bg-white/[0.08]"
        />

        {NEWS.map((entry, index) => (
          <li key={entry.version} className="relative pl-8">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ${
                index === 0
                  ? "bg-violet-400 shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
                  : "bg-zinc-600"
              }`}
            />

            <div className="flex flex-wrap items-center gap-2">
              <time className="text-[12px] font-medium text-zinc-500">
                {entry.date}
              </time>
              {index === 0 && (
                <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
                  Atual
                </span>
              )}
            </div>

            <h2 className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold text-zinc-100">
              Versão: {entry.version}
              <span className="text-[13px] font-normal text-zinc-500">
                · {entry.title}
              </span>
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {entry.summary}
            </p>

            <ul className="mt-3 space-y-2">
              {entry.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-sm leading-relaxed text-zinc-400"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-zinc-600"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {entry.link && (
              <Link
                href={entry.link.href}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                {entry.link.label}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
