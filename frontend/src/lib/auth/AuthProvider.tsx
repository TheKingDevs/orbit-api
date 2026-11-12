"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, setSuspensionHandler, setUnauthorizedHandler } from "./http";
import { fetchSession, performLogout, startGoogleLogin } from "./session";
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

  useEffect(() => {
    let active = true;

    setUnauthorizedHandler(() => {
      if (active) setState({ status: "unauthenticated", user: null, suspensionReason: null });
    });
    setSuspensionHandler((error) => {
      if (!active) return;
      void fetchSession()
        .then(({ user }) => setState({ status: "authenticated", user, suspensionReason: null }))
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
          setState({ status: "authenticated", user, suspensionReason: null });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.code === "PermanentSuspension") {
          sessionStorage.setItem("orbit-permanent-suspension", error.message);
          setState({ status: "suspended", user: null, suspensionReason: error.message });
          router.replace("/");
          return;
        }
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
    startGoogleLogin();
  }, []);

  const clearSuspensionNotice = useCallback(() => {
    sessionStorage.removeItem("orbit-permanent-suspension");
    setState({ status: "unauthenticated", user: null, suspensionReason: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await performLogout();
    } catch {
      // A sessão local é descartada mesmo que o backend esteja indisponível.
    }

    sessionStorage.removeItem("orbit-permanent-suspension");
    setState({ status: "unauthenticated", user: null, suspensionReason: null });
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, clearSuspensionNotice }),
    [state, login, logout, clearSuspensionNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
