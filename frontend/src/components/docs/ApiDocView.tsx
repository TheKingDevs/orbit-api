"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type InputHTMLAttributes
} from "react";
import { useAuth } from "@lib/auth/AuthProvider";
import { useApiKey } from "@lib/auth/useApiKey";
import type { ApiDoc, DocParam, DocPlayground } from "@lib/docs";
import { Icon, type IconName } from "@components/dashboard/icons";

const SAMPLE_VALUES: Record<string, string> = {
  url: "https://exemplo.com/conteudo",
  avatarUrl: "https://exemplo.com/avatar.png",
  bgUrl: "https://exemplo.com/fundo.jpg",
  username: "Fulano",
  title: "Bem-vindo!",
  subtitle: "Seja bem-vindo ao nosso grupo",
  text: "Orbit API",
  type: "video",
  platform: "youtube",
  language: "auto",
  effect: "glow",
  position: "center",
  textColor: "#ffffff",
  backgroundColor: "#0f172a",
  fontSize: "48",
  duration: "3",
  fps: "12",
  format: "png",
  size: "512"
};

type PlaygroundPosition = "left" | "center" | "right";

interface PlaygroundValues {
  username: string;
  title: string;
  subtitle: string;
  avatarUrl: string;
  bgUrl: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  position: PlaygroundPosition;
}

type PlaygroundKind = DocPlayground;

const COLOR_OPTIONS = [
  "#ffffff",
  "#000000",
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#ea580c",
  "#eab308",
  "#ec4899",
  "#22d3ee",
  "#0f172a"
];

const ALIGNMENTS: { label: string; value: PlaygroundPosition; icon: IconName }[] = [
  { label: "Alinhar à esquerda", value: "left", icon: "alignLeft" },
  { label: "Centralizar", value: "center", icon: "alignCenter" },
  { label: "Alinhar à direita", value: "right", icon: "alignRight" }
];

function isCanvasPlayground(kind?: PlaygroundKind): kind is "welcome" | "goodbye" {
  return kind === "welcome" || kind === "goodbye";
}

function isStickerPlayground(
  kind?: PlaygroundKind
): kind is "ttp" | "attp" | "brat" | "abrat" {
  return kind === "ttp" || kind === "attp" || kind === "brat" || kind === "abrat";
}

function sampleValue(param: DocParam): string {
  const sample = SAMPLE_VALUES[param.name];

  if (sample) return sample;
  if (param.type === "link") return "https://exemplo.com";
  if (param.type === "number") return "1";

  return "valor";
}

function playgroundDefaults(kind: PlaygroundKind, username: string): PlaygroundValues {
  const canvas = isCanvasPlayground(kind);
  const plainSticker = kind === "ttp" || kind === "attp";

  return {
    username: canvas ? username : "",
    title: kind === "welcome" ? "Bem-vindo!" : canvas ? "Até logo!" : "",
    subtitle:
      kind === "welcome"
        ? "Seja bem-vindo ao nosso grupo"
        : canvas
          ? "Sentiremos sua falta!"
          : "",
    avatarUrl: "",
    bgUrl: "",
    text: canvas ? "" : plainSticker ? "Orbit API" : "Nem judas mentiu tanto assim",
    backgroundColor: plainSticker ? "#0f172a" : "#ffffff",
    textColor: plainSticker ? "#ffffff" : "#000000",
    position: canvas || plainSticker ? "center" : "left"
  };
}

function buildPreviewUrl(kind: PlaygroundKind, values: PlaygroundValues): string {
  const params = new URLSearchParams();

  if (isCanvasPlayground(kind)) {
    params.set("username", values.username.trim() || "Orbit");

    if (values.title.trim()) params.set("title", values.title.trim());
    if (values.subtitle.trim()) params.set("subtitle", values.subtitle.trim());
    if (values.avatarUrl.trim()) params.set("avatarUrl", values.avatarUrl.trim());
    if (values.bgUrl.trim()) params.set("bgUrl", values.bgUrl.trim());
    params.set("preview", "docs");
    params.set("_ts", String(Date.now()));

    return `/api/canvas/${kind}?${params.toString()}`;
  }

  params.set("text", values.text.trim() || "Orbit API");
  params.set("backgroundColor", values.backgroundColor);
  params.set("textColor", values.textColor);
  params.set("position", values.position);
  params.set("preview", "docs");
  params.set("_ts", String(Date.now()));

  return `/api/sticker/${kind}?${params.toString()}`;
}

