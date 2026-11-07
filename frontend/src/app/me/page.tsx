'use client';

import Link from 'next/link';
import SessionGate from '@components/SessionGate';
import { Icon, type IconName } from '@components/dashboard/icons';
import { useAuth } from '@lib/auth/AuthProvider';
import {
  useUsageStats,
  type UsageDay,
  type UsageEndpoint,
  type UsageRequest
} from '@lib/auth/useUsage';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  gold: 'Gold'
};

const ROLE_LABELS: Record<string, string> = {
  public: 'Usuário',
  admin: 'Administrador',
  owner: 'Proprietário'
};

const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short'
});
const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

function planLabel(plan: string | undefined): string {
  if (!plan) return 'Free';

  return PLAN_LABELS[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}

function roleLabel(role: string | undefined): string {
  if (!role) return 'Usuário';

  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function dayNumber(date: string): string {
  return dayFormatter.format(new Date(`${date}T12:00:00`));
}

function shortDate(date: string): string {
  return shortDateFormatter.format(new Date(`${date}T12:00:00`)).replace('.', '');
}

function formatTimestamp(timestamp: number): string {
  return timestampFormatter.format(new Date(timestamp)).replace('.', '');
}

function formatDuration(durationMs: number): string {
  return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)} s` : `${durationMs} ms`;
}

function statusTone(status: number): string {
  if (status >= 500) return 'border-red-400/20 bg-red-400/[0.08] text-red-300';
  if (status >= 400) return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';

  return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
}

function methodTone(method: string): string {
  return method === 'GET'
    ? 'border-violet-400/20 bg-violet-400/[0.08] text-violet-200'
    : 'border-sky-400/20 bg-sky-400/[0.08] text-sky-200';
}

interface SummaryCardProps {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
}

function SummaryCard({ icon, label, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#151517] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon name={icon} className="h-4 w-4 text-violet-300" />
        {label}
      </div>
      <p className="mt-3 truncate text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{detail}</p>
    </div>
  );
}

function UsageChart({ daily, loading }: { daily: UsageDay[]; loading: boolean }) {
  const peak = daily.reduce((highest, day) => Math.max(highest, day.count), 0);
  const scale = Math.max(1, peak);
  const total = daily.reduce((sum, day) => sum + day.count, 0);
  const firstDay = daily[0]?.date;
  const lastDay = daily[daily.length - 1]?.date;

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
            <Icon name="chart" className="h-5 w-5 text-violet-300" />
            Uso da API
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Requisições processadas nos últimos {daily.length || 14} dias.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-white">{total}</p>
          <p className="text-xs text-zinc-500">no período</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 h-48 animate-pulse rounded-xl bg-white/[0.03]" />
      ) : (
        <div className="mt-7 flex h-48 items-end gap-1.5 sm:gap-2">
          {daily.map((day) => {
            const height = day.count === 0 ? 3 : Math.max(8, Math.round((day.count / scale) * 100));

            return (
              <div
                key={day.date}
                className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
                title={`${day.count} ${day.count === 1 ? 'request' : 'requests'} em ${shortDate(day.date)}`}
              >
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-[4px] bg-gradient-to-t from-violet-500/50 to-violet-300/90 transition-all duration-300 group-hover:from-violet-400 group-hover:to-white"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="truncate text-center text-[10px] text-zinc-600">
                  {dayNumber(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-4 text-xs text-zinc-500">
        <span>
          {firstDay && lastDay ? `${shortDate(firstDay)} — ${shortDate(lastDay)}` : 'Últimos 14 dias'}
        </span>
        <span>Pico de {peak} requests em um dia</span>
      </div>
    </section>
  );
}

function TopEndpoints({
  endpoints,
  loading
}: {
  endpoints: UsageEndpoint[];
  loading: boolean;
}) {
  const highest = endpoints.reduce((max, endpoint) => Math.max(max, endpoint.count), 0);
  const scale = Math.max(1, highest);

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
        <Icon name="bot" className="h-5 w-5 text-violet-300" />
        Endpoints mais usados
      </h2>
      <p className="mt-2 text-sm text-zinc-400">Os recursos que mais movimentam sua conta.</p>

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 animate-pulse rounded-lg bg-white/[0.03]" />
          ))}
        </div>
      ) : endpoints.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {endpoints.map((endpoint) => (
            <li key={endpoint.path}>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="truncate font-mono text-xs text-zinc-300"
                  title={endpoint.path}
                >
                  {endpoint.path.replace(/^\/api\//, '')}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{endpoint.count}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-violet-400/60"
                  style={{ width: `${(endpoint.count / scale) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">Nenhum endpoint usado ainda.</p>
          <p className="mt-1 text-xs text-zinc-600">Seu ranking aparecerá aqui.</p>
        </div>
      )}
    </section>
  );
}

