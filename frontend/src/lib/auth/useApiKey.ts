"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./http";
import { fetchQuery, peekQuery } from "./queryCache";
import { KeyResponse, ApiKeyState } from "@interface";

const API_KEY_CACHE_TTL_MS = 60_000;
const API_KEY_CACHE_KEY = "user:api-key";

export function useApiKey(): ApiKeyState {
  const [apiKey, setApiKey] = useState<string | null>(
    () => peekQuery<KeyResponse>(API_KEY_CACHE_KEY, API_KEY_CACHE_TTL_MS)?.data.apiKey ?? null
  );
  const [loading, setLoading] = useState(
    () => !peekQuery<KeyResponse>(API_KEY_CACHE_KEY, API_KEY_CACHE_TTL_MS)
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    fetchQuery<KeyResponse>(
      API_KEY_CACHE_KEY,
      () => apiFetch<KeyResponse>("/api/user/key"),
      API_KEY_CACHE_TTL_MS
    )
      .then((data) => {
        if (!active) return;

        setApiKey(data.apiKey);
        setError(false);
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
