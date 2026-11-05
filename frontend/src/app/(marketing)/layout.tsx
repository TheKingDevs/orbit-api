import type { ReactNode } from "react";
import LandingHeader from "@components/landing/LandingHeader";
import MeshDriftBackground from "@components/background/MeshDriftBackground";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MeshDriftBackground />
      <LandingHeader />
      {children}
    </>
  );
}
