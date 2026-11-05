import type { Metadata } from "next";
import { AuthProvider } from "@lib/auth/AuthProvider";
import { ThemeProvider } from "@components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit API — Recursos para bots e automações",
  description:
    "Mídia, inteligência artificial, criação visual, stickers e utilitários em uma única API para bots e automações.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <AuthProvider>
            <div className="relative z-10 min-h-dvh">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
