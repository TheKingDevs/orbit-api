"use client";

import Link from "next/link";
import { useUsageStats } from "@lib/auth/useUsage";
import { Icon } from "@components/dashboard/icons";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from "@lib/support";
import { useState } from "react";
import { apiFetch, ApiError } from "@lib/auth/http";
import { useCurrentTimestamp } from "@lib/useCurrentTimestamp";

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Para conhecer a Orbit API e começar a integrar.",
    price: "Grátis",
    limit: "100",
    unit: "requisições por dia",
    features: ["Integração em bots, aplicativos e automações via HTTP", "Uma API Key", "Playground e documentação"],
    accent: "border-white/[0.08]"
  },
  {
    id: "basic",
    name: "Basic",
    description: "Para aplicações que precisam de mais volume mensal.",
    price: "R$ 2,00/mês",
    limit: "1.500",
    unit: "requisições por mês",
    features: ["Integração em bots, aplicativos e automações via HTTP", "Uma API Key", "Prioridade média no suporte"],
    accent: "border-violet-400/25"
  },
  {
    id: "gold",
    name: "Gold",
    description: "Para uso contínuo da plataforma sem limite mensal.",
    price: "R$ 10,00/mês",
    limit: "Ilimitado",
    unit: "de requisições por mês",
    features: ["Integração em bots, aplicativos e automações via HTTP", "Uma API Key", "Prioridade máxima no suporte"],
    accent: "border-amber-300/20"
  }
] as const;

const planDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

function PlanCard({
  plan,
  currentPlan,
  expiresAt,
  currentTimestamp
}: {
  plan: (typeof PLANS)[number];
  currentPlan: string;
  expiresAt: string | null;
  currentTimestamp: number | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const expiryTime = expiresAt ? Date.parse(expiresAt) : NaN;
  const isCurrentPlanActive = plan.id === "free" || !Number.isFinite(expiryTime) || currentTimestamp === null || expiryTime > currentTimestamp;
  const current = currentPlan === plan.id && isCurrentPlanActive;

  async function startCheckout() {
    if (plan.id === "free" || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ checkoutUrl: string }>("/api/user/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id })
      });
      window.location.assign(result.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof ApiError ? checkoutError.message : "Não foi possível iniciar o pagamento. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <article className={`relative flex min-w-0 flex-col rounded-2xl border bg-[#151517] p-5 sm:p-6 ${plan.accent}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${plan.id === "gold" ? "bg-amber-300/10 text-amber-200" : "bg-violet-400/10 text-violet-200"}`}>
          <Icon name={plan.id === "gold" ? "sparkles" : "key"} className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-relaxed text-zinc-400">{plan.description}</p>
      <div className="mt-6 border-b border-white/[0.07] pb-5">
        <p className="text-2xl font-semibold tracking-tight text-white">{plan.limit}</p>
        <p className="mt-1 text-xs text-zinc-500">{plan.unit}</p>
        <p className="mt-3 text-sm font-semibold text-zinc-200">{plan.price}</p>
      </div>
      <ul className="mt-5 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300">
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
            {feature}
          </li>
        ))}
      </ul>
      {current ? (
        <div className="mt-6 space-y-2">
          <div className="flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
            Seu plano atual
          </div>
          {expiresAt && plan.id !== "free" ? (
            <p className="text-center text-[11px] text-zinc-500">
              Válido até {planDateFormatter.format(new Date(expiresAt))}
            </p>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={startCheckout} disabled={submitting} className="mt-6 flex h-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] text-xs font-medium text-violet-200 transition hover:bg-violet-400/[0.12] disabled:cursor-wait disabled:opacity-60">{submitting ? "Abrindo pagamento…" : "Contratar plano"}</button>
      )}
      {error ? <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p> : null}
    </article>
  );
}

export default function PlansPage() {
  const { data, loading } = useUsageStats(7);
  const currentTimestamp = useCurrentTimestamp();
  const currentPlan = data?.summary.plan ?? "free";
  const planExpiresAt = data?.summary.planExpiresAt ?? null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
          <Icon name="sparkles" className="h-4 w-4" />
          Planos Orbit
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Escolha o plano ideal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Compare os limites e as prioridades de suporte. O pagamento é processado com segurança pelo Mercado Pago. Para dúvidas, fale com o suporte em{" "}
          <a href={SUPPORT_WHATSAPP_URL} className="font-medium text-violet-300 hover:text-violet-200">
            {SUPPORT_PHONE}
          </a>.
        </p>
        <Link href="/app" className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-violet-200">
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
          Voltar ao dashboard
        </Link>
      </header>

      <div aria-live="polite" className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={loading ? "" : currentPlan}
            expiresAt={planExpiresAt}
            currentTimestamp={currentTimestamp}
          />
        ))}
      </div>

      {currentPlan === "free" && planExpiresAt && currentTimestamp !== null && Date.parse(planExpiresAt) <= currentTimestamp ? (
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100/80">
          Seu plano pago venceu e sua conta voltou ao Free. Escolha um plano pago para solicitar a renovação.
        </div>
      ) : null}

      <section className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#151517] p-4 sm:p-5">
        <Icon name="support" className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <p className="text-xs leading-relaxed text-zinc-400">
          Os planos pagos são válidos por um mês. Quando a validade termina, a conta retorna ao Free. Você pode contratar ou renovar diretamente pelo Mercado Pago, ou falar com o suporte em{" "}
          <a href={SUPPORT_WHATSAPP_URL} className="font-medium text-violet-300 hover:text-violet-200">
            {SUPPORT_PHONE}
          </a>.
        </p>
      </section>
    </div>
  );
}
