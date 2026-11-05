import Link from "next/link";
import LandingHeader from "@components/landing/LandingHeader";
import OrbitLogo from "@components/landing/OrbitLogo";
import { Icon, type IconName } from "@components/dashboard/icons";

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

const STATS = [
  { value: "15+", label: "endpoints disponíveis" },
  { value: "6", label: "categorias de API" },
  { value: "100", label: "requisições grátis por dia" },
  { value: "1", label: "chave para tudo" }
];

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

const FAQ = [
  {
    question: "Preciso pagar para usar a Orbit API?",
    answer:
      "Não. O plano Free permite 100 requisições por dia. Os planos Basic e Gold ampliam os limites para quem precisa de mais volume."
  },
  {
    question: "Como envio minha API Key?",
    answer:
      "Envie o header Authorization com o valor Bearer SUA_API_KEY. Também é possível usar o parâmetro token na URL para testes rápidos."
  },
  {
    question: "Quais serviços estão disponíveis hoje?",
    answer:
      "Downloads de Instagram, Pinterest, TikTok e Play, transcrição de áudio, Canvas, stickers TTP, ATTP, Brat e Abrat, além da conversão para GIF."
  },
  {
    question: "A documentação tem exemplos prontos?",
    answer:
      "Sim. Cada endpoint possui tabela de parâmetros, exemplo em JavaScript e um playground para testar o resultado antes de integrar."
  },
  {
    question: "Consigo usar em qualquer bot ou automação?",
    answer:
      "Sim. Basta que a aplicação consiga fazer requisições HTTP. A Orbit API funciona com WhatsApp, Telegram, Discord e projetos próprios."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0d] text-white">
      <LandingHeader />

      <main>
        <section className="relative px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
          >
            <div className="mt-[-260px] h-[560px] w-[820px] rounded-full bg-violet-500/15 blur-[130px]" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-[420px] rounded-full bg-violet-500/10 blur-[110px]"
          />

          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-300 to-purple-400" />
              ORBIT API · FEITA PARA AUTOMAÇÕES
            </div>

            <h1 className="mt-7 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Tudo o que seu bot precisa,{" "}
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-violet-200 bg-clip-text text-transparent">
                na mesma órbita
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Mídia, inteligência artificial, criação visual e utilitários em
              uma única API. Integre uma vez, controle pelo dashboard e mantenha
              o ritmo das suas automações.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white sm:w-auto"
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
                className="flex h-12 w-full items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-white sm:w-auto"
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
                Uma coleção de APIs pensada para reduzir integrações, economizar
                tempo e colocar recursos avançados no seu projeto.
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
                Menos serviços para integrar, menos código para manter e mais
                recursos disponíveis para os seus bots.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141416] p-6"
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
                  className="rounded-2xl border border-white/[0.07] bg-[#141416] p-5"
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

        <section id="faq" className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                FAQ
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                Perguntas frequentes
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                Não encontrou o que procurava? Fale com a gente pelo grupo de
                suporte.
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

        <section className="px-4 pb-20 pt-4 sm:px-6 sm:pb-24">
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
                Crie sua conta, copie sua API Key e comece a integrar downloads,
                IA, Canvas e stickers ainda hoje.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white sm:w-auto"
                >
                  Começar agora
                </Link>
                <a
                  href="#recursos"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-6 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/10 hover:text-white sm:w-auto"
                >
                  Ver recursos
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <OrbitLogo className="h-7 w-auto" />
            <span className="text-sm font-semibold tracking-tight text-zinc-200">
              Orbit API
            </span>
          </Link>
          <p className="text-xs text-zinc-600">
            © 2026 Orbit API. Todos os direitos reservados.
          </p>
          <nav className="flex items-center gap-5 text-xs text-zinc-500">
            <Link href="/app/doc/canvas/welcome" className="transition hover:text-zinc-200">
              Documentação
            </Link>
            <Link href="/app/novidades" className="transition hover:text-zinc-200">
              Novidades
            </Link>
            <Link href="/app/doc/suporte" className="transition hover:text-zinc-200">
              Suporte
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
