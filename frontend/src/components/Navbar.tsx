"use client";

import Link from "next/link";
import OrbitLogo from "@components/landing/OrbitLogo";
import { useAuth } from "@lib/auth/AuthProvider";

export default function Navbar() {
  const { status, user, login, logout } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <OrbitLogo className="h-7 w-auto" />
              Orbit
            </Link>
            <span className="rounded border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-300">API</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-300 transition hover:text-violet-200">Início</Link>
            {status === "authenticated" && (
              <Link href="/me" className="text-sm font-medium text-zinc-300 transition hover:text-violet-200">Minha conta</Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {status === "authenticated" ? (
              <>
                <span className="hidden sm:block text-sm text-zinc-400">{user?.email}</span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-4 py-2 text-sm font-medium text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-4 py-2 text-sm font-medium text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
