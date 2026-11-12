export type PlanType = 'free' | 'basic' | 'gold';
export type UserRole = 'owner' | 'admin' | 'public';

export interface User {
  id: string;
  email: string;
  apiKey: string;
  token?: string;
  plan: PlanType;
  role: UserRole;
  dailyRequests: number;
  lastResetDate: string;
  monthlyRequests: number;
  lastMonthlyResetMonth: string;
  planExpiresAt?: string;
  lastBillingOrderId?: string;
  name?: string;
  picture?: string;
  googleSubjectHash?: string;
  isSuspended?: boolean;
  suspensionType?: 'temporary' | 'permanent';
  suspendedUntil?: string;
  suspensionReason?: string;
  violationCount?: number;
  docsPreviewDate?: string;
  docsPreviewCount?: number;
}
