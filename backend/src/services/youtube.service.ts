import { Logger } from '@utils/logger';
import { providerTimeoutMs } from '@utils/timeout.util';

export interface YouTubeSearchItem {
  tipo: 'video';
  id: string;
  url: string;
  link: string;
  titulo: string;
  title: string;
  descricao: string;
  description: string;
  duracao: string;
  duration: string;
  segundos: number;
  views: number;
  publicado: string;
  published: string;
  canal: string;
  channel: string;
  canalUrl: string;
  channelUrl: string;
  autor: { nome: string; url: string };
  author: string;
  thumbnail: string;
  imagen: string;
  thumbnails: string[];
}

export interface YouTubeSearchResponse {
  status: number;
  query: string;
  total: number;
  resultados: YouTubeSearchItem[];
  data: YouTubeSearchItem[];
  results: YouTubeSearchItem[];
}

const YT_INITIAL_DATA_RE = /var ytInitialData\s*=\s*(\{.+?\});\s*(?:var|window\[|<\/script>)/s;
const YT_INITIAL_DATA_ALT_RE = /ytInitialData"\]\s*=\s*(\{.+?\});/s;

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const obj = value as Record<string, unknown>;
  if (typeof obj.simpleText === 'string') return obj.simpleText.trim();
  if (Array.isArray(obj.runs)) {
    return obj.runs
      .map((run) => (run && typeof run === 'object' && typeof (run as any).text === 'string' ? (run as any).text : ''))
      .join('')
      .trim();
  }
  return '';
}

