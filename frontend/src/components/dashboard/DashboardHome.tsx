"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@components/dashboard/icons";
import { useUsageStats } from "@lib/auth/useUsage";

const CHANNEL_URL = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL;

const ROLE_LABELS: Record<string, string> = {
  public: "Usuário",
  admin: "Administrador",
  owner: "Proprietário"
};

interface DashboardHomeProps {
  apiKey: string | null;
  keyLoading: boolean;
  keyError: boolean;
  revealed: boolean;
  onToggleReveal: () => void;
  plan: string | undefined;
  role: string | undefined;
  dailyRequests: number | undefined;
  limit: number | null | undefined;
}

function planLabel(plan: string | undefined): string {
  if (!plan) return "Free";

  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function roleLabel(role: string | undefined): string {
  if (!role) return "Usuário";

  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export default function DashboardHome({
  apiKey,
  keyLoading,
  keyError,
  revealed,
  onToggleReveal,
  plan,
  role,
  dailyRequests,
  limit
}: DashboardHomeProps) {
  const { data: usageData } = useUsageStats(7);
  const summary = usageData?.summary;
  const currentPlan = summary?.plan ?? plan;
  const currentRole = summary?.role ?? role;
  const usedRequests = summary?.dailyRequestsUsed ?? dailyRequests ?? 0;
  const requestLimit = summary?.limit ?? limit ?? null;
  const remainingRequests =
    summary?.remainingRequests ??
    (requestLimit === null ? null : Math.max(0, requestLimit - usedRequests));
  const label = planLabel(currentPlan);
  const requestsLabel =
    requestLimit === null ? "Ilimitado" : `${remainingRequests ?? 0} / ${requestLimit}`;
  const usagePercent =
    requestLimit && requestLimit > 0
      ? Math.min(100, Math.round((usedRequests / requestLimit) * 100))
      : 0;
  const canUseKey = Boolean(apiKey) && !keyError;
  const [copied, setCopied] = useState(false);

  function copyToken() {
    if (!canUseKey || !apiKey) return;

    navigator.clipboard
      .writeText(apiKey)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Gerencie seu acesso à API e acompanhe os dados principais da sua conta.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-start">
      <section className="app-panel p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-violet-300">
            <Icon name="sparkles" className="h-4 w-4" />
            Resumo da conta
          </div>

          <dl className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-zinc-400">Plano</dt>
              <dd>
                <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-xs font-semibold text-violet-200">
                  {label}
                </span>
              </dd>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-zinc-400">Restantes hoje</dt>
                <dd className="text-sm font-semibold text-white">{requestsLabel}</dd>
              </div>
              {requestLimit !== null && requestLimit > 0 ? (
                <div
                  role="progressbar"
                  aria-label="Requisições utilizadas hoje"
                  aria-valuemin={0}
                  aria-valuemax={requestLimit}
                  aria-valuenow={Math.min(usedRequests, requestLimit)}
                  aria-valuetext={`${Math.min(usedRequests, requestLimit)} de ${requestLimit} requisições utilizadas`}
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                >
                  <div
                    className="h-full rounded-full bg-violet-400 transition-[width] duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-zinc-400">Cargo</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                <Icon name="user" className="h-4 w-4 text-zinc-500" />
                {roleLabel(currentRole)}
              </dd>
            </div>
          </dl>

          <Link
            href="/me"
            className="mt-6 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] text-xs font-medium text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] hover:text-violet-200"
          >
            Ver histórico completo
            <Icon name="chevron" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <div className="space-y-5">
        <section className="app-panel p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold text-white">API Key</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            Use sua chave no header Authorization e mantenha-a em local seguro.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={copyToken}
              disabled={!canUseKey}
              title="Copiar API Key"
              aria-label="Copiar API Key"
            className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--surface-subtle)] px-4 text-left transition hover:border-violet-400/30 hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="truncate font-mono text-sm tracking-[0.18em] text-zinc-400">
                {keyLoading
                  ? "Carregando..."
                  : keyError
                    ? "Não foi possível carregar sua chave."
                    : revealed && apiKey
                      ? apiKey
                      : "•".repeat(22)}
              </span>
              <span
                aria-live="polite"
                className={`ml-auto flex shrink-0 items-center gap-1.5 text-[10px] ${
                  copied ? "text-emerald-400" : keyError ? "text-red-300" : "text-zinc-600"
                }`}
              >
                {copied ? "Copiado!" : <Icon name="copy" className="h-4 w-4" />}
              </span>
            </button>
            <button
              type="button"
              onClick={onToggleReveal}
              disabled={!canUseKey}
              aria-label={revealed ? "Ocultar API Key" : "Mostrar API Key"}
              className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-violet-400/10 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name={revealed ? "eyeOff" : "eye"} className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5">
            {label === "Free" ? (
              <Link
                href="/me"
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-4 py-3 text-center text-sm font-semibold leading-relaxed text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
              >
                Assine um plano para aumentar seus limites!
              </Link>
            ) : (
              <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] text-sm font-medium text-violet-200">
                <Icon name="key" className="h-4 w-4" />
                Plano {label} ativo
              </div>
            )}
          </div>
        </section>

        <section className="app-panel p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-white">
            <Icon name="whatsapp" className="h-5 w-5 text-violet-300" />
            Canal de atualizações
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            Acompanhe as novidades da Orbit API: funcionalidades, melhorias,
            manutenções e possíveis instabilidades nos serviços.
          </p>

          {CHANNEL_URL ? (
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] text-sm font-medium text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              <Icon name="whatsapp" className="h-4 w-4" />
              Entrar no canal do WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm font-medium text-zinc-500"
            >
              <Icon name="whatsapp" className="h-4 w-4" />
              Link do canal indisponível
            </button>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
