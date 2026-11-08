"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@lib/auth/http";
import { Icon } from "@components/dashboard/icons";
import type { ApiDoc, DocPreview } from "@lib/docs";

const SHAZAM_SAMPLE =
  "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/57/a5/85/57a585aa-f1bc-7619-881b-f8a04a5541d5/mzaf_6906185026678279401.plus.aac.p.m4a";
const SOUNDCLOUD_SAMPLE = "https://soundcloud.com/forss/flickermood";

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1
});

type JsonObject = Record<string, unknown>;

interface PreviewField {
  name: string;
  label: string;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
}

interface YouTubeItem {
  title: string;
  url: string | null;
  image: string | null;
  duration: string | null;
  views: number | null;
  channel: string | null;
  posted: string | null;
}

interface PinItem {
  title: string;
  pinUrl: string | null;
  image: string | null;
  uploader: string | null;
}

interface MediaLink {
  url: string;
  quality: string;
}

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function get(source: unknown, ...path: string[]): unknown {
  let current = source;

  for (const key of path) {
    const object = asObject(current);
    if (!object) return undefined;
    current = object[key];
  }

  return current;
}

function getText(source: unknown, ...path: string[]): string | null {
  return asText(get(source, ...path));
}

function getArray(source: unknown, ...path: string[]): unknown[] {
  return asArray(get(source, ...path));
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isImageUrl(value: string): boolean {
  if (!isHttpUrl(value)) return false;

  return (
    /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(value) ||
    /(?:pinimg|ytimg|tiktokcdn|sndcdn|fbcdn|cdninstagram|googleusercontent|unsplash|pexels|wallhaven|imgur)/i.test(
      value
    )
  );
}

function collectImages(value: unknown, key = "", found: string[] = []): string[] {
  if (typeof value === "string") {
    if (isImageUrl(value) && !found.includes(value)) found.push(value);
    return found;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectImages(entry, key, found);
    return found;
  }

  const object = asObject(value);

  if (object) {
    for (const [childKey, entry] of Object.entries(object)) {
      collectImages(entry, childKey.toLowerCase(), found);
    }
  }

  return found;
}

function formatViews(value: number): string {
  return compactNumber.format(value);
}

function formatDuration(value: string | null): string | null {
  if (!value) return null;

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(value);

  if (!match) return value;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function fieldsFor(doc: ApiDoc, preview: DocPreview): PreviewField[] {
  switch (preview) {
    case "summarize":
      return [
        { name: "text", label: "Texto para resumir", placeholder: "Cole aqui o texto que deseja resumir.", multiline: true },
        { name: "language", label: "Idioma", placeholder: "auto, pt ou en", hint: "Padrão: auto (mantém o idioma do texto)." },
        { name: "style", label: "Formato", placeholder: "paragraph ou bullets" },
        { name: "length", label: "Tamanho", placeholder: "short, medium ou detailed" }
      ];
    case "audio-summarize":
      return [
        { name: "language", label: "Idioma do áudio", placeholder: "auto, pt ou en", hint: "Padrão: auto. Selecione um arquivo abaixo ou use o áudio de exemplo." },
        { name: "style", label: "Formato do resumo", placeholder: "paragraph ou bullets" },
        { name: "length", label: "Tamanho do resumo", placeholder: "short, medium ou detailed" }
      ];
    case "ocr":
      return [
        { name: "language", label: "Idioma do texto", placeholder: "auto, pt ou en", hint: "Padrão: auto (português e inglês). Escolha uma imagem abaixo." }
      ];
    case "ai":
      return [
        {
          name: "query",
          label: "Pergunta ou instrução",
          placeholder: "Explique o que é a Orbit API em uma frase."
        }
      ];
    case "image-generation":
      return [
        { name: "prompt", label: "Descrição da imagem", placeholder: "Uma cidade futurista ao pôr do sol, arte digital" },
        ...(doc.slug.includes("stable-diffusion")
          ? [{ name: "negative_prompt", label: "Prompt negativo (opcional)", placeholder: "texto, marca d'água, imagem borrada" }]
          : []),
        { name: "width", label: "Largura", placeholder: "512" },
        { name: "height", label: "Altura", placeholder: "512" },
        { name: "steps", label: "Etapas", placeholder: "20" }
      ];
    case "youtube":
      return [
        {
          name: "query",
          label: "Termo de pesquisa",
          placeholder: "gatos fofos"
        }
      ];
    case "pinterest":
      return [
        {
          name: "query",
          label: "Pesquisar pins",
          placeholder: "gatos",
          hint: "Se preenchido, a busca por termo tem prioridade."
        },
        {
          name: "url",
          label: "Ou baixar por URL",
          placeholder: "https://br.pinterest.com/pin/...",
          hint: "Limpe a pesquisa acima para usar a URL."
        }
      ];
    case "shazam":
      return [
        {
          name: "audioUrl",
          label: "URL do áudio",
          placeholder: "https://exemplo.com/audio.mp3"
        }
      ];
    case "tiktok-images":
      return [
        {
          name: "url",
          label: "URL do post",
          placeholder: "https://www.tiktok.com/@usuario/photo/..."
        }
      ];
    case "video":
      return [
        {
          name: "url",
          label: "URL do vídeo",
          placeholder: "https://www.facebook.com/watch/?v=..."
        }
      ];
    case "audio":
      return [
        {
          name: "url",
          label: "URL da faixa",
          placeholder: "https://soundcloud.com/usuario/faixa"
        }
      ];
    case "download": {
      const platform = doc.slug[1];
      const examples: Record<string, string> = {
        spotify: "https://open.spotify.com/track/...",
        threads: "https://www.threads.com/@usuario/post/...",
        "google-drive": "https://drive.google.com/file/d/.../view",
        capcut: "https://www.capcut.com/template-detail/...",
        twitter: "https://x.com/usuario/status/..."
      };
      return [
        {
          name: "url",
          label: "URL pública",
          placeholder: examples[platform] ?? "https://...",
          hint: "Use um link público da plataforma selecionada."
        }
      ];
    }
    case "ytdl":
      return [
        {
          name: "url",
          label: "URL do vídeo",
          placeholder: "https://www.youtube.com/watch?v=..."
        }
      ];
    case "media":
      if (doc.slug.includes("play-audio")) {
        return [
          {
            name: "name",
            label: "Nome da música",
            placeholder: "Shape of You"
          }
        ];
      }
      if (doc.slug.includes("play-video")) {
        return [
          {
            name: "name",
            label: "Nome do vídeo",
            placeholder: "Vídeo de gatos fofos"
          }
        ];
      }
      if (doc.slug.includes("instagram")) {
        return [
          {
            name: "url",
            label: "URL do Reel ou post",
            placeholder: "https://www.instagram.com/reel/..."
          },
          {
            name: "type",
            label: "Tipo de mídia",
            placeholder: "video ou image",
            hint: "Digite video ou image"
          }
        ];
      }
      if (doc.slug.some((slug) => slug.includes("tiktok"))) {
        return [
          {
            name: "url",
            label: "URL do vídeo do TikTok",
            placeholder: "https://vm.tiktok.com/..."
          }
        ];
      }
      return [
        {
          name: "url",
          label: "URL do conteúdo",
          placeholder: "https://www.youtube.com/watch?v=..."
        }
      ];
    case "effects":
      return [
        {
          name: "url",
          label: "URL da imagem",
          placeholder: "https://images.unsplash.com/photo-..."
        },
        {
          name: "effect",
          label: "Efeito",
          placeholder: "circle, invert, blur, pixel, mirror...",
          hint: "Opções: invert, blur, mirror, circle, gray, pixel, upscale"
        },
        {
          name: "format",
          label: "Formato de saída",
          placeholder: "png ou webp"
        }
      ];
    case "transcribe":
      return [
        {
          name: "language",
          label: "Idioma do áudio",
          placeholder: "auto, pt ou en",
          hint: "Padrão: auto. Selecione um arquivo abaixo ou use o áudio de exemplo."
        }
      ];
    case "to-gif":
      return [];
    default:
      return [];
  }
}

function defaultsFor(doc: ApiDoc, preview: DocPreview): Record<string, string> {
  switch (preview) {
    case "ai":
      return { query: "Explique o que é a Orbit API em uma frase." };
    case "summarize":
      return {
        text: "A Orbit API reúne downloads, inteligência artificial, canvas, stickers e utilitários em uma única integração para bots e projetos.",
        language: "pt",
        style: "bullets",
        length: "short"
      };
    case "audio-summarize":
      return { language: "auto", style: "paragraph", length: "medium" };
    case "ocr":
      return { language: "auto" };
    case "image-generation":
      return doc.slug.includes("stable-diffusion")
        ? { prompt: "Uma raposa em uma floresta iluminada por vaga-lumes, ilustração digital", negative_prompt: "texto, marca d'água, imagem borrada", width: "512", height: "512", steps: "20" }
        : { prompt: "Uma cidade futurista ao pôr do sol, arte digital", width: "512", height: "512", steps: "20" };
    case "youtube":
      return { query: "gatos fofos" };
    case "pinterest":
      return { query: "gatos" };
    case "shazam":
      return { audioUrl: SHAZAM_SAMPLE };
    case "video":
      return { url: "https://www.facebook.com/watch/?v=10153231379946729" };
    case "audio":
      return { url: SOUNDCLOUD_SAMPLE };
    case "download":
      return {};
    case "ytdl":
      return { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk" };
    case "media":
      if (doc.slug.includes("play-audio")) {
        return { name: "Shape of You" };
      }
      if (doc.slug.includes("play-video")) {
        return { name: "Vídeo de gatos fofos" };
      }
      if (doc.slug.includes("instagram")) {
        return {
          url: "https://www.instagram.com/reel/DfZkZLXP0gw/?vrfl=emx5aWQ5czR0ZmZo",
          type: "video"
        };
      }
      if (doc.slug.some((slug) => slug.includes("tiktok"))) {
        return { url: "https://vm.tiktok.com/ZSpk6mMKE/" };
      }
      return { url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk" };
    case "tiktok-images":
      return { url: "https://vm.tiktok.com/ZSpk6mMKE/" };
    case "effects":
      return {
        url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
        effect: "circle",
        format: "png"
      };
    case "transcribe":
      return { language: "auto" };
    case "to-gif":
      return {};
    default:
      return {};
  }
}

function RemoteImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-zinc-600">
        <Icon name="image" className="h-6 w-6" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 640px) 50vw, 240px"
      onError={() => setFailed(true)}
      className="object-cover"
    />
  );
}

function EmptyResult({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-8 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

function GeneratedImageResult({ generation }: { generation: JsonObject }) {
  const image = asText(generation.img) ?? asText(generation.image) ?? asText(generation.url);
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <EmptyResult
        message={generation.censored === true
          ? "A imagem foi ocultada pelo filtro de segurança do worker."
          : "O AI Horde concluiu a geração, mas não retornou uma imagem exibível."}
      />
    );
  }

  const src = image.startsWith("data:") || isHttpUrl(image)
    ? image
    : `data:image/webp;base64,${image}`;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Imagem gerada com Stable Diffusion"
        onError={() => setFailed(true)}
        className="mx-auto max-h-[560px] max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

function ImageGrid({
  images,
  alt,
  links,
  aspect = "aspect-square"
}: {
  images: string[];
  alt: string;
  links?: (string | null)[];
  aspect?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((src, index) => (
        <a
          key={`${src}-${index}`}
          href={links?.[index] ?? src}
          target="_blank"
          rel="noreferrer"
          className={`group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] ${aspect}`}
        >
          <RemoteImage src={src} alt={`${alt} ${index + 1}`} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="absolute bottom-2 right-2 rounded-md bg-black/60 p-1 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Icon name="download" className="h-3.5 w-3.5" />
          </span>
        </a>
      ))}
    </div>
  );
}

function AiResult({ data }: { data: unknown }) {
  const summary = getText(data, "summary");
  const texts = getArray(data, "data")
    .map((item) => getText(item, "resposta") ?? getText(item, "response") ?? getText(item, "text"))
    .filter((text): text is string => Boolean(text));

  const direct = summary ?? getText(data, "resposta") ?? getText(data, "resultado", "resposta");

  if (texts.length === 0 && direct) texts.push(direct);
  if (texts.length === 0) {
    return <EmptyResult message="A IA não retornou uma resposta em texto." />;
  }

  return (
    <div className="space-y-3">
      {texts.map((text, index) => (
        <div
          key={index}
          className="rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Resposta
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{text}</p>
        </div>
      ))}
    </div>
  );
}

function OcrResult({ data }: { data: unknown }) {
  const text = getText(data, "text") ?? "";
  const language = getText(data, "language") ?? "auto";

  if (!text) return <EmptyResult message="Nenhum texto foi encontrado na imagem." />;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#151517] p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
        <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">Tesseract OCR</span>
        <span className="text-xs text-zinc-400">Idioma: <span className="font-semibold text-zinc-200 uppercase">{language}</span></span>
      </div>
      <p className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4 text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap select-all">{text}</p>
    </div>
  );
}

