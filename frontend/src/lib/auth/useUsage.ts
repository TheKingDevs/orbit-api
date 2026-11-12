"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./http";

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
  const [data, setData] = useState<UsageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestKey = `${days}:${page}:${limit}`;
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null);
  const refreshing = !loading && settledRequestKey !== requestKey;

  useEffect(() => {
    let active = true;

    apiFetch<UsageStatsResponse>(
      `/api/user/usage?days=${days}&page=${page}&limit=${limit}`
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
  }, [days, page, limit, requestKey]);

  return { data, loading, refreshing, error };
}
