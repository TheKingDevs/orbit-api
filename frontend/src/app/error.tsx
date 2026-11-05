"use client";

import { useEffect } from "react";
import ErrorPage from "@components/errors/ErrorPage";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title="Algo deu errado"
      message="Não foi possível concluir esta ação. Tente novamente em instantes."
      detail={error.digest ? `Código do erro: ${error.digest}` : undefined}
      onRetry={reset}
    />
  );
}