function AudioSummarizeResult({ data }: { data: unknown }) {
  const summary = getText(data, "summary") ?? "";
  const transcript = getText(data, "text") ?? "";
  const language = getText(data, "language") ?? "auto";

  if (!summary) return <EmptyResult message="O áudio foi processado, mas não retornou um resumo." />;

  return (
    <div className="space-y-3">
      <AiResult data={{ summary }} />
      {transcript && (
        <details className="rounded-xl border border-white/[0.07] bg-[#151517] p-4">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-300">Ver transcrição · {language.toUpperCase()}</summary>
          <p className="mt-3 whitespace-pre-wrap border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-zinc-400">{transcript}</p>
        </details>
      )}
    </div>
  );
}

function parseYouTube(data: unknown): YouTubeItem[] {
  const source = getArray(data, "data").length > 0
    ? getArray(data, "data")
    : getArray(data, "videos");

  return source
    .map((entry) => {
      const item = asObject(entry);

      return {
        title: getText(item, "titulo") ?? getText(item, "title") ?? "Vídeo sem título",
        url: getText(item, "link") ?? getText(item, "url"),
        image: getText(item, "imagen") ?? getText(item, "thumbnail"),
        duration: getText(item, "duracao") ?? getText(item, "duration"),
        views: asNumber(get(item, "views")) ?? asNumber(get(item, "viewCount")),
        channel: getText(item, "autor", "nome") ?? getText(item, "channel"),
        posted: getText(item, "postado")
      };
    })
    .filter((item) => item.url !== null || item.title !== "Vídeo sem título");
}

