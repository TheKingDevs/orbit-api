import { z } from 'zod';

export const DownloadSchema = z.object({
  url: z.string().url({ message: 'URL fornecida é inválida.' }),
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'pinterest'], {
    errorMap: () => ({ message: "Plataforma deve ser 'instagram', 'tiktok', 'youtube' ou 'pinterest'." })
  }),
  type: z.enum(['video', 'audio', 'image', 'gif', 'auto'], {
    errorMap: () => ({ message: "Tipo deve ser 'video', 'audio', 'image', 'gif' ou 'auto'." })
  })
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
