"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./http";
import { fetchQuery, invalidateQuery, peekQuery } from "./queryCache";

const USAGE_CACHE_TTL_MS = 5_000;

export interface UsageDay {
  date: string;
  count: number;
}

export interface UsageRequest {
  id: string;
  method: string;
  path: string;
  status: number;
  timestamp: number;
  durationMs: number;
}

export interface UsageEndpoint {
  path: string;
  count: number;
}

export interface UsagePagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface UsageSummary {
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
  role: string;
  dailyRequestsUsed: number;
  monthlyRequestsUsed: number;
  requestsUsed: number;
  limit: number | null;
  limitPeriod: "day" | "month";
  planExpiresAt: string | null;
  remainingRequests: number | null;
  isSuspended: boolean;
  lastResetDate: string;
}

export interface UsageStatsResponse {
  success: boolean;
  summary: UsageSummary;
  usage: {
    daily: UsageDay[];
    recent: UsageRequest[];
    pagination: UsagePagination;
    topEndpoints: UsageEndpoint[];
    totalRequests: number;
  };
}

export interface UsageStatsOptions {
  page?: number;
  limit?: number;
}

export function useUsageStats(days = 14, options: UsageStatsOptions = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const requestKey = `usage:${days}:${page}:${limit}`;
  const [data, setData] = useState<UsageStatsResponse | null>(
    () => peekQuery<UsageStatsResponse>(requestKey, USAGE_CACHE_TTL_MS)?.data ?? null
  );
  const [loading, setLoading] = useState(
    () => !peekQuery<UsageStatsResponse>(requestKey, USAGE_CACHE_TTL_MS)
  );
  const [error, setError] = useState(false);
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const refreshing = !loading && settledRequestKey !== requestKey;

  useEffect(() => {
    let active = true;

    fetchQuery<UsageStatsResponse>(
      requestKey,
      () => apiFetch<UsageStatsResponse>(
        `/api/user/usage?days=${days}&page=${page}&limit=${limit}`
      ),
      USAGE_CACHE_TTL_MS
    )
      .then((payload) => {
        if (!active) return;

        setData(payload);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (!active) return;

        setLoading(false);
        setSettledRequestKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [days, page, limit, requestKey, reloadToken]);

  const reload = useCallback(() => {
    invalidateQuery(requestKey);
    setError(false);
    setReloadToken((token) => token + 1);
  }, [requestKey]);

  return { data, loading, refreshing, error, reload };
}
