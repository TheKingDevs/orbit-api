"use client";

import { useEffect } from "react";
import ErrorPage from "@components/errors/ErrorPage";
import { getErrorCopy } from "@lib/errors";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const copy = getErrorCopy(500);

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title={copy.title}
      message={copy.message}
      onRetry={reset}
    />
  );
}