function RequestHistory({
  requests,
  loading
}: {
  requests: UsageRequest[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
            <Icon name="clock" className="h-5 w-5 text-violet-300" />
            Histórico de requisições
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Acompanhe os últimos acessos feitos com sua conta.
          </p>
        </div>
        {!loading && requests.length > 0 ? (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11px] text-zinc-500">
            {requests.length} recentes
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <>
          <div className="mt-6 hidden grid-cols-[minmax(0,1fr)_72px_78px_120px] gap-3 border-b border-white/[0.06] pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 sm:grid">
            <span>Endpoint</span>
            <span>Método</span>
            <span>Status</span>
            <span className="text-right">Quando</span>
          </div>

          <ul className="divide-y divide-white/[0.05]">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-2 py-3.5 sm:grid sm:grid-cols-[minmax(0,1fr)_72px_78px_120px] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <p
                    className="truncate font-mono text-xs text-zinc-200"
                    title={request.path}
                  >
                    {request.path}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {formatDuration(request.durationMs)}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:contents">
                  <span
                    className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${methodTone(request.method)}`}
                  >
                    {request.method}
                  </span>
                  <span
                    className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusTone(request.status)}`}
                  >
                    {request.status}
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-500 sm:ml-0 sm:text-right">
                    {formatTimestamp(request.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center">
          <Icon name="archive" className="h-9 w-9 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-zinc-300">
            Nenhuma requisição registrada
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
            Use um endpoint da Orbit API para começar a acompanhar seu consumo por aqui.
          </p>
        </div>
      )}
    </section>
  );
}

function AccountContent() {
  const { user } = useAuth();
  const { data, loading, error } = useUsageStats(14);
  const summary = data?.summary;
  const plan = summary?.plan ?? user?.plan;
  const role = summary?.role ?? user?.role;
  const used = summary?.dailyRequestsUsed ?? user?.dailyRequests ?? 0;
  const limit = summary?.limit ?? user?.limit ?? null;
  const remaining =
    summary?.remainingRequests ?? (limit === null ? null : Math.max(0, limit - used));
  const requestsLabel = limit === null ? 'Ilimitado' : `${remaining ?? 0}/${limit}`;
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName.slice(0, 1).toUpperCase();
  const daily = data?.usage.daily ?? [];
  const endpoints = data?.usage.topEndpoints ?? [];
  const requests = data?.usage.recent ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-violet-200"
          >
            <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
            Voltar ao dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Minha conta
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Acompanhe seu plano, consumo e histórico de requisições.
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#151517] px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/15 text-sm font-semibold text-violet-200">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200">
          Não foi possível carregar seu histórico agora. Os dados exibidos podem estar
          desatualizados.
        </div>
      ) : null}

      {summary?.isSuspended ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
          Sua conta está suspensa. Entre em contato com o suporte para mais informações.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon="sparkles"
          label="Plano"
          value={planLabel(plan)}
          detail="Plano atual da conta"
        />
        <SummaryCard
          icon="key"
          label="Requests hoje"
          value={requestsLabel}
          detail={limit === null ? 'Sem limite diário' : `${used} usados de ${limit}`}
        />
        <SummaryCard
          icon="user"
          label="Cargo"
          value={roleLabel(role)}
          detail="Permissões da conta"
        />
        <SummaryCard
          icon="chart"
          label="Total de requests"
          value={loading && !data ? '—' : String(data?.usage.totalRequests ?? 0)}
          detail="Registrados recentemente"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <UsageChart daily={daily} loading={loading} />
        <TopEndpoints endpoints={endpoints} loading={loading} />
      </div>

      <RequestHistory requests={requests} loading={loading} />
    </div>
  );
}

export default function Me() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <SessionGate>
        <AccountContent />
      </SessionGate>
    </div>
  );
}
