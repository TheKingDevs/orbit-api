"use client";

import Link from "next/link";
import { useUsageStats } from "@lib/auth/useUsage";
import { Icon } from "@components/dashboard/icons";

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Para conhecer a Orbit API e começar a integrar.",
    limit: "100",
    unit: "requisições por dia",
    features: ["Acesso aos endpoints da plataforma", "Uma API Key", "Playground e documentação"],
    accent: "border-white/[0.08]"
  },
  {
    id: "basic",
    name: "Basic",
    description: "Para aplicações que precisam de mais volume diário.",
    limit: "Sem limite diário",
    unit: "de requisições",
    features: ["Acesso aos endpoints da plataforma", "Uma API Key", "Sem limite diário de requisições"],
    accent: "border-violet-400/25"
  },
  {
    id: "gold",
    name: "Gold",
    description: "Para uso contínuo da plataforma sem limite diário.",
    limit: "Sem limite diário",
    unit: "de requisições",
    features: ["Acesso aos endpoints da plataforma", "Uma API Key", "Sem limite diário de requisições"],
    accent: "border-amber-300/20"
  }
] as const;

function PlanCard({ plan, currentPlan }: { plan: (typeof PLANS)[number]; currentPlan: string }) {
  const current = currentPlan === plan.id;

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
        <p className="mt-3 text-xs font-medium text-zinc-400">Preço sob consulta</p>
      </div>
      <ul className="mt-5 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300">
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex h-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-zinc-400">
        {current ? "Seu plano atual" : "Fale com a equipe para contratar"}
      </div>
    </article>
  );
}

export default function PlansPage() {
  const { data, loading } = useUsageStats(7);
  const currentPlan = data?.summary.plan ?? "free";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
          <Icon name="sparkles" className="h-4 w-4" />
          Planos Orbit
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Escolha o plano ideal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Compare os limites disponíveis para sua conta. Os valores comerciais são informados pela equipe.
        </p>
        <Link href="/app" className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-violet-200">
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
          Voltar ao dashboard
        </Link>
      </header>

      <div aria-live="polite" className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} currentPlan={loading ? "" : currentPlan} />
        ))}
      </div>

      <section className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#151517] p-4 sm:p-5">
        <Icon name="support" className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <p className="text-xs leading-relaxed text-zinc-400">
          O plano Free permite 100 requisições por dia. Basic e Gold não possuem limite diário configurado na plataforma. Preços, pagamento e ativação são tratados pela equipe.
        </p>
      </section>
    </div>
  );
}
