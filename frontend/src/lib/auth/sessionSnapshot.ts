import type { AuthUser } from "@interface";

/**
 * Snapshot leve do perfil autenticado para renderização instantânea entre
 * recarregamentos. Nunca inclui API key, token de sessão ou qualquer
 * credencial. Fica restrito ao sessionStorage da aba e é descartado em
 * logout, expiração de sessão ou suspensão.
 */
const SNAPSHOT_KEY = "orbit-session-snapshot";
const SNAPSHOT_VERSION = 1;

interface SessionSnapshot {
  version: number;
  user: AuthUser;
}

let memoryUser: AuthUser | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeSessionSnapshot(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AuthUser>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.length > 0 &&
    (candidate.plan === "free" || candidate.plan === "basic" || candidate.plan === "gold") &&
    (candidate.role === "public" || candidate.role === "admin" || candidate.role === "owner") &&
    typeof candidate.dailyRequests === "number" &&
    typeof candidate.monthlyRequests === "number" &&
    typeof candidate.requestsUsed === "number" &&
    (candidate.limit === null || typeof candidate.limit === "number") &&
    (candidate.limitPeriod === "day" || candidate.limitPeriod === "month")
  );
}

function readStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;

    if (parsed.version !== SNAPSHOT_VERSION || !isAuthUser(parsed.user)) {
      window.sessionStorage.removeItem(SNAPSHOT_KEY);
      return null;
    }

    return parsed.user;
  } catch {
    return null;
  }
}

export function readSessionSnapshot(): AuthUser | null {
  if (!hydrated) {
    memoryUser = readStorage();
    hydrated = true;
  }

  return memoryUser;
}

export function writeSessionSnapshot(user: AuthUser): void {
  memoryUser = user;
  hydrated = true;

  if (typeof window !== "undefined") {
    try {
      const snapshot: SessionSnapshot = { version: SNAPSHOT_VERSION, user };
      window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage indisponível: mantém apenas o snapshot em memória.
    }
  }

  emit();
}

export function clearSessionSnapshot(): void {
  memoryUser = null;
  hydrated = true;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      // Nada a limpar se o storage estiver indisponível.
    }
  }

  emit();
}
