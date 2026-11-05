export interface AuthUser {
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
  role: string;
  dailyRequests: number;
  limit: number | null;
}
