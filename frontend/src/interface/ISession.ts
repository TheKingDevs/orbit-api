import type { AuthUser } from "./IAuthUser";

export interface SessionResponse {
  success: boolean;
  user: AuthUser;
}
