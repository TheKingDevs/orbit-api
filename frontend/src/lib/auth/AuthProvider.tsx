"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, setSuspensionHandler, setUnauthorizedHandler } from "./http";
import { clearQueryCache } from "./queryCache";
import { fetchSession, performLogout, startGoogleLogin } from "./session";
import {
  clearSessionSnapshot,
  readSessionSnapshot,
  subscribeSessionSnapshot,
  writeSessionSnapshot
} from "./sessionSnapshot";
import type { AuthUser } from "@interface";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "suspended";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  suspensionReason: string | null;
}

interface AuthContextValue extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  clearSuspensionNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, suspensionReason: null });
  const router = useRouter();
  const snapshotUser = useSyncExternalStore(
    subscribeSessionSnapshot,
    readSessionSnapshot,
    () => null
  );

  useEffect(() => {
    let active = true;
    const snapshot = readSessionSnapshot();

    setUnauthorizedHandler(() => {
      clearSessionSnapshot();
      clearQueryCache();
      if (active) setState({ status: "unauthenticated", user: null, suspensionReason: null });
    });
    setSuspensionHandler((error) => {
      clearSessionSnapshot();
      clearQueryCache();
      if (!active) return;
      void fetchSession()
        .then(({ user }) => {
          writeSessionSnapshot(user);
          setState({ status: "authenticated", user, suspensionReason: null });
        })
        .catch((sessionError: unknown) => {
          if (sessionError instanceof ApiError && sessionError.code === "PermanentSuspension") {
            sessionStorage.setItem("orbit-permanent-suspension", sessionError.message);
            setState({ status: "suspended", user: null, suspensionReason: sessionError.message });
            router.replace("/");
          } else if (error.code === "PermanentSuspension") {
            sessionStorage.setItem("orbit-permanent-suspension", error.message);
            setState({ status: "suspended", user: null, suspensionReason: error.message });
            router.replace("/");
          }
        });
    });

    fetchSession()
      .then(({ user }) => {
        if (active) {
          sessionStorage.removeItem("orbit-permanent-suspension");
          writeSessionSnapshot(user);
          setState({ status: "authenticated", user, suspensionReason: null });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.code === "PermanentSuspension") {
          clearSessionSnapshot();
          clearQueryCache();
          sessionStorage.setItem("orbit-permanent-suspension", error.message);
          setState({ status: "suspended", user: null, suspensionReason: error.message });
          router.replace("/");
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          clearSessionSnapshot();
          clearQueryCache();
          setState({ status: "unauthenticated", user: null, suspensionReason: null });
          return;
        }
        // Falha de rede/servidor não encerra a sessão: mantém o snapshot
        // disponível e deixa a próxima navegação revalidar novamente.
        if (snapshot) return;
        const persistedReason = sessionStorage.getItem("orbit-permanent-suspension");
        if (persistedReason) {
          setState({ status: "suspended", user: null, suspensionReason: persistedReason });
          router.replace("/");
          return;
        }
        setState({ status: "unauthenticated", user: null, suspensionReason: null });
      });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
      setSuspensionHandler(null);
    };
  }, [router]);

  const login = useCallback(() => {
    sessionStorage.removeItem("orbit-permanent-suspension");
    clearSessionSnapshot();
    clearQueryCache();
    startGoogleLogin();
  }, []);

  const clearSuspensionNotice = useCallback(() => {
    sessionStorage.removeItem("orbit-permanent-suspension");
    clearSessionSnapshot();
    clearQueryCache();
    setState({ status: "unauthenticated", user: null, suspensionReason: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await performLogout();
    } catch {
      // A sessão local é descartada mesmo que o backend esteja indisponível.
    }

    sessionStorage.removeItem("orbit-permanent-suspension");
    clearSessionSnapshot();
    clearQueryCache();
    setState({ status: "unauthenticated", user: null, suspensionReason: null });
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(() => {
    // O snapshot desta aba permite renderizar o painel antes da revalidação,
    // sem divergir da hidratação SSR (no servidor ele é sempre nulo).
    const effectiveState: AuthState =
      state.status === "loading" && snapshotUser
        ? { status: "authenticated", user: snapshotUser, suspensionReason: null }
        : state;

    return { ...effectiveState, login, logout, clearSuspensionNotice };
  }, [state, snapshotUser, login, logout, clearSuspensionNotice]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
