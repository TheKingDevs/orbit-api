import type { Metadata } from "next";
import ErrorPage from "@components/errors/ErrorPage";
import { getErrorCopy, normalizeErrorCode } from "@lib/errors";

export const instant = false;

interface ErrorRouteProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params
}: ErrorRouteProps): Promise<Metadata> {
  const code = normalizeErrorCode((await params).code);
  const copy = getErrorCopy(code);

  return {
    title: copy.title,
    description: copy.message,
    robots: { index: false, follow: false, nocache: true }
  };
}

export default async function ErrorRoute({ params }: ErrorRouteProps) {
  const code = normalizeErrorCode((await params).code);
  const copy = getErrorCopy(code);

  return (
    <ErrorPage code={String(code)} title={copy.title} message={copy.message} />
  );
}
