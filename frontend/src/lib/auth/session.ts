import { apiFetch } from "./http";
import { SessionResponse } from "@interface/ISession";

export function fetchSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>("/api/auth/session");
}

export function performLogout(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export function startGoogleLogin(): void {
  // Navegação completa é necessária para seguir o redirect 302 do backend ao Google.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/api/auth/google";
}
