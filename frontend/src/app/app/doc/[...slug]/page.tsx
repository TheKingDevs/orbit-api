import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApiDocView from "@components/docs/ApiDocView";
import FeedbackPage from "@components/feedback/FeedbackPage";
import SupportPage from "@components/support/SupportPage";
import { findDoc } from "@lib/docs";
import { buildPageMetadata } from "@lib/seo";

export const instant = false;

interface DocPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params
}: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);

  if (!doc) {
    return {
      title: "Documentação",
      robots: { index: false, follow: false }
    };
  }

  return buildPageMetadata({
    title: doc.title,
    description: doc.description,
    path: `/app/doc/${slug.join("/")}`,
    noIndex: true
  });
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = findDoc(slug);

  if (!doc) notFound();

  if (slug.length === 1 && slug[0] === "sugestao") {
    return <FeedbackPage />;
  }

  if (slug.length === 1 && slug[0] === "suporte") {
    return <SupportPage />;
  }

  return <ApiDocView key={doc.slug.join("/")} doc={doc} />;
}
