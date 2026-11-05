import type { ReactNode } from "react";
import SessionGate from "@components/SessionGate";
import DashboardShell from "@components/dashboard/DashboardShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <SessionGate>
        <DashboardShell>{children}</DashboardShell>
      </SessionGate>
    </div>
  );
}
