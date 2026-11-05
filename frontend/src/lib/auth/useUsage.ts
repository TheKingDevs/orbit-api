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

export interface UsageSummary {
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
  role: string;
  dailyRequestsUsed: number;
  limit: number | null;
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
    topEndpoints: UsageEndpoint[];
    totalRequests: number;
  };
}

export function useUsageStats(days = 14) {
  const [data, setData] = useState<UsageStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    apiFetch<UsageStatsResponse>(`/api/user/usage?days=${days}`)
      .then((payload) => {
        if (!active) return;

        setData(payload);
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
  }, [days]);

  return { data, loading, error };
}
