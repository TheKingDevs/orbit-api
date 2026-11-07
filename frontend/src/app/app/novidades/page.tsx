import type { Metadata } from "next";
import NewsTimeline from "@components/news/NewsTimeline";
import { buildPageMetadata } from "@lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Novidades",
  description:
    "Acompanhe os novos recursos, endpoints e melhorias da Orbit API.",
  path: "/app/novidades",
  noIndex: true
});

export default function NewsPage() {
  return <NewsTimeline />;
}