function isBinaryResponse(path: string): boolean {
  return path.startsWith("/api/canvas") || path.startsWith("/api/sticker") || path === "/api/utility/to-gif";
}

function buildExample(
  doc: ApiDoc,
  origin: string,
  token: string,
  values?: PlaygroundValues
): string {
  const base = (origin || "https://sua-api.com").replace(/\/+$/, "");
  const method = doc.params.some((param) => param.type === "file")
    ? "POST"
    : doc.method.includes("GET")
      ? "GET"
      : "POST";
  const query = new URLSearchParams();

  if (values) {
    if (isCanvasPlayground(doc.playground)) {
      query.set("username", values.username.trim() || "Orbit");
      if (values.title.trim()) query.set("title", values.title.trim());
      if (values.subtitle.trim()) query.set("subtitle", values.subtitle.trim());
      if (values.avatarUrl.trim()) query.set("avatarUrl", values.avatarUrl.trim());
      if (values.bgUrl.trim()) query.set("bgUrl", values.bgUrl.trim());
    } else if (isStickerPlayground(doc.playground)) {
      query.set("text", values.text.trim() || "Orbit API");
      query.set("backgroundColor", values.backgroundColor);
      query.set("textColor", values.textColor);
      query.set("position", values.position);
    }
  } else {
    for (const param of doc.params) {
      if (!param.required || param.name === "token" || param.type === "file") continue;
      query.set(param.name, sampleValue(param));
    }
  }

  const queryString = query.toString();
  const url = `${base}${doc.path}${queryString ? `?${queryString}` : ""}`;
  const responseType = isBinaryResponse(doc.path) ? "blob" : "json";

  if (method === "POST") {
    return [
      "const body = new FormData();",
      'body.append("file", fileInput.files[0]);',
      "",
      "const response = await fetch(",
      `  "${url}",`,
      "  {",
      '    method: "POST",',
      "    headers: {",
      `      Authorization: \`Bearer ${token}\``,
      "    },",
      "    body",
      "  }",
      ");",
      "",
      `const data = await response.${responseType}();`,
      "console.log(data);"
    ].join("\n");
  }

  return [
    "const response = await fetch(",
    `  "${url}",`,
    "  {",
    "    headers: {",
    `      Authorization: \`Bearer ${token}\``,
    "    }",
    "  }",
    ");",
    "",
    `const data = await response.${responseType}();`,
    "console.log(data);"
  ].join("\n");
}

function maskToken(token: string): string {
  return "*".repeat(Math.min(Math.max(token.length, 16), 32));
}

function subscribeToOrigin(): () => void {
  return () => undefined;
}

function getOriginSnapshot(): string {
  return window.location.origin;
}

function getServerOriginSnapshot(): string {
  return "";
}

function useBrowserOrigin(): string {
  return useSyncExternalStore(
    subscribeToOrigin,
    getOriginSnapshot,
    getServerOriginSnapshot
  );
}

