export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
  role: string;
  dailyRequests: number;
  monthlyRequests: number;
  requestsUsed: number;
  limit: number | null;
  limitPeriod: "day" | "month";
  planExpiresAt: string | null;
  isSuspended: boolean;
  suspensionType: "temporary" | null;
  suspensionReason: string;
  suspendedUntil: string | null;
}