function YouTubeResult({ data }: { data: unknown }) {
  const items = parseYouTube(data);

  if (items.length === 0) {
    return <EmptyResult message="Nenhum vídeo encontrado para este termo." />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">{items.length} resultado(s)</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((item, index) => (
          <a
            key={`${item.url ?? item.title}-${index}`}
            href={item.url ?? "#"}
            target={item.url ? "_blank" : undefined}
            rel={item.url ? "noreferrer" : undefined}
            className="group overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] transition hover:border-violet-400/30"
          >
            <div className="relative aspect-video bg-white/[0.03]">
              {item.image ? (
                <RemoteImage src={item.image} alt={item.title} />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600">
                  <Icon name="youtube" className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-white">
                {item.title}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                {[
                  item.channel,
                  formatDuration(item.duration),
                  item.views !== null ? `${formatViews(item.views)} views` : null,
                  item.posted
                ]
                  .filter((part): part is string => Boolean(part))
                  .join(" · ")}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function TikTokImagesResult({ data }: { data: unknown }) {
  const images = getArray(data, "imagens").filter(
    (value): value is string => typeof value === "string" && isHttpUrl(value)
  );
  const description = getText(data, "descricao");
  const total = asNumber(get(data, "total")) ?? images.length;

  if (images.length === 0) {
    return <EmptyResult message="Nenhuma imagem retornada para este post do TikTok." />;
  }

  return (
    <div className="space-y-3">
      {description && <p className="text-sm leading-relaxed text-zinc-300">{description}</p>}
      <p className="text-xs text-zinc-500">{total} imagem(ns)</p>
      <ImageGrid images={images.slice(0, 12)} alt="Slide do TikTok" aspect="aspect-[3/4]" />
    </div>
  );
}

function ShazamResult({ data }: { data: unknown }) {
  const track = asObject(get(data, "resultado"));

  if (!track) {
    return <EmptyResult message="Não foi possível identificar uma música neste áudio." />;
  }

  const title = getText(track, "titulo") ?? "Música identificada";
  const artist = getText(track, "artista");
  const album = getText(track, "album");
  const year = getText(track, "ano");
  const genre = getText(track, "genero");
  const cover = getText(track, "capa");
  const preview = getText(track, "preview");
  const url = getText(track, "url_shazam");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#151517] p-4 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
        {cover ? (
          <RemoteImage src={cover} alt={title} />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Icon name="mic" className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
          Música identificada
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-zinc-400">{artist ?? "Artista desconhecido"}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            album ? `Álbum: ${album}` : null,
            year ? `Ano: ${year}` : null,
            genre ? `Gênero: ${genre}` : null
          ]
            .filter((item): item is string => Boolean(item))
            .map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400"
              >
                {item}
              </span>
            ))}
        </div>

        {preview && (
          <audio controls preload="none" src={preview} className="mt-4 h-9 w-full">
            Seu navegador não suporta a reprodução de áudio.
          </audio>
        )}

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200"
          >
            Abrir no Shazam
            <Icon name="chevron" className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function parsePinterest(data: unknown): { query: string | null; count: number | null; pins: PinItem[] } {
  const result = asObject(get(data, "result"));

  if (!result) {
    return { query: null, count: null, pins: [] };
  }

  const pins = getArray(result, "result")
    .map((entry) => {
      const pin = asObject(entry);

      return {
        title: getText(pin, "title") ?? "",
        pinUrl: getText(pin, "pin_url"),
        image:
          getText(pin, "image_url") ??
          getText(pin, "images", "large") ??
          getText(pin, "images", "original"),
        uploader:
          getText(pin, "uploader", "full_name") ?? getText(pin, "uploader", "username")
      };
    })
    .filter((pin) => Boolean(pin.image));

  return {
    query: getText(result, "query"),
    count: asNumber(get(result, "count")),
    pins
  };
}

function DownloadMediaResult({ data }: { data: unknown }) {
  const url = getText(data, "downloadUrl");
  const mediaType = getText(data, "mediaType");
  const title = getText(data, "metadata", "title") ?? "Mídia baixada";
  const author = getText(data, "metadata", "author");

  if (!url) {
    return <EmptyResult message="O Pinterest não retornou uma mídia para esta URL." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517]">
      {mediaType === "video" ? (
        <video controls src={url} className="max-h-[360px] w-full bg-black" />
      ) : mediaType === "audio" ? (
        <div className="p-4">
          <audio controls src={url} className="w-full" />
        </div>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-[3/4] max-h-[420px] bg-white/[0.03]"
        >
          <RemoteImage src={url} alt={title} />
        </a>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-200">{title}</p>
          {author && <p className="truncate text-xs text-zinc-500">{author}</p>}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200"
        >
          Abrir mídia
          <Icon name="chevron" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

function PinterestResult({ data }: { data: unknown }) {
  const { query, count, pins } = parsePinterest(data);

  if (pins.length === 0) {
    if (getText(data, "downloadUrl")) {
      return <DownloadMediaResult data={data} />;
    }

    return <EmptyResult message="Nenhum pin encontrado para esta pesquisa." />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {count ?? pins.length} pin(s){query ? ` para "${query}"` : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pins.slice(0, 9).map((pin, index) => (
          <a
            key={`${pin.pinUrl ?? pin.image}-${index}`}
            href={pin.pinUrl ?? pin.image ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] transition hover:border-violet-400/30"
          >
            <div className="relative aspect-[3/4] bg-white/[0.03]">
              {pin.image && <RemoteImage src={pin.image} alt={pin.title || "Pin do Pinterest"} />}
            </div>
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-medium text-zinc-200 group-hover:text-white">
                {pin.title || "Pin do Pinterest"}
              </p>
              {pin.uploader && (
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{pin.uploader}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function FacebookResult({ data }: { data: unknown }) {
  const links: MediaLink[] = [];

  for (const entry of getArray(data, "videos")) {
    const video = asObject(entry);
    const hd = getText(video, "hd");
    const normal = getText(video, "normal") ?? getText(video, "sd");

    if (hd) links.push({ url: hd, quality: "HD" });
    if (normal && normal !== hd) links.push({ url: normal, quality: "SD" });
  }

  if (links.length === 0) {
    return <EmptyResult message="O Facebook não retornou links de vídeo para esta publicação." />;
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.url}
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517]"
        >
          <video controls src={link.url} className="aspect-video w-full bg-black" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span className="text-xs text-zinc-500">Qualidade {link.quality}</span>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200"
            >
              Abrir vídeo
              <Icon name="chevron" className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function SoundCloudResult({ data }: { data: unknown }) {
  const track = asObject(get(data, "data"));

  if (!track) {
    return <EmptyResult message="O SoundCloud não retornou informações para esta faixa." />;
  }

  const title = getText(track, "title") ?? "Faixa do SoundCloud";
  const thumbnail = getText(track, "thumbnail");
  const audio = getText(track, "audio") ?? getText(track, "downloadMp3");
  const downloadMp3 = getText(track, "downloadMp3");
  const downloadArtwork = getText(track, "downloadArtwork");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/[0.07] bg-[#151517] p-4 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
        {thumbnail ? (
          <RemoteImage src={thumbnail} alt={title} />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Icon name="mic" className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
          SoundCloud
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">{title}</h3>

        {audio ? (
          <audio controls preload="none" src={audio} className="mt-4 h-9 w-full">
            Seu navegador não suporta a reprodução de áudio.
          </audio>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            O provedor não retornou um link de áudio direto para esta faixa.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {downloadMp3 && (
            <a
              href={downloadMp3}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-400/15 hover:text-white"
            >
              Baixar MP3
            </a>
          )}
          {downloadArtwork && (
            <a
              href={downloadArtwork}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-violet-400/30 hover:text-violet-200"
            >
              Baixar capa
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaResult({ data }: { data: unknown }) {
  const downloadUrl = getText(data, "downloadUrl") || getText(data, "url");
  const mediaType = getText(data, "mediaType");
  const title = getText(data, "metadata", "title") ?? getText(data, "title") ?? "Mídia";
  const author = getText(data, "metadata", "author") ?? getText(data, "author");
  const thumbnail = getText(data, "metadata", "thumbnail") || getText(data, "thumbnail");

  if (!downloadUrl) {
    return <EmptyResult message="Não foi possível resolver o link de download." />;
  }

  const isAudio = mediaType === "audio" || /\.(mp3|m4a|ogg|opus)($|\?)/i.test(downloadUrl);
  const isVideo = mediaType === "video" || /\.(mp4|webm|mkv|mov)($|\?)/i.test(downloadUrl);
  const isImage = !isAudio && !isVideo;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] p-4 flex flex-col sm:flex-row gap-4">
      {isImage ? (
        <div className="relative aspect-square max-h-[360px] w-full shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
          <RemoteImage src={downloadUrl} alt={title} />
        </div>
      ) : (
        <div className="relative h-44 w-full sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
          {thumbnail ? (
            <RemoteImage src={thumbnail} alt={title} />
          ) : isAudio ? (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <Icon name="mic" className="h-8 w-8" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-600">
              <Icon name="youtube" className="h-8 w-8" />
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
            {isAudio ? "Áudio" : isVideo ? "Vídeo" : "Imagem"}
          </span>
          {author && <span className="truncate text-xs text-zinc-500">• {author}</span>}
        </div>
        <h3 className="mt-1 text-base sm:text-lg font-semibold text-white">{title}</h3>

        {isAudio ? (
          <audio controls preload="metadata" src={downloadUrl} className="mt-4 h-9 w-full">
            Seu navegador não suporta a reprodução de áudio.
          </audio>
        ) : isVideo ? (
          <video controls preload="metadata" src={downloadUrl} className="mt-4 max-h-[360px] w-full rounded-lg bg-black" />
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-400/15 hover:text-white"
          >
            Baixar {isAudio ? "Áudio" : isVideo ? "Vídeo" : "Imagem"}
          </a>
          {thumbnail && (
            <a
              href={thumbnail}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Baixar Capa
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EffectsResult({ data }: { data: unknown }) {
  const blobUrl = getText(data, "blobUrl");
  const effect = getText(data, "effect") ?? "efeito";

  if (!blobUrl) {
    return <EmptyResult message="Não foi possível gerar a imagem com os efeitos solicitados." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
          Efeito: {effect}
        </span>
        <a
          href={blobUrl}
          download="canvas-effect.png"
          className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-3 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-400/15 hover:text-white"
        >
          Baixar imagem
        </a>
      </div>

      <div className="flex justify-center bg-[#0c0c0e] p-4 rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blobUrl} alt="Efeito Canvas" className="max-h-[380px] rounded-lg object-contain" />
      </div>
    </div>
  );
}

function TranscribeResult({ data }: { data: unknown }) {
  const text = getText(data, "text") ?? "";
  const duration = asNumber(get(data, "durationSeconds"));
  const language = getText(data, "language") ?? "auto";
  const [copied, setCopied] = useState(false);

  function copyText() {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!text) {
    return <EmptyResult message="Nenhum texto reconhecido na transcrição." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
            Whisper AI
          </span>
          {language && (
            <span className="text-xs text-zinc-400">
              Idioma: <span className="font-semibold text-zinc-200 uppercase">{language}</span>
            </span>
          )}
          {duration !== null && (
            <span className="text-xs text-zinc-500">• {duration.toFixed(1)}s</span>
          )}
        </div>
        <button
          type="button"
          onClick={copyText}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08]"
        >
          {copied ? "Copiado!" : "Copiar texto"}
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0e] p-4 text-sm leading-relaxed text-zinc-100 select-all whitespace-pre-wrap font-sans">
        {text}
      </div>
    </div>
  );
}

function ToGifResult({ data }: { data: unknown }) {
  const blobUrl = getText(data, "blobUrl");
  const size = asNumber(get(data, "size"));

  if (!blobUrl) {
    return <EmptyResult message="Não foi possível converter a imagem para GIF." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#151517] p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
            GIF Animado
          </span>
          {size && <span className="text-xs text-zinc-500">{(size / 1024).toFixed(1)} KB</span>}
        </div>
        <a
          href={blobUrl}
          download="orbit-converted.gif"
          className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/15 hover:text-white"
        >
          Baixar GIF
        </a>
      </div>

      <div className="flex justify-center bg-[#0c0c0e] p-4 rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blobUrl} alt="GIF convertido" className="max-h-[380px] rounded-lg object-contain" />
      </div>
    </div>
  );
}

function JsonFallback({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[360px] overflow-auto rounded-xl border border-white/[0.07] bg-[#0c0c0e] p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function PreviewResult({
  doc,
  preview,
  data
}: {
  doc: ApiDoc;
  preview: DocPreview;
  data: unknown;
}) {
  switch (preview) {
    case "ai":
    case "summarize":
      return <AiResult data={data} />;
    case "audio-summarize":
      return <AudioSummarizeResult data={data} />;
    case "ocr":
      return <OcrResult data={data} />;
    case "image-generation": {
      const generations = getArray(data, "generations");
      const first = asObject(generations[0]);
      return first ? <GeneratedImageResult generation={first} /> : <EmptyResult message="O AI Horde concluiu a solicitação sem retornar uma imagem." />;
    }
    case "youtube":
      return <YouTubeResult data={data} />;
    case "shazam":
      return <ShazamResult data={data} />;
    case "tiktok-images":
      return <TikTokImagesResult data={data} />;
    case "pinterest":
      return <PinterestResult data={data} />;
    case "video":
      return <FacebookResult data={data} />;
    case "audio":
      return <SoundCloudResult data={data} />;
    case "download":
      return <JsonFallback data={data} />;
    case "ytdl":
    case "media":
      return <MediaResult data={data} />;
    case "effects":
      return <EffectsResult data={data} />;
    case "transcribe":
      return <TranscribeResult data={data} />;
    case "to-gif":
      return <ToGifResult data={data} />;
    default:
      return <JsonFallback data={data} />;
  }
}

export default function ApiPreview({ doc, preview }: { doc: ApiDoc; preview: DocPreview }) {
  const fields = fieldsFor(doc, preview);
  const [values, setValues] = useState<Record<string, string>>(() => defaultsFor(doc, preview));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasValues =
    preview === "to-gif" ||
    preview === "transcribe" ||
    preview === "audio-summarize" ||
    (preview === "ocr" && Boolean(selectedFile)) ||
    fields.length === 0 ||
    fields.some((field) => Boolean(values[field.name]?.trim()));

  async function runPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (preview === "image-generation") {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const params: Record<string, number> = {};
        for (const name of ["width", "height", "steps"]) {
          const value = Number(values[name]);
          if (Number.isFinite(value) && value > 0) params[name] = value;
        }
        const body: Record<string, unknown> = { prompt: values.prompt?.trim(), params };
        if (values.negative_prompt?.trim()) body.negative_prompt = values.negative_prompt.trim();
        const submitted = await apiFetch<{ id?: string; message?: string }>(doc.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!submitted.id) throw new Error(submitted.message || "AI Horde não retornou o id da geração.");
        for (let attempt = 0; attempt < 54; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 10000));
          const status = await apiFetch<unknown>(`/api/ai/image/status?id=${encodeURIComponent(submitted.id)}`);
          if (get(status, "done") === true) {
            setResult(status);
            return;
          }
          if (get(status, "faulted") === true) throw new Error("A geração falhou no AI Horde. Tente novamente.");
        }
        throw new Error(`A geração ainda está na fila. ID da requisição: ${submitted.id}`);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : requestError instanceof Error ? requestError.message : "Não foi possível gerar a imagem.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "summarize") {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const body: Record<string, string> = { text: values.text?.trim() ?? "" };
        for (const name of ["language", "style", "length"]) {
          const value = values[name]?.trim();
          if (value) body[name] = value;
        }
        const data = await apiFetch<unknown>(doc.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        setResult(data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível gerar o resumo.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "ocr") {
      if (!selectedFile) {
        setError("Selecione uma imagem para executar o OCR.");
        return;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (values.language?.trim()) formData.append("language", values.language.trim());
        const data = await apiFetch<unknown>(doc.path, { method: "POST", body: formData });
        setResult(data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível extrair o texto da imagem.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "audio-summarize") {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        if (selectedFile) {
          formData.append("file", selectedFile);
        } else {
          const sampleRes = await fetch(SHAZAM_SAMPLE);
          const sampleBlob = await sampleRes.blob();
          formData.append("file", sampleBlob, "sample.m4a");
        }
        for (const name of ["language", "style", "length"]) {
          const value = values[name]?.trim();
          if (value) formData.append(name, value);
        }
        const data = await apiFetch<unknown>(doc.path, { method: "POST", body: formData });
        setResult(data);
      } catch (requestError) {
        setError(requestError instanceof ApiError ? requestError.message : "Não foi possível resumir o áudio.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "transcribe") {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        if (selectedFile) {
          formData.append("file", selectedFile);
        } else {
          const sampleRes = await fetch(SHAZAM_SAMPLE);
          const sampleBlob = await sampleRes.blob();
          formData.append("file", sampleBlob, "sample.m4a");
        }
        if (values.language?.trim()) {
          formData.append("language", values.language.trim());
        }
        const data = await apiFetch<unknown>("/api/transcribe", {
          method: "POST",
          body: formData
        });
        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível executar a transcrição."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "to-gif") {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        let fileBlob: Blob | null = selectedFile;
        if (!fileBlob) {
          const sampleRes = await fetch("/api/sticker/brat?text=Orbit&preview=docs");
          fileBlob = await sampleRes.blob();
        }
        const formData = new FormData();
        formData.append("file", fileBlob, "sticker.webp");
        const data = await apiFetch<{ blobUrl: string }>("/api/utility/to-gif", {
          method: "POST",
          body: formData
        });
        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível converter a imagem para GIF."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (preview === "effects") {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const params = new URLSearchParams();
        if (values.url?.trim()) params.set("url", values.url.trim());
        if (values.effect?.trim()) params.set("effect", values.effect.trim());
        if (values.format?.trim()) params.set("format", values.format.trim());
        params.set("preview", "docs");

        const data = await apiFetch<{ blobUrl: string }>(`${doc.path}?${params.toString()}`);
        setResult({ ...data, effect: values.effect || "efeito", originalUrl: values.url });
      } catch (requestError) {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Não foi possível aplicar os efeitos na imagem."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const params = new URLSearchParams();

    if (preview === "pinterest") {
      const query = values.query?.trim();
      const url = values.url?.trim();

      if (query) params.set("query", query);
      else if (url) params.set("url", url);
    } else {
      for (const field of fields) {
        const value = values[field.name]?.trim();
        if (value) params.set(field.name, value);
      }
    }

    if (!params.toString()) {
      setError("Preencha os campos para executar a pré-visualização.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiFetch<unknown>(`${doc.path}?${params.toString()}`);
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Não foi possível executar a pré-visualização."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Icon name="eye" className="h-4 w-4 text-violet-300" />
            Pré-visualização
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Execute uma chamada real para este endpoint e veja a resposta formatada.
          </p>
        </div>

        <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
          Consome 1 request
        </span>
      </div>

      <form onSubmit={runPreview} className="mt-4 space-y-3">
        {fields.length > 0 && (
          <div className={fields.length > 1 ? "grid gap-3 sm:grid-cols-2" : ""}>
            {fields.map((field) => (
              <label key={field.name} className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  {field.label}
                </span>
                {field.multiline ? (
                  <textarea
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    rows={6}
                    spellCheck={false}
                    className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0c0c0e] px-3 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0c0e] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20"
                  />
                )}
                {field.hint && (
                  <span className="mt-1 block text-[11px] text-zinc-600">{field.hint}</span>
                )}
              </label>
            ))}
          </div>
        )}

        {(preview === "transcribe" || preview === "audio-summarize") && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Arquivo de áudio</span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : "Nenhum selecionado (usará áudio de exemplo)"}
              </span>
            </div>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-white/10 file:bg-white/[0.04] file:text-xs file:font-semibold file:text-zinc-200 file:cursor-pointer hover:file:bg-white/[0.08]"
            />
          </div>
        )}

        {preview === "ocr" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Imagem para OCR</span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : "Selecione uma imagem (máx. 15 MB)"}
              </span>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/tiff"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-white/10 file:bg-white/[0.04] file:text-xs file:font-semibold file:text-zinc-200 file:cursor-pointer hover:file:bg-white/[0.08]"
            />
          </div>
        )}

        {preview === "to-gif" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Imagem WebP para converter</span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : "Nenhum arquivo (usará sticker de exemplo)"}
              </span>
            </div>
            <input
              type="file"
              accept="image/webp,image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-white/10 file:bg-white/[0.04] file:text-xs file:font-semibold file:text-zinc-200 file:cursor-pointer hover:file:bg-white/[0.08]"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !hasValues}
            className="flex h-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-4 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Executando..." : "Executar pré-visualização"}
          </button>
          <span className="text-xs text-zinc-500">Usa sua sessão autenticada.</span>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200"
        >
          {error}
        </div>
      )}

      <div className="mt-4" aria-live="polite">
        {loading ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4">
            <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-violet-400/25 border-t-violet-300 motion-reduce:animate-none" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-300">{preview === "image-generation" ? "Criando sua imagem" : "Processando requisição"}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{preview === "image-generation" ? "Aguarde enquanto a imagem é criada. Isso pode levar alguns minutos." : "Aguarde a resposta da API."}</p>
            </div>
          </div>
        ) : result !== null ? (
          <PreviewResult doc={doc} preview={preview} data={result} />
        ) : (
          !error && (
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-7 text-center text-xs text-zinc-600">
              Preencha os campos e execute para ver a resposta formatada.
            </div>
          )
        )}
      </div>
    </div>
  );
}
