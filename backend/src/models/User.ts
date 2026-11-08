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
  name?: string;
  picture?: string;
  googleSubjectHash?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  violationCount?: number;
  docsPreviewDate?: string;
  docsPreviewCount?: number;
}
