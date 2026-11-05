import type { Metadata } from "next";
import Link from "next/link";
import LandingContentLayout from "@components/landing/LandingContentLayout";
import { Icon, type IconName } from "@components/dashboard/icons";

export const metadata: Metadata = {
  title: "Recursos — Orbit API",
  description: "Explore as categorias e os endpoints da Orbit API."
};

const FEATURES: {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  tone: string;
}[] = [
  {
    icon: "download",
    title: "Downloads",
    description:
      "Instagram, Pinterest, TikTok e Play com áudio e vídeo prontos para o seu bot.",
    href: "/app/doc/downloads/instagram",
    tone: "border-violet-400/20 bg-violet-400/10 text-violet-300"
  },
  {
    icon: "mic",
    title: "Inteligência artificial",
    description:
      "Transcrição de áudio e vídeo com Whisper para legendas, resumos e buscas.",
    href: "/app/doc/audio/transcribe",
    tone: "border-violet-400/20 bg-violet-400/10 text-violet-300"
  },
  {
    icon: "image",
    title: "Canvas",
    description:
      "Cartões de boas-vindas e despedida, além de efeitos de imagem aplicados por URL.",
    href: "/app/doc/canvas/welcome",
    tone: "border-purple-300/20 bg-purple-300/10 text-purple-200"
  },
  {
    icon: "sticker",
    title: "Stickers",
    description:
      "TTP, ATTP, Brat e Abrat com texto, cores e alinhamento personalizáveis.",
    href: "/app/doc/stickers/brat",
    tone: "border-violet-300/20 bg-violet-300/10 text-violet-200"
  },
  {
    icon: "tools",
    title: "Utilitários",
    description:
      "Conversão de imagens para GIF e ferramentas prontas para acelerar seu fluxo.",
    href: "/app/doc/utilitarios/to-gif",
    tone: "border-purple-400/20 bg-purple-400/10 text-purple-300"
  },
  {
    icon: "key",
    title: "Uma chave para tudo",
    description:
      "Autenticação com Google, API Key única e controle de requisições por plano.",
    href: "/app",
    tone: "border-violet-200/20 bg-violet-200/10 text-violet-200"
  }
];

export default function RecursosPage() {
  return (
    <LandingContentLayout title="Recursos">
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
        Uma coleção de APIs pensada para reduzir integrações, economizar tempo
        e colocar recursos avançados no seu projeto.
      </p>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
        São 15+ endpoints em seis categorias, com mídia, inteligência artificial,
        criação visual e utilitários em uma única API. Integre uma vez, controle
        pelo dashboard e mantenha o ritmo das suas automações.
      </p>

      <ul className="mt-10">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="border-t border-white/[0.1]">
            <Link
              href={feature.href}
              className="group flex gap-4 py-6 outline-none transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.025]"
            >
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feature.tone}`}
                aria-hidden="true"
              >
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-zinc-100">
                  {feature.title}
                </span>
                <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </span>
              </span>
              <span className="self-center text-zinc-500 transition-transform group-hover:translate-x-1" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </LandingContentLayout>
  );
}
