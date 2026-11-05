"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./http";
import { KeyResponse, ApiKeyState } from "@interface";

export function useApiKey(): ApiKeyState {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    apiFetch<KeyResponse>("/api/user/key")
      .then((data) => {
        if (active) setApiKey(data.apiKey);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { apiKey, loading, error };
}
