"use client";

import Link from "next/link";
import { Icon } from "@components/dashboard/icons";
import { useUsageStats } from "@lib/auth/useUsage";

function shortEndpoint(path: string): string {
  return path.replace(/^\/api\//, "");
}

export default function UsageOverview() {
  const { data, loading, error } = useUsageStats(7);
  const summary = data?.summary;
  const daily = data?.usage.daily ?? [];
  const topEndpoints = data?.usage.topEndpoints ?? [];
  const used = summary?.dailyRequestsUsed ?? 0;
  const limit = summary?.limit ?? null;
  const periodTotal = daily.reduce((total, day) => total + day.count, 0);
  const peak = Math.max(1, ...daily.map((day) => day.count));
  const topEndpoint = topEndpoints[0];

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
            <Icon name="chart" className="h-5 w-5 text-violet-300" />
            Uso da API
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Um resumo do consumo da sua conta nos últimos 7 dias.
          </p>
        </div>

        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-violet-200"
        >
          Ver histórico completo
          <Icon name="chevron" className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
            <div className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
            <div className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
          </div>
          <div className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Requests hoje
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {limit === null ? used : `${used}/${limit}`}
              </p>
              {limit !== null && limit > 0 ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300"
                    style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }}
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Últimos 7 dias
              </p>
              <p className="mt-2 text-xl font-semibold text-white">{periodTotal}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {periodTotal === 1 ? "request processada" : "requests processadas"}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Endpoint líder
              </p>
              <p
                className="mt-2 truncate font-mono text-sm font-semibold text-zinc-100"
                title={topEndpoint?.path}
              >
                {topEndpoint ? shortEndpoint(topEndpoint.path) : "Nenhum ainda"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {topEndpoint
                  ? `${topEndpoint.count} ${topEndpoint.count === 1 ? "request" : "requests"}`
                  : "Use a API para acompanhar"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Consumo diário
              </p>
              {error ? (
                <span className="text-[11px] text-amber-300/80">
                  Métricas indisponíveis agora
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex h-20 items-end gap-1.5">
              {daily.length > 0 ? (
                daily.map((day) => (
                  <div
                    key={day.date}
                    className="group flex h-full min-w-0 flex-1 items-end"
                    title={`${day.count} ${day.count === 1 ? "request" : "requests"} em ${day.date}`}
                  >
                    <div
                      className="w-full rounded-t-[4px] bg-gradient-to-t from-violet-500/40 to-violet-300/80 transition group-hover:from-violet-400 group-hover:to-white"
                      style={{
                        height: `${day.count === 0 ? 3 : Math.max(8, Math.round((day.count / peak) * 100))}%`
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                  Nenhuma requisição registrada nos últimos 7 dias.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
