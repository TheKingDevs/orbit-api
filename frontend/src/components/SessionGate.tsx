"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@lib/auth/AuthProvider";
import AppLoading from "@components/dashboard/AppLoading";
import DashboardShell from "@components/dashboard/DashboardShell";
import SuspensionScreen from "@components/dashboard/SuspensionScreen";

export default function SessionGate({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
    if (status === "suspended") router.replace("/");
  }, [status, router]);

  const temporarilySuspended = status === "authenticated" && user?.isSuspended && user.suspensionType === "temporary";

  return (
    <DashboardShell hideNavigation={Boolean(temporarilySuspended)}>
      {temporarilySuspended ? (
        <SuspensionScreen reason={user?.suspensionReason ?? ""} suspendedUntil={user?.suspendedUntil ?? null} />
      ) : status === "authenticated" ? (
        children
      ) : (
        <AppLoading
          label={
            status === "unauthenticated"
              ? "Sessão encerrada. Redirecionando..."
              : status === "suspended" ? "Redirecionando para a página inicial..." : "Verificando sua sessão..."
          }
        />
      )}
    </DashboardShell>
  );
}
