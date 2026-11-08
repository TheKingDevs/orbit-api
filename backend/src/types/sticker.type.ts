import { z } from 'zod';
import { validateSafeUrl } from '@utils/urlSecurity.util';

export const STICKER_EFFECTS = [
  'invert',
  'blur',
  'mirror',
  'circle',
  'gray',
  'pixel',
  'upscale'
] as const;

export type StickerEffect = (typeof STICKER_EFFECTS)[number];
export type StickerFormat = 'png' | 'webp';
export type MirrorDirection = 'horizontal' | 'vertical' | 'both';

const EFFECT_ALIASES: Record<string, StickerEffect> = {
  invert: 'invert',
  inverter: 'invert',
  negate: 'invert',
  blur: 'blur',
  desfoque: 'blur',
  blurry: 'blur',
  mirror: 'mirror',
  espelhar: 'mirror',
  espelhado: 'mirror',
  flip: 'mirror',
  circle: 'circle',
  circulo: 'circle',
  round: 'circle',
  gray: 'gray',
  grey: 'gray',
  cinza: 'gray',
  grayscale: 'gray',
  pixel: 'pixel',
  pixelate: 'pixel',
  pixelado: 'pixel',
  pixelar: 'pixel',
  upscale: 'upscale',
  upscaling: 'upscale',
  ampliar: 'upscale',
  aumentar: 'upscale'
};

const EFFECT_FIELDS = ['effect', 'effects', 'efeito', 'efeitos', 'filtro', 'filtros', 'filter', 'filters'] as const;

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseEffects(value: unknown): { effects: StickerEffect[]; unknown: string[] } {
  const rawValues = Array.isArray(value) ? value : [value];
  const effects: StickerEffect[] = [];
  const unknown: string[] = [];

  for (const raw of rawValues) {
    if (typeof raw !== 'string') continue;

    for (const part of raw.split(/[\s,;|+]+/)) {
      const token = normalizeToken(part);

      if (!token) continue;

      const effect = EFFECT_ALIASES[token];

      if (!effect) {
        unknown.push(part);
        continue;
      }

      if (!effects.includes(effect)) {
        effects.push(effect);
      }
    }
  }

  return { effects, unknown };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDirection(value: unknown): MirrorDirection {
  if (typeof value !== 'string') return 'horizontal';

  const token = normalizeToken(value);

  if (token === 'vertical' || token === 'v' || token === 'vflip') return 'vertical';
  if (token === 'both' || token === 'ambos' || token === 'h+v' || token === 'hv') return 'both';
  return 'horizontal';
}

const EffectInput = z.union([z.string(), z.array(z.string())]).optional();
const FormatSchema = z.preprocess(
  value => (typeof value === 'string' ? normalizeToken(value) : value),
  z.enum(['png', 'webp'])
).optional();

export const StickerSchema = z
  .object({
    url: z.string().trim().min(1).max(4096).optional(),
    imageUrl: z.string().trim().min(1).max(4096).optional(),
    image_url: z.string().trim().min(1).max(4096).optional(),
    imagem: z.string().trim().min(1).max(4096).optional(),
    imagemUrl: z.string().trim().min(1).max(4096).optional(),
    link: z.string().trim().min(1).max(4096).optional(),
    src: z.string().trim().min(1).max(4096).optional(),
    effect: EffectInput,
    effects: EffectInput,
    efeito: EffectInput,
    efeitos: EffectInput,
    filtro: EffectInput,
    filtros: EffectInput,
    filter: EffectInput,
    filters: EffectInput,
    format: FormatSchema,
    formato: FormatSchema,
    tipo: FormatSchema,
    blurRadius: z.coerce.number().optional(),
    sigma: z.coerce.number().optional(),
    intensidade: z.coerce.number().optional(),
    pixelSize: z.coerce.number().optional(),
    blockSize: z.coerce.number().optional(),
    upscaleFactor: z.coerce.number().optional(),
    scale: z.coerce.number().optional(),
    escala: z.coerce.number().optional(),
    size: z.coerce.number().int().optional(),
    tamanho: z.coerce.number().int().optional(),
    mirrorDirection: z.string().optional(),
    direction: z.string().optional(),
    direcao: z.string().optional()
  })
  .transform((data, ctx) => {
    const rawEffects = EFFECT_FIELDS.flatMap(field => {
      const value = data[field];

      if (Array.isArray(value)) return value;
      return value === undefined ? [] : [value];
    });
    const { effects, unknown } = parseEffects(rawEffects);

    for (const value of unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effect'],
        message: `Efeito desconhecido: ${value}. Use invert, blur, espelhar, circle, gray, pixel ou upscale.`
      });
    }

    const rawSize = data.size ?? data.tamanho;
    const rawUrl = data.url ?? data.imageUrl ?? data.image_url ?? data.imagem ?? data.imagemUrl ?? data.link ?? data.src;
    let validatedUrl: string | undefined = rawUrl;

    if (typeof rawUrl === 'string' && rawUrl.trim() && !rawUrl.startsWith('data:')) {
      try {
        validatedUrl = validateSafeUrl(rawUrl, { fieldName: 'url' });
      } catch (err: any) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: err.message || 'URL inválida ou não permitida.'
        });
      }
    }

    return {
      effects,
      url: validatedUrl,
      format: data.format ?? data.formato ?? data.tipo,
      blurRadius: clamp(data.blurRadius ?? data.sigma ?? data.intensidade ?? 8, 0.1, 50),
      pixelSize: clamp(Math.round(data.pixelSize ?? data.blockSize ?? 16), 2, 128),
      upscaleFactor: clamp(data.upscaleFactor ?? data.scale ?? data.escala ?? 2, 1.1, 4),
      size: rawSize !== undefined ? clamp(Math.round(rawSize), 16, 2048) : undefined,
      mirrorDirection: parseDirection(data.mirrorDirection ?? data.direction ?? data.direcao)
    };
  });

export type StickerDTO = z.infer<typeof StickerSchema>;
