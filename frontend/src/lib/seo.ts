import type { Metadata } from "next";

function envUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function normalizeSiteUrl(value: string): string {
  try {
    return new URL(value).toString().replace(/\/+$/, "");
  } catch {
    return "https://0rbit-api.vercel.app";
  }
}

export const SITE_URL = normalizeSiteUrl(
  envUrl("NEXT_PUBLIC_SITE_URL") ??
    envUrl("NEXT_PUBLIC_APP_URL") ??
    envUrl("NEXT_PUBLIC_API_URL") ??
    "https://0rbit-api.vercel.app"
);

export const SITE_NAME = envUrl("NEXT_PUBLIC_APP_NAME") ?? "Orbit API";

export const SITE_TITLE = "Orbit API — Recursos para bots e automações";

export const SITE_DESCRIPTION =
  "Mídia, inteligência artificial, criação visual, stickers e utilitários em uma única API para bots e automações.";

export const SITE_OG_IMAGE = "/orbit-og.png";

export const SITE_KEYWORDS = [
  "API para bots",
  "API de downloads",
  "API de inteligência artificial",
  "API para WhatsApp",
  "API para Telegram",
  "API para Discord",
  "download de Instagram",
  "download de TikTok",
  "download de Pinterest",
  "download de Kwai",
  "download de Facebook",
  "download de SoundCloud",
  "stickers para WhatsApp",
  "transcrição de áudio",
  "Orbit API"
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

interface PageMetadataInput {
  title: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  noIndex?: boolean;
  absoluteTitle?: boolean;
}

export function buildPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  type = "website",
  noIndex = false,
  absoluteTitle = false
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const image = {
    url: absoluteUrl(SITE_OG_IMAGE),
    width: 1200,
    height: 630,
    alt: `${SITE_NAME} — ${SITE_DESCRIPTION}`
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      locale: "pt_BR",
      title: socialTitle,
      description,
      images: [image]
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image]
    },
    ...(noIndex
      ? { robots: { index: false, follow: false, nocache: true } }
      : {})
  };
}
