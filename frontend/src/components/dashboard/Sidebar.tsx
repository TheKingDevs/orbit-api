"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { DOCS, slugHref } from "@lib/docs";
import { useAuth } from "@lib/auth/AuthProvider";
import OrbitLogo from "@components/landing/OrbitLogo";
import { Icon, type IconName } from "@components/dashboard/icons";

interface NavLink {
  label: string;
  slug: string[];
}

interface NavItem {
  label: string;
  icon: IconName;
  children?: NavLink[];
  slug?: string[];
  href?: string;
}

function linksFor(prefix: string): NavLink[] {
  return DOCS.filter((doc) => doc.slug.length === 2 && doc.slug[0] === prefix).map(
    (doc) => ({ label: doc.title, slug: doc.slug })
  );
}

const API_ITEMS: NavItem[] = [
  { label: "Audio AI", icon: "mic", children: linksFor("audio") },
  { label: "Canvas", icon: "image", children: linksFor("canvas") },
  { label: "Downloads", icon: "download", children: linksFor("downloads") },
  { label: "Ferramentas", icon: "gear", children: linksFor("ferramentas") },
  { label: "Image AI", icon: "sparkles", children: linksFor("image-ai") },
  { label: "Pesquisa", icon: "search", children: linksFor("pesquisa") },
  { label: "Stickers", icon: "sticker", children: linksFor("stickers") },
  { label: "Text AI", icon: "text", children: linksFor("text-ai") },
  { label: "Utilitários", icon: "tools", children: linksFor("utilitarios") }
];

const MISC_ITEMS: NavItem[] = [
  { label: "Bot de exemplo", icon: "bot", slug: ["bot-de-exemplo"] },
  { label: "Sugestões e Erros", icon: "clipboard", slug: ["sugestao"] },
  { label: "Grupo de suporte", icon: "whatsapp", slug: ["suporte"] },
  { label: "Novidades", icon: "star", href: "/app/novidades" }
];

const NAV_ITEM_BASE =
  "relative flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition";
const NAV_ITEM_ACTIVE = "text-white";
const NAV_ITEM_IDLE = "text-zinc-400 hover:bg-violet-400/[0.06] hover:text-white";

function ActiveMarker({ active, className = "" }: { active: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.55)] transition-opacity duration-300 ${
        active ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function OrbitMark() {
  return (
    <span className="flex h-8 w-10 items-center justify-center rounded-lg">
      <OrbitLogo className="h-6 w-auto" />
    </span>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, status } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  const activeGroup =
    API_ITEMS.find((item) => item.children?.some((child) => pathname === slugHref(child.slug)))
      ?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Usuário";
  const initial = displayName.slice(0, 1).toUpperCase();
  const visibleMiscItems: NavItem[] = user?.role === "admin" || user?.role === "owner"
    ? [...MISC_ITEMS, { label: "Administração", icon: "gear", href: "/app/admin" }]
    : MISC_ITEMS;

  function isActive(slug: string[]): boolean {
    return pathname === slugHref(slug);
  }

  function renderDirectLink(item: NavItem) {
    const href = item.href ?? (item.slug ? slugHref(item.slug) : null);

    if (!href) return null;

    const active = pathname === href;

    return (
      <li key={item.label}>
        <Link
          href={href}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          className={`${NAV_ITEM_BASE} ${active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE}`}
        >
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">{item.label}</span>
          <Icon name="chevron" className="h-4 w-4 text-zinc-600" />
        </Link>
      </li>
    );
  }

  function renderGroup(item: NavItem) {
    if (!item.children) return null;

    const expanded = openGroup === item.label;
    const active = item.children.some((child) => isActive(child.slug));

    return (
      <li key={item.label}>
        <button
          type="button"
          onClick={() => setOpenGroup(expanded ? null : item.label)}
          aria-expanded={expanded}
          className={`${NAV_ITEM_BASE} ${active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE}`}
        >
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
          <span className="flex-1 text-left">{item.label}</span>
          <Icon
            name="chevron"
            className={`h-4 w-4 text-zinc-600 transition-transform duration-300 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          inert={!expanded}
        >
          <div className="overflow-hidden">
            <ul className="ml-[26px] mt-1 space-y-1 border-l border-white/[0.07] pb-1 pl-4">
              {item.children.map((child) => {
                const childActive = isActive(child.slug);

                return (
                  <li key={child.label}>
                    <Link
                      href={slugHref(child.slug)}
                      onClick={() => {
                        setOpenGroup(item.label);
                        onClose();
                      }}
                      aria-current={childActive ? "page" : undefined}
                      className={`relative block rounded-lg px-2 py-1.5 text-sm transition ${
                        childActive
                          ? "text-violet-200"
                          : "text-zinc-400 hover:bg-violet-400/[0.06] hover:text-white"
                      }`}
                    >
                      <ActiveMarker active={childActive} className="-left-[17px]" />
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </li>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/[0.07] bg-[#111113] transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <OrbitMark />
          <span className="text-[17px] font-semibold tracking-tight">Orbit API</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="ml-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-violet-400/10 hover:text-violet-200 lg:hidden"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <Link
            href="/app"
            onClick={onClose}
            aria-current={pathname === "/app" ? "page" : undefined}
            className={`${NAV_ITEM_BASE} font-medium ${
              pathname === "/app" ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE
            }`}
          >
            <Icon name="home" className="h-[18px] w-[18px]" />
            Dashboard
          </Link>

          <p className="px-3 pb-2 pt-6 text-xs font-semibold text-zinc-500">API&apos;s</p>
          <ul className="space-y-0.5">
            {API_ITEMS.map((item) => (item.children ? renderGroup(item) : renderDirectLink(item)))}
          </ul>

          <p className="px-3 pb-2 pt-6 text-xs font-semibold text-zinc-500">Outros</p>
          <ul className="space-y-0.5">
            {visibleMiscItems.map((item) => renderDirectLink(item))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              accountOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            inert={!accountOpen}
          >
            <div className="overflow-hidden">
              <div className="mb-2 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1c]">
                <Link
                  href="/me"
                  onClick={onClose}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-violet-400/10 hover:text-violet-200"
                >
                  <Icon name="user" className="h-4 w-4" />
                  Minha conta
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    onClose();
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-violet-400/10 hover:text-violet-200"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>
          {status === "loading" ? (
            <div className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
              <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/[0.07] motion-reduce:animate-none" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block h-2.5 w-24 animate-pulse rounded-full bg-white/[0.08] motion-reduce:animate-none" />
                <span className="block h-2 w-32 animate-pulse rounded-full bg-white/[0.05] motion-reduce:animate-none" />
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-left transition hover:border-violet-400/20 hover:bg-violet-400/[0.06]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/15 text-sm font-semibold text-violet-200">
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{displayName}</span>
                <span className="block truncate text-xs text-zinc-400">{user?.email}</span>
              </span>
              <Icon
                name="chevronDown"
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300 ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
