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
  limit: number | null;
  isSuspended: boolean;
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

export default function AdminPageClient() {
  const { user, status } = useAuth();
  const router = useRouter();
  const authorized = user?.role === "admin" || user?.role === "owner";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (status === "loading" || !authorized) {
    return (
      <div role="status" className="flex min-h-64 items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-violet-400/25 border-t-violet-300 motion-reduce:animate-none" />
        <span className="sr-only">Verificando acesso administrativo...</span>
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

          {loading && !error ? (
            <div role="status" className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-8 text-sm text-zinc-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/25 border-t-violet-300 motion-reduce:animate-none" />
              Carregando usuários...
            </div>
          ) : !error ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <th className="px-3 py-3 font-semibold">Conta</th>
                    <th className="px-3 py-3 font-semibold">Cargo</th>
                    <th className="px-3 py-3 font-semibold">Plano</th>
                    <th className="px-3 py-3 text-right font-semibold">Uso diário</th>
                    <th className="px-3 py-3 text-right font-semibold">Status</th>
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
                      <td className="px-3 py-3.5 capitalize">{entry.plan}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums">{entry.limit === null ? `${entry.dailyRequests} / ∞` : `${entry.dailyRequests} / ${entry.limit}`}</td>
                      <td className="px-3 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-1.5 ${entry.isSuspended ? "text-amber-300" : "text-emerald-300"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${entry.isSuspended ? "bg-amber-300" : "bg-emerald-300"}`} />
                          {entry.isSuspended ? "Suspenso" : "Ativo"}
                        </span>
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
