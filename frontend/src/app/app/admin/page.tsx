import type { Metadata } from "next";
import AdminPageClient from "@components/dashboard/AdminPageClient";

export const instant = false;

export const metadata: Metadata = {
  title: "Administração | Orbit API",
  robots: { index: false, follow: false }
};

export default function AdminPage() {
  return <AdminPageClient />;
}
