
import Link from "next/link";
import CurrentYear from "@components/landing/CurrentYear";
import LandingHeader from "@components/landing/LandingHeader";
import OrbitLogo from "@components/landing/OrbitLogo";
import { Icon, type IconName } from "@components/dashboard/icons";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  absoluteUrl,
  buildPageMetadata
} from "@lib/seo";

export const metadata = buildPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true
});

interface Feature {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  tone: string;
}

const FEATURES: Feature[] = [
  {
    icon: "download",
    title: "Downloads",
    description:
      "Instagram, Pinterest, TikTok, Kwai, Facebook, SoundCloud, Play e YouTube com áudio e vídeo prontos para o seu bot.",
    href: "/app/doc/downloads/instagram",
    tone: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  {
    icon: "mic",
    title: "Inteligência artificial",
    description:
      "GPT, Groq, Gemini, Shazam e transcrição com Whisper para chat, identificação musical e legendas.",
    href: "/app/doc/text-ai/gpt",
    tone: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  {
    icon: "image",
    title: "Canvas",
    description:
      "Cartões de boas-vindas e despedida, além de efeitos de imagem aplicados por URL.",
    href: "/app/doc/canvas/welcome",
    tone: "border-purple-300/20 bg-purple-300/10 text-purple-200",
  },
  {
    icon: "sticker",
    title: "Stickers",
    description:
      "TTP, ATTP, Brat e Abrat com texto, cores e alinhamento personalizáveis.",
    href: "/app/doc/stickers/brat",
    tone: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  },
  {
    icon: "tools",
    title: "Utilitários",
    description:
      "Conversão de imagens para GIF e ferramentas prontas para acelerar seu fluxo.",
    href: "/app/doc/utilitarios/to-gif",
    tone: "border-purple-400/20 bg-purple-400/10 text-purple-300",
  },
  {
    icon: "key",
    title: "Uma chave para tudo",
    description:
      "Autenticação com Google, API Key única e controle de requisições por plano.",
    href: "/app",
    tone: "border-violet-200/20 bg-violet-200/10 text-violet-200",
  },
];

const BENEFITS: {
  icon: IconName;
  title: string;
  description: string;
}[] = [
  {
    icon: "key",
    title: "Uma chave, todos os recursos",
    description:
      "Downloads, IA, Canvas, stickers e utilitários no mesmo lugar. Integre uma vez e use tudo com a mesma API Key.",
  },
  {
    icon: "tools",
    title: "Integração sem complicação",
    description:
      "Requisições HTTP diretas, exemplos em JavaScript e parâmetros claros. Sem SDK obrigatório e sem desenvolvimento complexo.",
  },
  {
    icon: "sparkles",
    title: "Documentação interativa",
    description:
      "Personalize os parâmetros, veja o resultado ao vivo e copie a requisição pronta para colar no seu projeto.",
  },
  {
    icon: "bot",
    title: "Feita para bots",
    description:
      "Compatível com WhatsApp, Telegram, Discord ou qualquer automação que consiga fazer uma chamada HTTP.",
  },
];

const STATS = [
  { value: "27", label: "endpoints disponíveis" },
  { value: "8", label: "categorias de API" },
  { value: "100", label: "requisições grátis por dia" },
  { value: "1", label: "chave para tudo" },
];

const STEPS = [
  {
    title: "Entre com sua conta Google",
    description:
      "Acesse o dashboard em poucos segundos, sem formulários e sem complicação.",
  },
  {
    title: "Copie sua API Key",
    description:
      "Sua chave fica disponível no dashboard e pode ser enviada no header Authorization.",
  },
  {
    title: "Faça a primeira chamada",
    description:
      "Escolha um endpoint, teste no playground da documentação e copie o exemplo pronto.",
  },
];

const FAQ = [
  {
    question: "Preciso pagar para usar a Orbit API?",
    answer:
      "Não. O plano Free permite 100 requisições por dia. Os planos Basic e Gold ampliam os limites para quem precisa de mais volume.",
  },
  {
    question: "Como envio minha API Key?",
    answer:
      "Envie o header Authorization com o valor Bearer SUA_API_KEY. Também é possível usar o parâmetro token na URL para testes rápidos.",
  },
  {
    question: "Quais serviços estão disponíveis hoje?",
    answer:
      "Downloads de Instagram, Pinterest, TikTok, Kwai, Facebook, SoundCloud e Play, IA com GPT, Groq, Gemini e Shazam, pesquisa de YouTube, transcrição de áudio, Canvas, stickers TTP, ATTP, Brat e Abrat, além da conversão para GIF.",
  },
  {
    question: "A documentação tem exemplos prontos?",
    answer:
      "Sim. Cada endpoint possui tabela de parâmetros, exemplo em JavaScript e um playground para testar o resultado antes de integrar.",
  },
  {
    question: "Consigo usar em qualquer bot ou automação?",
    answer:
      "Sim. Basta que a aplicação consiga fazer requisições HTTP. A Orbit API funciona com WhatsApp, Telegram, Discord e projetos próprios.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/orbit-logo.png"),
      description: SITE_DESCRIPTION
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "pt-BR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BRL",
        description: "Plano Free com 100 requisições por dia"
      },
      featureList: [
        "Downloads de Instagram, Pinterest, TikTok, Kwai, Facebook e SoundCloud",
        "Inteligência artificial com GPT, Groq, Gemini e Shazam",
        "Pesquisa de YouTube (v1 e v2)",
        "Canvas, stickers e utilitários",
        "Uma única API Key para todos os recursos"
      ]
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      }))
    }
  ]
};

