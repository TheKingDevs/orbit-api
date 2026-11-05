
"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrbitLogo from "@components/landing/OrbitLogo";
import ThemeToggle from "@components/theme/ThemeToggle";
import { useAuth } from "@lib/auth/AuthProvider";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Login cancelado. Tente novamente quando quiser.",
  invalid_state: "A sessão de login expirou. Tente novamente.",
  oauth_not_configured: "O login com Google ainda não está configurado.",
  token_exchange_failed: "Não foi possível validar o login com o Google.",
  invalid_id_token: "A resposta do Google não pôde ser validada.",
  email_not_verified: "Sua conta Google precisa ter um e-mail verificado.",
  auth_failed: "Não foi possível concluir o login. Tente novamente."
};

function LoginContent() {
  const { status, login } = useAuth();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("error");

  const error = errorCode
    ? ERROR_MESSAGES[errorCode] ??
      "Não foi possível concluir o login. Tente novamente."
    : null;

  useEffect(() => {
    for (const legacyCookie of ["orbit_token", "orbit_email"]) {
      document.cookie = `${legacyCookie}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }, []);

  useEffect(() => {
    if (errorCode) {
      window.history.replaceState({}, "", "/login");
    }
  }, [errorCode]);

  return (
    <main className="fixed inset-0 z-50 h-dvh w-full overflow-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-0 login-scrim" />
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 overflow-hidden lg:right-[480px]">

        {/* Conteúdo visual desktop */}
        <div className="relative z-10 hidden h-full flex-col justify-between p-16 lg:flex">

          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <OrbitLogo className="h-9 w-auto" />
            Orbit
            <span className="rounded border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-300">
              API
            </span>
          </Link>

          <div className="max-w-xl">
            <div className="mb-5 h-1 w-12 rounded-full bg-violet-400" />

            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Sua infraestrutura.
              <br />
              <span className="text-violet-300">
                Seu ritmo.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-400">
              Uma experiência simples, moderna e segura
              para acessar os serviços do Orbit API.
            </p>
          </div>

          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Orbit API. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* PAINEL DE LOGIN */}
      <aside className="
        relative z-20 ml-auto
        flex h-full w-full items-center justify-center
        px-6
        lg:w-[480px]
        lg:border-l lg:border-white/5
        lg:bg-[#0a0a0c]/85
        lg:px-12
      ">

        <div className="relative w-full max-w-md">
          <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0c]/85 p-7 backdrop-blur-xl sm:p-9 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">

          <div className="mb-8 flex items-center gap-2.5">
            <OrbitLogo className="h-8 w-auto" />
            <span className="text-xl font-bold">Orbit</span>
            <span className="rounded border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-xs text-violet-300">
              API
            </span>
          </div>

          <h2 className="mb-2 text-3xl font-bold">
            Entrar com Google
          </h2>

          <p className="mb-8 text-zinc-400">
            Acesse com sua conta do Google.
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {status === "authenticated" ? (
            <a
              href="/app"
              className="flex w-full items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/[0.08] py-3 font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
            >
              Ir para o dashboard
            </a>
          ) : (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/[0.08] py-3 font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white disabled:opacity-60"
              onClick={login}
              disabled={status === "loading"}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>

              Continuar com o Google
            </button>
          )}
          </div>
        </div>
      </aside>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
