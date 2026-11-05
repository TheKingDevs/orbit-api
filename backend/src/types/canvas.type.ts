import { z } from 'zod';

export const CanvasSchema = z.object({
  username: z.string().min(1, { message: 'Username é obrigatório.' }),
  avatarUrl: z.string().url({ message: 'avatarUrl deve ser uma URL válida.' }).optional(),
  bgUrl: z.string().url({ message: 'bgUrl deve ser uma URL válida.' }).optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titulo: z.string().optional(),
  subtitulo: z.string().optional()
});

export type CanvasDTO = z.infer<typeof CanvasSchema>;
