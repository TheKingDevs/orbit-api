import type { Metadata } from "next";
import type { ReactNode } from "react";
import SessionGate from "@components/SessionGate";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <SessionGate>{children}</SessionGate>
    </div>
  );
}
