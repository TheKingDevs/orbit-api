"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@components/dashboard/icons";
import AppLoading from "@components/dashboard/AppLoading";
import { useAuth } from "@lib/auth/AuthProvider";
import { ApiError, apiFetch } from "@lib/auth/http";

type Plan = "free" | "basic" | "gold";
type Role = "public" | "admin";
interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  role: Role | "owner";
  plan: Plan;
  planExpiresAt: string | null;
  isSuspended: boolean;
  suspensionType: "temporary" | "permanent" | null;
  suspendedUntil: string | null;
  suspensionReason: string;
  dailyRequests: number;
  monthlyRequests: number;
  apiKey: string;
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AdminUserEditorClient({ userId }: { userId: string }) {
  const { user: actor, status } = useAuth();
  const router = useRouter();
  const isOwner = actor?.role === "owner";
  const authorized = isOwner || actor?.role === "admin";
  const [record, setRecord] = useState<ManagedUser | null>(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [role, setRole] = useState<Role>("public");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionType, setSuspensionType] = useState<"temporary" | "permanent">("permanent");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [dailyRequests, setDailyRequests] = useState(0);
  const [monthlyRequests, setMonthlyRequests] = useState(0);
  const [rotateKey, setRotateKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ user: ManagedUser }>(`/api/admin/users/${encodeURIComponent(userId)}`);
      const target = result.user;
      setRecord(target);
      setEmail(target.email);
      setPlan(target.plan);
      setRole(target.role === "owner" ? "public" : target.role);
      setExpiresAt(toLocalDateTime(target.planExpiresAt));
      setIsSuspended(target.isSuspended);
      setSuspensionType(target.suspensionType ?? "permanent");
      setSuspendedUntil(toLocalDateTime(target.suspendedUntil));
      setSuspensionReason(target.suspensionReason);
      setDailyRequests(target.dailyRequests);
      setMonthlyRequests(target.monthlyRequests);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Não foi possível carregar os dados do usuário.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === "authenticated" && !authorized) router.replace("/app");
  }, [authorized, router, status]);

  useEffect(() => {
    if (authorized) void loadUser();
  }, [authorized, loadUser]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          email,
          plan,
          planExpiresAt: plan === "free" || !expiresAt ? undefined : new Date(expiresAt).toISOString(),
          role: isOwner ? role : undefined,
          isSuspended,
          suspensionReason,
          suspensionType,
          suspendedUntil: suspensionType === "temporary" && suspendedUntil ? new Date(suspendedUntil).toISOString() : undefined,
          dailyRequests,
          monthlyRequests,
          rotateApiKey: rotateKey
        })
      });
      router.replace("/app/admin");
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!record || !window.confirm(`Deletar permanentemente ${record.email} e todo o histórico da conta?`)) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      router.replace("/app/admin");
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : "Não foi possível deletar o usuário.");
      setSaving(false);
    }
  }

  if (status === "loading" || loading || !authorized) {
    return <AppLoading label="Carregando cadastro do usuário..." />;
  }

  if (!record) {
    return <div className="space-y-4 rounded-2xl border border-white/[0.07] bg-[#151517] p-6"><p role="alert" className="text-sm text-rose-300">{error || "Usuário não encontrado."}</p><Link href="/app/admin" className="text-sm text-violet-300 hover:text-violet-200">Voltar à administração</Link></div>;
  }

  const fieldClass = "mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0c0e] px-3 text-sm text-white outline-none focus:border-violet-400/35";
  const labelClass = "block text-xs font-medium text-zinc-400";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
        <Link href="/app/admin" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition hover:text-violet-200"><Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />Voltar aos usuários</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-medium text-violet-300">Gerenciamento de conta</p><h1 className="mt-2 text-2xl font-semibold text-white">Editar usuário</h1><p className="mt-1 text-sm text-zinc-500">{record.name || record.email}</p></div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isSuspended ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-200" : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-amber-300" : "bg-emerald-300"}`} />{isSuspended ? "Suspenso" : "Ativo"}</span>
        </div>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <form onSubmit={save} className="space-y-5">
        <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
          <h2 className="text-base font-semibold text-white">Conta e permissões</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} /></label>
            {isOwner ? <label className={labelClass}>Cargo<select value={role} onChange={(event) => setRole(event.target.value as Role)} className={fieldClass}><option value="public">Usuário</option><option value="admin">Admin</option></select></label> : <div className={labelClass}>Cargo<div className={`${fieldClass} flex items-center capitalize`}>{record.role === "public" ? "Usuário" : record.role}</div></div>}
            <label className={labelClass}>Plano<select value={plan} onChange={(event) => setPlan(event.target.value as Plan)} className={fieldClass}><option value="free">Free</option><option value="basic">Basic</option><option value="gold">Gold</option></select></label>
            {plan !== "free" ? <label className={labelClass}>Plano válido até<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} /></label> : null}
            <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-sm text-zinc-200"><input type="checkbox" checked={isSuspended} onChange={(event) => setIsSuspended(event.target.checked)} className="h-4 w-4 accent-violet-400" /><span><span className="block font-medium">Conta suspensa</span><span className="mt-0.5 block text-xs text-zinc-500">Bloqueia o uso da API e do painel.</span></span></label>
            {isSuspended ? <label className={labelClass}>Motivo da suspensão<input maxLength={500} value={suspensionReason} onChange={(event) => setSuspensionReason(event.target.value)} placeholder="Informe o motivo" className={fieldClass} /></label> : null}
            {isSuspended ? <label className={labelClass}>Tipo de suspensão<select value={suspensionType} onChange={(event) => setSuspensionType(event.target.value as "temporary" | "permanent")} className={fieldClass}><option value="temporary">Temporária</option><option value="permanent">Permanente</option></select></label> : null}
            {isSuspended && suspensionType === "temporary" ? <label className={labelClass}>Desbloquear em<input type="datetime-local" required min={toLocalDateTime(new Date().toISOString())} value={suspendedUntil} onChange={(event) => setSuspendedUntil(event.target.value)} className={fieldClass} /></label> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6">
          <h2 className="text-base font-semibold text-white">Consumo e credenciais</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>Requisições diárias<input type="number" min={0} step={1} value={dailyRequests} onChange={(event) => setDailyRequests(Number(event.target.value))} className={fieldClass} /></label>
            <label className={labelClass}>Requisições mensais<input type="number" min={0} step={1} value={monthlyRequests} onChange={(event) => setMonthlyRequests(Number(event.target.value))} className={fieldClass} /></label>
            <label className={`${labelClass} sm:col-span-2`}>API Key atual<div className="mt-2 flex gap-2"><input readOnly value={record.apiKey} className={`${fieldClass} mt-0 font-mono text-xs`} /><button type="button" onClick={() => void navigator.clipboard.writeText(record.apiKey)} className="shrink-0 rounded-xl border border-white/[0.08] px-3 text-xs text-zinc-300 hover:bg-white/[0.05]">Copiar</button></div></label>
            <label className="flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-3.5 text-sm text-zinc-200 sm:col-span-2"><input type="checkbox" checked={rotateKey} onChange={(event) => setRotateKey(event.target.checked)} className="h-4 w-4 accent-violet-400" /><span><span className="block font-medium">Rotacionar API Key ao salvar</span><span className="mt-0.5 block text-xs text-zinc-500">A chave atual deixa de funcionar imediatamente.</span></span></label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#151517] p-4 sm:p-5">
          <button type="button" onClick={() => void deleteUser()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/20 px-3 text-xs font-medium text-rose-300 transition hover:bg-rose-400/[0.07] disabled:opacity-50"><Icon name="trash" className="h-3.5 w-3.5" />Deletar usuário</button>
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-400 px-4 text-xs font-semibold text-[#15111e] transition hover:bg-violet-300 disabled:cursor-wait disabled:opacity-60"><Icon name="check" className="h-4 w-4" />{saving ? "Salvando…" : "Salvar alterações"}</button>
        </div>
      </form>
    </div>
  );
}
