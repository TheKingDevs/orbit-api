"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@components/dashboard/icons";
import { useAuth } from "@lib/auth/AuthProvider";
import { ApiError, apiFetch } from "@lib/auth/http";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  dailyRequests: number;
  requestsUsed: number;
  limit: number | null;
  limitPeriod: "day" | "month";
  planExpiresAt: string | null;
  isSuspended: boolean;
  suspensionReason?: string | null;
}

interface AdminUsersResponse {
  success: boolean;
  users: AdminUser[];
}

function roleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Usuário";
}

function roleTone(role: string): string {
  if (role === "owner") return "border-amber-300/20 bg-amber-300/[0.08] text-amber-200";
  if (role === "admin") return "border-violet-400/20 bg-violet-400/[0.08] text-violet-200";
  return "border-white/[0.08] bg-white/[0.04] text-zinc-400";
}

const expiryFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

export default function AdminPageClient() {
  const { user, status } = useAuth();
  const router = useRouter();
  const authorized = user?.role === "admin" || user?.role === "owner";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AdminUsersResponse>("/api/admin/users");
      setUsers(data.users ?? []);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !authorized) router.replace("/app");
  }, [authorized, router, status]);

  useEffect(() => {
    if (authorized) void loadUsers();
  }, [authorized, loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((entry) => `${entry.name ?? ""} ${entry.email}`.toLowerCase().includes(term));
  }, [search, users]);

  const admins = users.filter((entry) => entry.role === "admin" || entry.role === "owner").length;
  const suspended = users.filter((entry) => entry.isSuspended).length;

  async function setSuspended(entry: AdminUser) {
    setActionError(null);
    setOpenMenuId(null);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isSuspended: !entry.isSuspended })
      });
      await loadUsers();
    } catch (actionFailure) {
      setActionError(actionFailure instanceof ApiError ? actionFailure.message : "Não foi possível atualizar o status.");
    }
  }

  async function deleteUser(entry: AdminUser) {
    if (!window.confirm(`Excluir permanentemente a conta de ${entry.email}? O histórico também será removido.`)) return;
    setActionError(null);
    setOpenMenuId(null);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      await loadUsers();
    } catch (actionFailure) {
      setActionError(actionFailure instanceof ApiError ? actionFailure.message : "Não foi possível excluir o usuário.");
    }
  }

  if (status === "loading" || !authorized) {
    return (
      <div role="status" aria-live="polite" className="animate-pulse space-y-5 motion-reduce:animate-none">
        <div className="rounded-2xl border border-white/[0.07] bg-[#151517] p-6"><div className="h-3 w-36 rounded bg-white/[0.06]" /><div className="mt-4 h-8 w-56 max-w-full rounded bg-white/[0.06]" /><div className="mt-3 h-3 w-72 max-w-full rounded bg-white/[0.04]" /></div>
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5"><div className="h-3 w-28 rounded bg-white/[0.06]" /><div className="mt-4 h-7 w-14 rounded bg-white/[0.06]" /></div>)}</div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5"><div className="h-4 w-24 rounded bg-white/[0.06]" /><div className="mt-5 h-10 max-w-sm rounded-xl bg-white/[0.04]" />{[0, 1, 2, 3].map((item) => <div key={item} className="mt-4 flex gap-4 border-t border-white/[0.05] pt-4"><div className="h-8 w-8 rounded-full bg-white/[0.05]" /><div className="flex-1 space-y-2"><div className="h-3 w-40 max-w-full rounded bg-white/[0.06]" /><div className="h-2.5 w-56 max-w-full rounded bg-white/[0.04]" /></div><div className="h-6 w-16 rounded-full bg-white/[0.05]" /></div>)}</div>
        <span className="sr-only">Carregando administração...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium text-violet-300">
                <Icon name="gear" className="h-4 w-4" />
                Console administrativo
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Administração</h1>
              <p className="mt-2 text-sm text-zinc-400">Acompanhe contas, permissões e situação dos usuários da Orbit.</p>
            </div>
            <Link href="/app" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-medium text-zinc-300 transition hover:border-violet-400/25 hover:text-white">
              <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section aria-label="Resumo administrativo" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Contas cadastradas", value: users.length, icon: "user" as const },
          { label: "Administradores", value: admins, icon: "key" as const },
          { label: "Contas suspensas", value: suspended, icon: "support" as const }
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white/[0.07] bg-[#151517] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-zinc-500">{item.label}</span>
              <Icon name={item.icon} className="h-4 w-4 text-violet-300" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{loading ? "—" : item.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151517]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-white">Usuários</h2>
            <p className="mt-1 text-xs text-zinc-500">Lista de contas e permissões da plataforma.</p>
          </div>
          <button type="button" onClick={() => void loadUsers()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-zinc-300 transition hover:border-violet-400/25 hover:text-white disabled:opacity-50">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <label className="relative block max-w-sm">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0c0c0e] pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/30" />
          </label>

          {error && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
              {error}
              <button type="button" onClick={() => void loadUsers()} className="font-semibold text-red-100 underline underline-offset-2">Tentar novamente</button>
            </div>
          )}

          {actionError && <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">{actionError}</div>}

          {loading && !error ? (
            <div role="status" aria-label="Carregando usuários" className="mt-5 animate-pulse divide-y divide-white/[0.05] rounded-xl border border-white/[0.05] motion-reduce:animate-none">
              {[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-4 px-3 py-4"><div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" /><div className="flex-1 space-y-2"><div className="h-3 w-40 max-w-full rounded bg-white/[0.06]" /><div className="h-2.5 w-56 max-w-full rounded bg-white/[0.04]" /></div><div className="hidden h-3 w-14 rounded bg-white/[0.05] sm:block" /><div className="hidden h-3 w-16 rounded bg-white/[0.05] sm:block" /><div className="h-6 w-16 rounded-full bg-white/[0.05]" /></div>)}
            </div>
          ) : !error ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <th className="px-3 py-3 font-semibold">Conta</th>
                    <th className="px-3 py-3 font-semibold">Cargo</th>
                    <th className="px-3 py-3 font-semibold">Plano</th>
                    <th className="px-3 py-3 text-right font-semibold">Uso do período</th>
                    <th className="px-3 py-3 text-right font-semibold">Status</th>
                    <th className="w-14 px-3 py-3 text-right font-semibold"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredUsers.map((entry) => (
                    <tr key={entry.id} className="text-xs text-zinc-300 transition hover:bg-white/[0.02]">
                      <td className="px-3 py-3.5">
                        <span className="block max-w-[240px] truncate font-medium text-white">{entry.name || entry.email.split("@")[0]}</span>
                        <span className="mt-1 block max-w-[240px] truncate text-[11px] text-zinc-500">{entry.email}</span>
                      </td>
                      <td className="px-3 py-3.5"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${roleTone(entry.role)}`}>{roleLabel(entry.role)}</span></td>
                      <td className="px-3 py-3.5 capitalize">
                        {entry.plan}
                        {entry.planExpiresAt ? (
                          <span className="mt-1 block text-[10px] normal-case text-zinc-500">
                            até {expiryFormatter.format(new Date(entry.planExpiresAt))}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums">
                        {entry.requestsUsed} / {entry.limit ?? "∞"} <span className="text-zinc-500">por {entry.limitPeriod === "month" ? "mês" : "dia"}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-1.5 ${entry.isSuspended ? "text-amber-300" : "text-emerald-300"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${entry.isSuspended ? "bg-amber-300" : "bg-emerald-300"}`} />
                          {entry.isSuspended ? "Suspenso" : "Ativo"}
                        </span>
                      </td>
                      <td className="relative px-3 py-3.5 text-right">
                        {entry.role !== "owner" && entry.id !== user?.id ? (
                          <div className="relative inline-block">
                            <button type="button" aria-label={`Ações para ${entry.email}`} aria-expanded={openMenuId === entry.id} onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] text-zinc-400 transition hover:border-violet-400/25 hover:bg-white/[0.04] hover:text-white">
                              <Icon name="ellipsis" className="h-4 w-4" />
                            </button>
                            {openMenuId === entry.id ? (
                              <div role="menu" className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-white/[0.1] bg-[#1b1b1e] p-1.5 text-left shadow-2xl shadow-black/40">
                                <button role="menuitem" type="button" onClick={() => { setOpenMenuId(null); router.push(`/app/admin/users/${encodeURIComponent(entry.id)}`); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-zinc-200 transition hover:bg-white/[0.06]"><Icon name="edit" className="h-3.5 w-3.5 text-violet-300" />Editar usuário</button>
                                <button role="menuitem" type="button" onClick={() => void setSuspended(entry)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-zinc-200 transition hover:bg-white/[0.06]"><Icon name="suspend" className="h-3.5 w-3.5 text-amber-300" />{entry.isSuspended ? "Reativar conta" : "Suspender conta"}</button>
                                <button role="menuitem" type="button" onClick={() => void deleteUser(entry)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-rose-300 transition hover:bg-rose-400/[0.08]"><Icon name="trash" className="h-3.5 w-3.5" />Deletar usuário</button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhum usuário encontrado.</p>}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
