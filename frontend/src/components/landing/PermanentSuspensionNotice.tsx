"use client";

import { SUPPORT_WHATSAPP_URL } from "@lib/support";
import { useAuth } from "@lib/auth/AuthProvider";
import { useEffect, useState } from "react";

export default function PermanentSuspensionNotice() {
  const { status, suspensionReason, clearSuspensionNotice } = useAuth();
  const [callbackReason, setCallbackReason] = useState<string | null>(null);
  useEffect(() => {
    const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("orbit_suspension_notice="));
    if (!cookie) return;
    const value = cookie.slice("orbit_suspension_notice=".length);
    try { setCallbackReason(decodeURIComponent(value).slice(0, 500)); } catch { setCallbackReason("Esta conta foi suspensa permanentemente."); }
    document.cookie = "orbit_suspension_notice=; Path=/; Max-Age=0; SameSite=Lax";
  }, []);
  const reason = suspensionReason ?? callbackReason;
  if (status !== "suspended" && !callbackReason) return null;

  return (
    <section role="alert" className="mx-auto mt-5 max-w-6xl px-5 sm:px-8">
      <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">Suspensão permanente</p><p className="mt-2 text-sm leading-6 text-zinc-200">Motivo: {reason || "Violação das diretrizes da plataforma."}</p></div>
        <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0">
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl bg-rose-200 px-4 text-xs font-semibold text-[#211114] transition hover:bg-rose-100">Falar com suporte</a>
          <button type="button" onClick={() => { setCallbackReason(null); clearSuspensionNotice(); }} className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-xs font-medium text-zinc-300 hover:bg-white/[0.05]">Fechar aviso</button>
        </div>
      </div>
    </section>
  );
}
