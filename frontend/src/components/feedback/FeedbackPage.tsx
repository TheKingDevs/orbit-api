"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@components/dashboard/icons";

type FeedbackKind = "suggestion" | "bug";

const REPOSITORY_ISSUES = "https://github.com/TheKingDevs/orbit-api/issues/new";

export default function FeedbackPage() {
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !details.trim()) {
      setError("Preencha o título e conte um pouco mais sobre o seu relato.");
      return;
    }

    const body = kind === "bug"
      ? `## O que aconteceu?\n${details.trim()}\n\n## Como reproduzir\n${steps.trim() || "Não informado"}\n\n## O que deveria acontecer?\n${expected.trim() || "Não informado"}\n\n---\nEnviado pela página de sugestões e erros da Orbit API.`
      : `## Sua ideia\n${details.trim()}\n\n## Como isso ajudaria?\n${expected.trim() || "Não informado"}\n\n---\nEnviado pela página de sugestões e erros da Orbit API.`;

    const url = new URL(REPOSITORY_ISSUES);
    url.searchParams.set("title", `[${kind === "bug" ? "Erro" : "Sugestão"}] ${title.trim()}`);
    url.searchParams.set("body", body);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setError("");
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-white/[0.09] bg-[#0d0d0f] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10";

  return (
    <div className="mx-auto w-full">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-[#151517] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          <Icon name="message" className="h-3.5 w-3.5 text-violet-300" />
          Sua voz ajuda a Orbit a evoluir
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          Sugestões e erros
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-400">
          Encontrou algo que não funciona ou imaginou um recurso novo? Conte para a gente.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-200">O que você quer compartilhar?</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                { id: "suggestion", label: "Tenho uma sugestão", icon: "sparkles" },
                { id: "bug", label: "Encontrei um erro", icon: "support" }
              ] as const).map((option) => {
                const active = kind === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => { setKind(option.id); setError(""); }}
                    aria-pressed={active}
                    className={`flex min-h-[74px] items-center gap-3 rounded-xl border px-3.5 text-left text-sm font-medium transition ${
                      active
                        ? "border-violet-400/35 bg-violet-400/[0.08] text-violet-100"
                        : "border-white/[0.07] bg-[#101012] text-zinc-400 hover:border-white/[0.14] hover:text-zinc-200"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-violet-400/15 text-violet-200" : "bg-white/[0.04] text-zinc-500"}`}>
                      <Icon name={option.icon} className="h-[18px] w-[18px]" />
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="feedback-title">
            {kind === "bug" ? "Resuma o erro" : "Dê um título à sugestão"}
            <input
              id="feedback-title"
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={kind === "bug" ? "Ex.: A busca não retorna resultados" : "Ex.: Adicionar suporte para ..."}
              className={fieldClass}
            />
          </label>

          <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="feedback-details">
            {kind === "bug" ? "O que aconteceu?" : "Como seria essa ideia?"}
            <textarea
              id="feedback-details"
              required
              rows={4}
              maxLength={4000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={kind === "bug" ? "Descreva o que você viu e em qual parte da plataforma." : "Conte como o recurso funcionaria e o que ele facilitaria."}
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </label>

          {kind === "bug" && (
            <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="feedback-steps">
              Como reproduzir? <span className="font-normal text-zinc-600">(opcional)</span>
              <textarea
                id="feedback-steps"
                rows={3}
                maxLength={2000}
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                placeholder={"1. Abra ...\n2. Clique em ...\n3. O erro aparece ..."}
                className={`${fieldClass} resize-y leading-relaxed`}
              />
            </label>
          )}

          <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="feedback-expectation">
            {kind === "bug" ? "O que deveria acontecer?" : "Como isso ajudaria você?"}
            <span className="font-normal text-zinc-600"> (opcional)</span>
            <textarea
              id="feedback-expectation"
              rows={3}
              maxLength={2000}
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="Detalhes adicionais que possam ajudar..."
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </label>

          {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}

          <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
              O relato será aberto como rascunho público no GitHub para você revisar e publicar.
            </p>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-[#17111f] transition hover:bg-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151517]"
            >
              Continuar no GitHub
              <Icon name="chevron" className="h-4 w-4" />
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/[0.09] text-emerald-300">
              <Icon name="check" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold text-zinc-100">Um bom relato ajuda muito</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Inclua detalhes, mensagens de erro e os passos que levaram ao problema. Para ideias, conte o que você gostaria de conseguir fazer.
            </p>
          </section>
          <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5">
            <h2 className="text-sm font-semibold text-zinc-100">Precisa de ajuda agora?</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Consulte a documentação ou acesse o canal de suporte da comunidade.
            </p>
            <Link href="/app/doc/suporte" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 transition hover:text-violet-200">
              Ir para suporte <span aria-hidden="true">→</span>
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
