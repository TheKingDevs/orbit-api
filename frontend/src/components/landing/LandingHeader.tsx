import Link from "next/link";
import OrbitLogo from "@components/landing/OrbitLogo";

const NAV_LINKS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "FAQ", href: "#faq" }
];

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-[#151517]/90 px-4 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <OrbitLogo className="h-8 w-auto" />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Orbit
          </span>
          <span className="rounded-md border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-violet-300">
            API
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-zinc-400 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          href="/app"
          className="flex h-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-4 text-[13px] font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}
