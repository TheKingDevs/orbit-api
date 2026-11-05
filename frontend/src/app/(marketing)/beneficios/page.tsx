import type { Metadata } from "next";
import LandingContentLayout from "@components/landing/LandingContentLayout";
import { Icon, type IconName } from "@components/dashboard/icons";

export const metadata: Metadata = {
  title: "Benefícios — Orbit API",
  description: "Por que usar a Orbit API nas suas automações."
};

const BENEFITS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "key",
    title: "Uma chave, todos os recursos",
    description:
      "Downloads, IA, Canvas, stickers e utilitários no mesmo lugar. Integre uma vez e use tudo com a mesma API Key."
  },
  {
    icon: "tools",
    title: "Integração sem complicação",
    description:
      "Requisições HTTP diretas, exemplos em JavaScript e parâmetros claros. Sem SDK obrigatório e sem desenvolvimento complexo."
  },
  {
    icon: "sparkles",
    title: "Documentação interativa",
    description:
      "Personalize os parâmetros, veja o resultado ao vivo e copie a requisição pronta para colar no seu projeto."
  },
  {
    icon: "bot",
    title: "Feita para bots",
    description:
      "Compatível com WhatsApp, Telegram, Discord ou qualquer automação que consiga fazer uma chamada HTTP."
  }
];

export default function BeneficiosPage() {
  return (
    <LandingContentLayout title="Benefícios">
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
        Menos serviços para integrar, menos código para manter e mais recursos
        disponíveis para os seus bots.
      </p>

      <ul className="mt-10 grid gap-x-12 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <li
            key={benefit.title}
            className="flex gap-4 border-t border-white/[0.1] py-6"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-300"
              aria-hidden="true"
            >
              <Icon name={benefit.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold text-zinc-100">
                {benefit.title}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-zinc-400">
                {benefit.description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </LandingContentLayout>
  );
}