function methodClass(method: string): string {
  if (method.includes("GET") && method.includes("POST")) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  if (method.includes("POST")) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-500">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0c0e] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/20"
      />
    </label>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-zinc-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((color) => {
          const selected = value.toLowerCase() === color;

          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`Selecionar cor ${color}`}
              aria-pressed={selected}
              className={`h-8 w-8 rounded-full border transition ${
                selected
                  ? "border-white ring-2 ring-white/70 ring-offset-2 ring-offset-[#151517]"
                  : "border-white/15 hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ApiDocView({ doc }: { doc: ApiDoc }) {
  const { user } = useAuth();
  const { apiKey } = useApiKey();
  const browserOrigin = useBrowserOrigin();
  const origin = process.env.NEXT_PUBLIC_API_URL || browserOrigin;
  const [revealedToken, setRevealedToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(doc.playground));
  const [previewError, setPreviewError] = useState(false);
  const autoPreview = useRef(false);

  const defaultUsername = user?.name?.trim() || user?.email?.split("@")[0] || "Orbit";
  const [values, setValues] = useState<PlaygroundValues>(() =>
    playgroundDefaults(doc.playground ?? "welcome", defaultUsername)
  );

  useEffect(() => {
    if (!doc.playground || autoPreview.current) return;

    autoPreview.current = true;
    const defaults = playgroundDefaults(doc.playground, defaultUsername);
    setPreviewError(false);
    setPreviewLoading(true);
    setPreviewSrc(buildPreviewUrl(doc.playground, defaults));
  }, [doc.playground, defaultUsername]);

  const stickerPreview = isStickerPlayground(doc.playground);
  const canGenerate = doc.playground
    ? isCanvasPlayground(doc.playground)
      ? Boolean(values.username.trim())
      : Boolean(values.text.trim())
    : false;
  const previewAspect = stickerPreview ? "aspect-square" : "aspect-[8/3]";
  const previewWidth = stickerPreview ? 512 : 800;
  const previewHeight = stickerPreview ? 512 : 300;

  const token = apiKey ?? "SUA_API_KEY";
  const tokenForDisplay = revealedToken || !apiKey ? token : maskToken(token);
  const exampleValues = doc.playground ? values : undefined;
  const code = buildExample(doc, origin, tokenForDisplay, exampleValues);
  const copyCode = buildExample(doc, origin, token, exampleValues);
  const fullPath = `${origin.replace(/\/+$/, "")}${doc.path}` || doc.path;

  function updateValue<K extends keyof PlaygroundValues>(
    field: K,
    value: PlaygroundValues[K]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function generatePreview() {
    if (!doc.playground || !canGenerate) return;

    setPreviewError(false);
    setPreviewLoading(true);
    setPreviewSrc(buildPreviewUrl(doc.playground, values));
  }

  function copyExample() {
    navigator.clipboard
      .writeText(copyCode)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <div className="space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 px-1 text-[13px] text-zinc-500"
      >
        <span>{doc.section}</span>
        <Icon name="chevron" className="h-3.5 w-3.5 text-zinc-600" />
        <span className="text-zinc-300">{doc.title}</span>
      </nav>

      <section className="rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-7">
        <header>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">{doc.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {doc.description}
          </p>
          <span className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-400">
            {doc.comingSoon ? "Em breve" : `Custo: ${doc.cost ?? "1 request"}`}
          </span>
        </header>

        {doc.comingSoon ? (
          <div className="mt-7 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-zinc-300">
              <Icon name="sparkles" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-200">
              Este recurso estará disponível em breve.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Enquanto isso, explore as APIs disponíveis na barra lateral.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-7">
              <h2 className="text-sm font-semibold text-zinc-200">Tipo de requisição:</h2>
              <span
                className={`mt-2 inline-flex rounded-md border px-2 py-1 font-mono text-[11px] font-semibold ${methodClass(doc.method)}`}
              >
                {doc.method}
              </span>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-200">URL:</h2>
              <div className="mt-2 rounded-lg border border-white/[0.07] bg-[#0c0c0e] px-3 py-2.5">
                <code className="break-all font-mono text-[13px] text-zinc-300">
                  {fullPath}
                </code>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-zinc-200">Parâmetros:</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Obrigatório?</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {doc.params.map((param) => (
                      <tr key={param.name}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-zinc-200">
                          {param.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {param.type}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {param.required ? "Sim" : "Não"}
                        </td>
                        <td className="px-4 py-3 leading-relaxed text-zinc-400">
                          {param.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {doc.playground && (
              <div className="mt-7">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Personalize e veja o resultado:
                </h2>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    generatePreview();
                  }}
                  className="mt-3"
                >
                  {isCanvasPlayground(doc.playground) ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nome de usuário"
                        value={values.username}
                        onChange={(event) => updateValue("username", event.target.value)}
                        placeholder="Fulano"
                        autoComplete="off"
                      />
                      <Field
                        label="Título"
                        value={values.title}
                        onChange={(event) => updateValue("title", event.target.value)}
                        placeholder="Bem-vindo!"
                        autoComplete="off"
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label="Subtítulo"
                          value={values.subtitle}
                          onChange={(event) => updateValue("subtitle", event.target.value)}
                          placeholder="Seja bem-vindo ao nosso grupo"
                          autoComplete="off"
                        />
                      </div>
                      <Field
                        label="Link do avatar"
                        value={values.avatarUrl}
                        onChange={(event) => updateValue("avatarUrl", event.target.value)}
                        placeholder="https://..."
                        autoComplete="off"
                      />
                      <Field
                        label="Link do fundo"
                        value={values.bgUrl}
                        onChange={(event) => updateValue("bgUrl", event.target.value)}
                        placeholder="https://..."
                        autoComplete="off"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Field
                        label="Texto"
                        value={values.text}
                        onChange={(event) => updateValue("text", event.target.value)}
                        placeholder="Nem judas mentiu tanto assim"
                        autoComplete="off"
                        maxLength={500}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <ColorPicker
                          label="Cor do fundo"
                          value={values.backgroundColor}
                          onChange={(color) => updateValue("backgroundColor", color)}
                        />
                        <ColorPicker
                          label="Cor do texto"
                          value={values.textColor}
                          onChange={(color) => updateValue("textColor", color)}
                        />
                      </div>
                      <div>
                        <span className="mb-2 block text-xs font-medium text-zinc-500">
                          Alinhamento
                        </span>
                        <div className="inline-flex gap-1 rounded-lg border border-white/[0.07] bg-[#0c0c0e] p-1">
                          {ALIGNMENTS.map((alignment) => (
                            <button
                              key={alignment.value}
                              type="button"
                              onClick={() => updateValue("position", alignment.value)}
                              aria-label={alignment.label}
                              aria-pressed={values.position === alignment.value}
                              title={alignment.label}
                              className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                                values.position === alignment.value
                                  ? "bg-violet-400/20 text-violet-100"
                                  : "text-zinc-500 hover:text-violet-200"
                              }`}
                            >
                              <Icon name={alignment.icon} className="h-4 w-4" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0c0e]">
                    <div className={`relative ${previewAspect}`}>
                      {previewSrc && (
                        <Image
                          key={previewSrc}
                          src={previewSrc}
                          alt={`Pré-visualização de ${doc.title.toLowerCase()}`}
                          width={previewWidth}
                          height={previewHeight}
                          unoptimized
                          draggable={false}
                          onLoad={() => setPreviewLoading(false)}
                          onError={() => {
                            setPreviewLoading(false);
                            setPreviewError(true);
                          }}
                          className="h-full w-full object-cover"
                        />
                      )}

                      {previewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0e]/90 text-sm text-zinc-400">
                          Gerando pré-visualização...
                        </div>
                      )}

                      {previewError && !previewLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#0c0c0e] px-6 text-center">
                          <span className="text-sm text-zinc-300">
                            Não foi possível gerar a pré-visualização.
                          </span>
                          <span className="text-xs text-zinc-500">
                            Verifique os dados e tente novamente.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={previewLoading || !canGenerate}
                      className="flex h-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-5 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {previewLoading ? "Gerando..." : "Gerar pré-visualização"}
                    </button>
                    <span className="text-xs text-zinc-500">
                      {doc.playground === "abrat" || doc.playground === "attp"
                        ? "GIF animado · "
                        : ""}
                      Prévia gratuita: não consome seus requests.
                    </span>
                  </div>
                </form>
              </div>
            )}

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Exemplo de requisição em JavaScript:
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRevealedToken((value) => !value)}
                    disabled={!apiKey}
                    aria-label={revealedToken ? "Ocultar token" : "Mostrar token"}
                    title={revealedToken ? "Ocultar token" : "Mostrar token"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-violet-400/10 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name={revealedToken ? "eyeOff" : "eye"} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={copyExample}
                    aria-label="Copiar exemplo"
                    title="Copiar exemplo"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-violet-400/10 ${
                      copied ? "text-emerald-400" : "text-zinc-400 hover:text-violet-200"
                    }`}
                  >
                    <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0c0c0e]">
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-zinc-300 sm:text-[13px]">
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
