import Link from "next/link";
import { Icon } from "@components/dashboard/icons";

const SUPPORT_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_URL;

function validInviteUrl(value?: string): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const supportUrl = validInviteUrl(SUPPORT_GROUP_URL);

const tips = [
  {
    number: "01",
    title: "Explique o que você está tentando fazer",
    description: "Diga qual endpoint ou recurso está usando e qual resultado esperava."
  },
  {
    number: "02",
    title: "Compartilhe os detalhes do problema",
    description: "Inclua a mensagem de erro e os passos para reproduzir. Nunca envie sua chave de API."
  },
  {
    number: "03",
    title: "Consulte a documentação",
    description: "Parâmetros, exemplos e formatos de resposta podem esclarecer dúvidas comuns."
  }
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#151517] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          <Icon name="whatsapp" className="h-3.5 w-3.5 text-emerald-300" />
          Comunidade Orbit API
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          Grupo de suporte
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-400">
          Tire dúvidas, compartilhe suas integrações e converse com a comunidade Orbit.
        </p>
      </header>

      <section className="relative mt-8 overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#121815] p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-emerald-400/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-300">
              <Icon name="whatsapp" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-white">Converse com a comunidade</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              O grupo é um espaço para trocar experiências e receber ajuda com o uso da plataforma.
            </p>
          </div>

          {supportUrl ? (
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-[#101712] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121815]"
            >
              <Icon name="whatsapp" className="h-[18px] w-[18px]" />
              Entrar no grupo
              <Icon name="chevron" className="h-4 w-4" />
            </a>
          ) : (
            <div className="max-w-[260px] rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-zinc-400">
              O convite do grupo ainda não está disponível. Você pode falar com a gente pela página de sugestões e erros.
              <Link href="/app/doc/sugestao" className="mt-2 inline-flex items-center gap-1.5 font-medium text-violet-300 hover:text-violet-200">
                Enviar uma mensagem <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Como receber uma resposta melhor</h2>
            <p className="mt-1 text-sm text-zinc-500">Alguns detalhes ajudam a comunidade a entender sua dúvida.</p>
          </div>
          <Link href="/app/doc" className="hidden shrink-0 text-sm font-medium text-violet-300 transition hover:text-violet-200 sm:inline-flex sm:items-center sm:gap-1.5">
            Abrir documentação <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {tips.map((tip) => (
            <article key={tip.number} className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5">
              <span className="font-mono text-xs font-semibold tracking-wider text-violet-300">{tip.number}</span>
              <h3 className="mt-3 text-sm font-semibold leading-relaxed text-zinc-200">{tip.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{tip.description}</p>
            </article>
          ))}
        </div>
        <Link href="/app/doc" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition hover:text-violet-200 sm:hidden">
          Abrir documentação <span aria-hidden="true">→</span>
        </Link>
      </section>

      <aside className="mt-6 flex gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-4">
        <Icon name="support" className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" />
        <p className="text-xs leading-relaxed text-zinc-400">
          Por segurança, não compartilhe tokens, chaves de API, senhas ou dados pessoais no grupo. Se encontrar um problema, você também pode <Link href="/app/doc/sugestao" className="font-medium text-violet-300 hover:text-violet-200">registrar um relato</Link>.
        </p>
      </aside>
    </div>
  );
}
