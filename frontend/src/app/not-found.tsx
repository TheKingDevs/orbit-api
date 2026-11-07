import type { Metadata } from "next";
import ErrorPage from "@components/errors/ErrorPage";
import { getErrorCopy } from "@lib/errors";

const copy = getErrorCopy(404);

export const metadata: Metadata = {
  title: copy.title,
  description: copy.message,
  robots: { index: false, follow: false, nocache: true }
};

export default function NotFound() {
  return <ErrorPage code="404" title={copy.title} message={copy.message} />;
}
