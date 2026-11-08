"use client";

import { useState } from "react";
import { useAuth } from "@lib/auth/AuthProvider";
import { useApiKey } from "@lib/auth/useApiKey";
import DashboardHome from "@components/dashboard/DashboardHome";

export default function DashboardPageClient() {
  const { user } = useAuth();
  const { apiKey, loading, error } = useApiKey();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <DashboardHome
        apiKey={apiKey}
        keyLoading={loading}
        keyError={error}
        revealed={revealed}
        onToggleReveal={() => setRevealed((value) => !value)}
        plan={user?.plan}
        role={user?.role}
        dailyRequests={user?.dailyRequests}
        limit={user?.limit}
      />
    </div>
  );
}
