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
import { setUnauthorizedHandler } from "./http";
import { fetchSession, performLogout, startGoogleLogin } from "./session";
import type { AuthUser } from "@interface";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  const router = useRouter();

  useEffect(() => {
    let active = true;

    setUnauthorizedHandler(() => {
      if (active) setState({ status: "unauthenticated", user: null });
    });

    fetchSession()
      .then(({ user }) => {
        if (active) setState({ status: "authenticated", user });
      })
      .catch(() => {
        if (active) setState({ status: "unauthenticated", user: null });
      });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(() => {
    startGoogleLogin();
  }, []);

  const logout = useCallback(async () => {
    try {
      await performLogout();
    } catch {
      // A sessão local é descartada mesmo que o backend esteja indisponível.
    }

    setState({ status: "unauthenticated", user: null });
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout]
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