const compactButtonClass =
  "inline-flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition duration-200";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-[#09090b] text-white selection:bg-violet-500/30 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="relative z-10">
        <LandingHeader />

        <main>
          {/* Hero */}
          <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-[420px] rounded-full bg-violet-500/10 blur-[110px]"
            />

            {/* Linha curva do Hero */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
              viewBox="0 0 1440 700"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="heroLineGradient"
                  x1="0"
                  y1="0"
                  x2="1440"
                  y2="520"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.03" />
                  <stop offset="35%" stopColor="#8B5CF6" stopOpacity="0.18" />
                  <stop offset="68%" stopColor="#A78BFA" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.12" />
                </linearGradient>

                <filter
                  id="heroLineGlow"
                  x="-20%"
                  y="-50%"
                  width="150%"
                  height="170%"
                >
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>

              <path
                d="M-100 -65 C120 0 210 115 390 205 C590 305 720 350 900 405 C1080 460 1220 520 1510 475"
                stroke="#8B5CF6"
                strokeOpacity="0.18"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#heroLineGlow)"
              />

              <path
                d="M-100 -65 C120 0 210 115 390 205 C590 305 720 350 900 405 C1080 460 1220 520 1510 475"
                stroke="url(#heroLineGradient)"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>

            <div className="relative z-10 mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-300 to-purple-400" />
                ORBIT API · FEITA PARA AUTOMAÇÕES
              </div>

              <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Seu próximo projeto começa com{" "}
                <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-violet-200 bg-clip-text text-transparent">
                  Orbit API.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Uma plataforma, múltiplas possibilidades. Integre downloads de
                mídias, geração de Canvas, inteligência artificial e muito
                mais diretamente às suas aplicações.
              </p>

              {/* Botões compactos */}
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className={`${compactButtonClass} border border-violet-400/20 bg-violet-400/[0.08] text-violet-200 hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white`}
                >
                  Começar agora
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </Link>

                <a
                  href="#recursos"
                  className={`${compactButtonClass} border border-violet-400/20 bg-violet-400/[0.06] text-violet-200 hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-white`}
                >
                  Explorar recursos
                </a>
              </div>

              <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="bg-[#101012] px-4 py-5">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="text-xl font-semibold tracking-tight text-zinc-100">
                      {stat.value}
                    </dd>
                    <dd className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* Recursos */}
          <section
            id="recursos"
            className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
          >
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                  Recursos
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  Recursos que ampliam o que seu bot já faz
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                  Uma coleção de APIs pensada para reduzir integrações,
                  economizar tempo e colocar recursos avançados no seu projeto.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature) => (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[#141416] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/20 hover:bg-[#171719]"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${feature.tone}`}
                    >
                      <Icon name={feature.icon} className="h-5 w-5" />
                    </span>

                    <h3 className="mt-5 text-[15px] font-semibold text-zinc-100">
                      {feature.title}
                    </h3>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                      {feature.description}
                    </p>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition group-hover:text-zinc-200">
                      Ver documentação
                      <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Benefícios */}
          <section
            id="beneficios"
            className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
          >
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                  Benefícios
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  Por que escolher a Orbit?
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                  Menos serviços para integrar, menos código para manter e
                  mais recursos disponíveis para os seus bots.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {BENEFITS.map((benefit, index) => (
                  <article
                    key={benefit.title}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141416] p-6 transition hover:border-violet-400/20"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute right-5 top-4 text-4xl font-semibold tracking-[-0.05em] text-white/[0.06]"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300">
                      <Icon name={benefit.icon} className="h-5 w-5" />
                    </span>

                    <h3 className="mt-10 text-[15px] font-semibold text-zinc-100">
                      {benefit.title}
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                      {benefit.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section
            id="como-funciona"
            className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
          >
            <div className="mx-auto max-w-5xl">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                  Como funciona
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  Da conta à primeira requisição em minutos
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                  Sem instalação, sem configuração complexa. A Orbit cuida da
                  infraestrutura para você focar no seu bot.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/[0.07] bg-[#141416] p-5 transition hover:border-violet-400/20"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/25 bg-violet-400/10 text-xs font-semibold text-violet-200">
                      {index + 1}
                    </span>

                    <h3 className="mt-5 text-[15px] font-semibold text-zinc-100">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section
            id="faq"
            className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
          >
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                  FAQ
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  Perguntas frequentes
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                  Não encontrou o que procurava? Fale com a gente pelo grupo
                  de suporte.
                </p>
              </div>

              <div className="mt-10 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-[#141416] px-5 sm:px-6">
                {FAQ.map((item) => (
                  <details key={item.question} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium text-zinc-200 marker:content-none">
                      {item.question}
                      <Icon
                        name="chevronDown"
                        className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180"
                      />
                    </summary>

                    <p className="max-w-2xl pt-3 text-sm leading-relaxed text-zinc-400">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section
            id="get-started"
            className="px-4 pb-20 pt-4 sm:px-6 sm:pb-24"
          >
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#141416] px-6 py-14 text-center sm:px-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[-220px] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-violet-500/15 blur-[110px]"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-180px] right-[-120px] h-[320px] w-[320px] rounded-full bg-purple-500/10 blur-[100px]"
              />

              <div className="relative">
                <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  Pronto para colocar seus bots em órbita?
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
                  Crie sua conta, copie sua API Key e comece a integrar
                  downloads, IA, Canvas e stickers ainda hoje.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className={`${compactButtonClass} border border-violet-400/20 bg-violet-400/[0.08] text-violet-200 hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white`}
                  >
                    Começar agora
                  </Link>

                  <a
                    href="#recursos"
                    className={`${compactButtonClass} border border-violet-400/20 bg-violet-400/[0.06] text-violet-200 hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-white`}
                  >
                    Ver recursos
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative border-t border-white/[0.07] bg-[#09090b]/90 px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col justify-between gap-10 md:flex-row">
              <div className="max-w-sm">
                <Link href="/" className="inline-flex items-center gap-3">
                  <OrbitLogo className="h-9 w-auto" />
                  <span className="text-lg font-bold tracking-tight text-white">
                    Orbit<span className="text-violet-400"> API</span>
                  </span>
                </Link>

                <p className="mt-5 max-w-xs text-xs leading-6 text-zinc-500">
                  Uma plataforma de recursos e ferramentas para
                  desenvolvedores criarem sem limites. Integre downloads,
                  inteligência artificial, Canvas e muito mais.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
                <div>
                  <h4 className="mb-4 text-xs font-semibold text-white">
                    Plataforma
                  </h4>

                  <div className="flex flex-col gap-3">
                    <a
                      href="#recursos"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Recursos
                    </a>
                    <a
                      href="#beneficios"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Benefícios
                    </a>
                    <a
                      href="#como-funciona"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Como funciona
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-xs font-semibold text-white">
                    Desenvolvedores
                  </h4>

                  <div className="flex flex-col gap-3">
                    <Link
                      href="/app/doc/canvas/welcome"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Documentação
                    </Link>
                    <Link
                      href="/app/novidades"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Novidades
                    </Link>
                    <Link
                      href="/app/doc/suporte"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Suporte
                    </Link>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <h4 className="mb-4 text-xs font-semibold text-white">
                    Comece agora
                  </h4>

                  <div className="flex flex-col gap-3">
                    <Link
                      href="/login"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Criar conta
                    </Link>
                    <Link
                      href="/app"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      Dashboard
                    </Link>
                    <a
                      href="#faq"
                      className="text-xs text-zinc-500 transition hover:text-violet-300"
                    >
                      FAQ
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/[0.07] pt-7 sm:flex-row sm:items-center">
              <p className="text-[11px] text-zinc-600">
                © <CurrentYear /> Orbit API. Todos os direitos reservados.
              </p>

              <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                <span>Built for developers</span>
                <span className="text-violet-400">✦</span>
                <span>Powered by Orbit</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