function parseDurationToSeconds(value: string): number {
  const parts = value.trim().split(':').map((p) => Number(p));
  if (!parts.length || parts.some((p) => !Number.isFinite(p) || p < 0)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function parseViewCount(value: string): number {
  const normalized = value.toLowerCase().replace(/\u00a0/g, ' ').trim();
  if (!normalized) return 0;
  const match = normalized.match(/([\d.,]+)\s*([kmbmil]*)/i);
  if (!match) {
    const digits = normalized.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }
  const num = Number(match[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(num)) return 0;
  const suffix = (match[2] || '').toLowerCase();
  const mult = suffix.startsWith('b') ? 1_000_000_000
    : suffix.startsWith('k') ? 1_000
    : suffix.includes('mi') && !suffix.includes('mil') ? 1_000_000
    : suffix.startsWith('mil') ? 1_000
    : suffix.startsWith('m') ? 1_000_000
    : 1;
  return Math.round(num * mult);
}

function pickThumbnail(thumbnails: unknown, videoId: string): { thumbnail: string; thumbnails: string[] } {
  const list = Array.isArray(thumbnails)
    ? thumbnails
        .map((t) => (t && typeof t === 'object' && typeof (t as any).url === 'string' ? String((t as any).url) : ''))
        .filter(Boolean)
        .map((u) => (u.startsWith('//') ? `https:${u}` : u))
    : [];
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const thumbnail = list[list.length - 1] || fallback;
  return { thumbnail, thumbnails: list.length ? list : [fallback] };
}

function extractVideoRenderer(item: unknown): YouTubeSearchItem | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const vr = obj.videoRenderer;
  if (!vr || typeof vr !== 'object') return null;
  const v = vr as Record<string, unknown>;

  const videoId = typeof v.videoId === 'string' ? v.videoId : '';
  if (!videoId) return null;

  const title = asText(v.title);
  const description = asText(v.detailedMetadataSnippets?.[0] && typeof v.detailedMetadataSnippets?.[0] === 'object'
    ? (v.detailedMetadataSnippets as any[])[0]?.snippetText
    : v.descriptionSnippet);
  const duration = asText(v.lengthText);
  const segundos = parseDurationToSeconds(duration);
  const viewText = asText(v.viewCountText);
  const views = parseViewCount(viewText);
  const published = asText(v.publishedTimeText);
  const badges = Array.isArray(v.badges) ? v.badges : [];
  const overlayBadges = Array.isArray((v.thumbnailOverlays as any)) ? (v.thumbnailOverlays as any[]) : [];
  const isLive = badges.some((b: any) => /live|ao vivo/i.test(asText(b?.metadataBadgeRenderer?.label) || JSON.stringify(b)))
    || overlayBadges.some((o: any) => /live|ao vivo/i.test(asText(o?.thumbnailOverlayTimeStatusRenderer?.text) || JSON.stringify(o)))
    || /ao vivo|live/i.test(published) || /assistindo/i.test(viewText);
  const channel = asText(v.ownerText) || asText(v.longBylineText) || asText(v.shortBylineText);
  const channelRuns = (v.ownerText as any)?.runs ?? (v.longBylineText as any)?.runs ?? (v.shortBylineText as any)?.runs;
  const channelPath = Array.isArray(channelRuns) && channelRuns[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
  const channelUrl = typeof channelPath === 'string'
    ? `https://www.youtube.com${channelPath}`
    : Array.isArray(channelRuns) && typeof channelRuns[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url === 'string'
      ? `https://www.youtube.com${channelRuns[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
      : '';
  const { thumbnail, thumbnails } = pickThumbnail((v.thumbnail as any)?.thumbnails, videoId);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    tipo: 'video',
    id: videoId,
    url,
    link: url,
    titulo: title,
    title,
    descricao: description,
    description,
    duracao: duration,
    duration,
    segundos,
    views,
    publicado: published,
    published,
    canal: channel,
    channel,
    canalUrl: channelUrl,
    channelUrl,
    autor: { nome: channel || 'YouTube', url: channelUrl },
    author: channel || 'YouTube',
    thumbnail,
    imagen: thumbnail,
    thumbnails,
  };
}

function collectVideoRenderers(root: unknown, out: YouTubeSearchItem[], seen: Set<string>, depth = 0): void {
  if (!root || depth > 12) return;
  if (Array.isArray(root)) {
    for (const item of root) collectVideoRenderers(item, out, seen, depth + 1);
    return;
  }
  if (typeof root !== 'object') return;
  const obj = root as Record<string, unknown>;
  if (obj.videoRenderer) {
    const vr = (obj.videoRenderer as any);
    const badges = Array.isArray(vr?.badges) ? vr.badges : [];
    const overlays = Array.isArray(vr?.thumbnailOverlays) ? vr.thumbnailOverlays : [];
    const live = badges.some((b: any) => /live|ao vivo/i.test(asText(b?.metadataBadgeRenderer?.label)))
      || overlays.some((o: any) => /live|ao vivo/i.test(asText(o?.thumbnailOverlayTimeStatusRenderer?.text)));
    if (!live) {
      const video = extractVideoRenderer(obj);
      if (video && !seen.has(video.id)) {
        seen.add(video.id);
        out.push(video);
      }
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') collectVideoRenderers(value, out, seen, depth + 1);
  }
}

function extractYtInitialData(html: string): unknown {
  for (const re of [YT_INITIAL_DATA_RE, YT_INITIAL_DATA_ALT_RE]) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        return JSON.parse(m[1]);
      } catch {
        // continue
      }
    }
  }
  // Fallback: find "ytInitialData" = {...}; by brace balancing
  const marker = 'var ytInitialData = ';
  const idx = html.indexOf(marker);
  if (idx >= 0) {
    const start = html.indexOf('{', idx + marker.length);
    if (start >= 0) {
      let depthCount = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < html.length; i++) {
        const ch = html[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') { inStr = true; continue; }
        if (ch === '{') depthCount++;
        else if (ch === '}') {
          depthCount--;
          if (depthCount === 0) {
            try { return JSON.parse(html.slice(start, i + 1)); } catch { break; }
          }
        }
      }
    }
  }
  return null;
}

export async function youtubeSearchDirect(query: string, limit = 20): Promise<YouTubeSearchResponse> {
  const q = query.trim().slice(0, 200);
  if (!q) {
    return { status: 200, query: q, total: 0, resultados: [], data: [], results: [] };
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=pt&gl=BR`;
  const controller = new AbortController();
  const timeout = Math.max(1500, Math.min(providerTimeoutMs(), 8000));
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`YouTube search returned ${res.status}`);
    }

    const html = await res.text();
    const data = extractYtInitialData(html);
    if (!data) {
      throw new Error('Não foi possível extrair dados da busca do YouTube.');
    }

    const out: YouTubeSearchItem[] = [];
    const seen = new Set<string>();
    collectVideoRenderers(data, out, seen);
    const resultados = out.slice(0, Math.max(1, Math.min(limit, 50)));

    return {
      status: 200,
      query: q,
      total: resultados.length,
      resultados,
      data: resultados,
      results: resultados,
    };
  } catch (error: any) {
    Logger.warning(`Busca direta YouTube falhou: ${error?.message || error}`, 'YouTubeSearch');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const youtubeService = {
  search: youtubeSearchDirect,
};
