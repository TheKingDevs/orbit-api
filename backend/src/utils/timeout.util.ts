// O Spotify via btch-downloader já levou ~17s; 25s evita falsos 504 sem
// manter conexões penduradas por tempo demais.
const DEFAULT_PROVIDER_TIMEOUT_MS = 25_000;
const DEFAULT_TRANSCRIPTION_TIMEOUT_MS = 90_000;
const DEFAULT_TRANSCRIPTION_PROCESS_TIMEOUT_MS = 75_000;
const DEFAULT_HORDE_TIMEOUT_MS = 15_000;
const DEFAULT_MEDIA_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_LOCAL_PROCESS_TIMEOUT_MS = 30_000;

function readTimeout(name: string, fallback: number, minimum: number = 100): number {
  const raw = process.env[name];

  if (!raw) return fallback;

  const value = Number(raw);

  if (!Number.isFinite(value) || value < minimum) return fallback;

  return Math.floor(value);
}

/**
 * Provedores externos (downloads, busca, IA) variam muito de latência e podem
 * levar vários segundos em instâncias pequenas. O limite é configurável para
 * permitir valores menores em testes e maiores em produção.
 */
export function providerTimeoutMs(): number {
  return readTimeout('PROVIDER_TIMEOUT_MS', DEFAULT_PROVIDER_TIMEOUT_MS, 50);
}

export function transcriptionTimeoutMs(): number {
  return readTimeout('TRANSCRIPTION_TIMEOUT_MS', DEFAULT_TRANSCRIPTION_TIMEOUT_MS, 1_000);
}

export function transcriptionProcessTimeoutMs(): number {
  return readTimeout('TRANSCRIPTION_PROCESS_TIMEOUT_MS', DEFAULT_TRANSCRIPTION_PROCESS_TIMEOUT_MS, 1_000);
}

export function hordeTimeoutMs(): number {
  return readTimeout('AI_HORDE_TIMEOUT_MS', DEFAULT_HORDE_TIMEOUT_MS, 500);
}

export function mediaFetchTimeoutMs(): number {
  return readTimeout('MEDIA_FETCH_TIMEOUT_MS', DEFAULT_MEDIA_FETCH_TIMEOUT_MS, 500);
}

export function localProcessTimeoutMs(): number {
  return readTimeout('LOCAL_PROCESS_TIMEOUT_MS', DEFAULT_LOCAL_PROCESS_TIMEOUT_MS, 1_000);
}
