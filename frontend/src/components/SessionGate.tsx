"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@lib/auth/AuthProvider";
import AppLoading from "@components/dashboard/AppLoading";
import DashboardShell from "@components/dashboard/DashboardShell";

export default function SessionGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return (
    <DashboardShell>
      {status === "authenticated" ? (
        children
      ) : (
        <AppLoading
          label={
            status === "unauthenticated"
              ? "Sessão encerrada. Redirecionando..."
              : "Verificando sua sessão..."
          }
        />
      )}
    </DashboardShell>
  );
}
