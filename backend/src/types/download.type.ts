import { z } from 'zod';
import { validateSafeUrl, TrustedPlatform } from '@utils/urlSecurity.util';

const sanitizeUrl = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const match = trimmed.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : trimmed;
  }
  return val;
};

export const DownloadSchema = z.object({
  url: z.preprocess(sanitizeUrl, z.string().optional()),
  name: z.string().min(1, { message: 'Nome da música não pode ficar vazio.' }).optional(),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'pinterest'], {
    error: "Plataforma inválida."
  }).optional().default('youtube'),
  type: z.enum(['video', 'audio', 'image', 'gif', 'auto'], {
    error: "Tipo deve ser 'video', 'audio', 'image', 'gif' ou 'auto'."
  })
}).refine(data => data.url || data.name, {
  message: 'Informe a URL ou o nome da música.',
  path: ['url']
}).transform((data, ctx) => {
  if (data.url) {
    try {
      const validated = validateSafeUrl(data.url, {
        platform: data.platform as TrustedPlatform,
        fieldName: 'url'
      });
      return { ...data, url: validated };
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: err.message || 'URL não permitida.'
      });
    }
  }
  return data;
});

export type DownloadRequestDTO = z.infer<typeof DownloadSchema>;

export type BtchDownloadPlatform = 'spotify' | 'threads' | 'google-drive' | 'capcut' | 'twitter';

export interface DownloadContext {
  baseUrl?: string;
}

export interface DownloadResponseDTO {
  success: boolean;
  message: string;
  mediaType?: 'video' | 'audio' | 'image' | 'gif';
  downloadUrl?: string;
  thumbnail?: string;
  metadata?: {
    title?: string;
    duration?: number;
    author?: string;
    thumbnail?: string;
  };
}
