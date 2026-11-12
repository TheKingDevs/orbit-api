"use client";

import { useEffect, useState } from "react";

export default function SuspensionScreen({ reason, suspendedUntil }: { reason: string; suspendedUntil: string | null }) {
  const deadline = suspendedUntil ? Date.parse(suspendedUntil) : NaN;
  const [remaining, setRemaining] = useState(() => Number.isFinite(deadline) ? Math.max(0, deadline - Date.now()) : 0);

  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const tick = () => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (next === 0) window.location.reload();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <section aria-labelledby="suspension-title" className="mx-auto mt-8 max-w-2xl rounded-3xl border border-amber-300/15 bg-[#151517] p-6 shadow-2xl shadow-black/20 sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200" aria-hidden="true">!</div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">Acesso temporariamente limitado</p>
      <h1 id="suspension-title" className="mt-2 text-2xl font-semibold text-white">Conta suspensa temporariamente</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">Seu acesso às páginas e recursos da Orbit está pausado até o prazo abaixo. O dashboard será liberado automaticamente quando a suspensão terminar.</p>
      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Motivo</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{reason || "Suspensão aplicada pela administração."}</p>
      </div>
      <div className="mt-5 rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-amber-200/70">Tempo para desbloqueio</p>
        {Number.isFinite(deadline) ? <div className="mt-3 flex flex-wrap gap-3" aria-live="polite">{[[days, "dias"], [hours, "horas"], [minutes, "min"], [seconds, "seg"]].map(([value, label]) => <div key={label} className="min-w-16 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-center"><span className="block font-mono text-xl font-semibold text-white">{String(value).padStart(2, "0")}</span><span className="mt-1 block text-[10px] uppercase text-zinc-500">{label}</span></div>)}</div> : <p className="mt-2 text-sm text-zinc-300">Prazo indisponível. Entre em contato com o suporte.</p>}
      </div>
    </section>
  );
}
