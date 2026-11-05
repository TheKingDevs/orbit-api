import type { Metadata } from "next";
import NewsTimeline from "@components/news/NewsTimeline";

export const metadata: Metadata = {
  title: "Novidades · Orbit API"
};

export default function NewsPage() {
  return <NewsTimeline />;
}
