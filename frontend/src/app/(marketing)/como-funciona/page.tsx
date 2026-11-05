import type { Metadata } from "next";
import Link from "next/link";
import LandingContentLayout from "@components/landing/LandingContentLayout";

export const metadata: Metadata = {
  title: "Como funciona — Orbit API",
  description: "Veja como começar a integrar a Orbit API."
};

const STEPS = [
  {
    title: "Entre com sua conta Google",
    description:
      "Acesse o dashboard em poucos segundos, sem formulários e sem complicação."
  },
  {
    title: "Copie sua API Key",
    description:
      "Sua chave fica disponível no dashboard e pode ser enviada no header Authorization."
  },
  {
    title: "Faça a primeira chamada",
    description:
      "Escolha um endpoint, teste no playground da documentação e copie o exemplo pronto."
  }
];

export default function ComoFuncionaPage() {
  return (
    <LandingContentLayout title="Como funciona">
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
        Sem instalação, sem configuração complexa. A Orbit cuida da
        infraestrutura para você focar no seu bot.
      </p>

      <ol className="mt-10">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-5 border-t border-white/[0.1] py-6 sm:gap-7"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-400/30 bg-violet-400/[0.12] text-sm font-semibold text-violet-100">
              {index + 1}
            </span>
            <span>
              <span className="block text-base font-semibold text-zinc-100">
                {step.title}
              </span>
              <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-zinc-400">
                {step.description}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-col items-start gap-4 border-t border-white/[0.1] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
          Crie sua conta, copie sua API Key e comece a integrar downloads, IA,
          Canvas e stickers ainda hoje.
        </p>
        <Link
          href="/app"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[0.14] px-5 text-sm font-semibold text-violet-100 transition hover:border-violet-300/45 hover:bg-violet-400/20 hover:text-white"
        >
          Acessar dashboard
        </Link>
      </div>
    </LandingContentLayout>
  );
}
