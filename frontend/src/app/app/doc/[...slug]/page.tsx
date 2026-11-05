import { notFound } from "next/navigation";
import ApiDocView from "@components/docs/ApiDocView";
import { findDoc } from "@lib/docs";

export const instant = false;

interface DocPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = findDoc(slug);

  if (!doc) notFound();

  return <ApiDocView key={doc.slug.join("/")} doc={doc} />;
}
