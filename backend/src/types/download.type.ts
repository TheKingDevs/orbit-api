import { z } from 'zod';

export const DownloadSchema = z.object({
  url: z.string().url({ message: 'URL fornecida é inválida.' }).optional(),
  name: z.string().min(1, { message: 'Nome da música não pode ficar vazio.' }).optional(),
  platform: z.enum(['youtube'], {
    error: "Plataforma deve ser 'youtube'."
  }).optional().default('youtube'),
  type: z.enum(['video', 'audio', 'image', 'gif', 'auto'], {
    error: "Tipo deve ser 'video', 'audio', 'image', 'gif' ou 'auto'."
  })
}).refine(data => data.url || data.name, {
  message: 'Informe a URL ou o nome da música.',
  path: ['url']
});

export type DownloadRequestDTO = z.infer<typeof DownloadSchema>;

export interface DownloadContext {
  baseUrl?: string;
}

export interface DownloadResponseDTO {
  success: boolean;
  message: string;
  mediaType?: 'video' | 'audio' | 'image' | 'gif';
  downloadUrl?: string;
  metadata?: {
    title?: string;
    duration?: number;
    author?: string;
  };
}
