import { z } from 'zod';
import { validateSafeUrl } from '@utils/urlSecurity.util';

const safeCanvasUrl = (fieldName: string) =>
  z.string()
    .optional()
    .transform((val, ctx) => {
      if (!val || !val.trim()) return undefined;
      try {
        return validateSafeUrl(val, { fieldName });
      } catch (err: any) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err.message || `${fieldName} contém uma URL inválida ou não permitida.`
        });
        return val;
      }
    });

export const CanvasSchema = z.object({
  username: z.string().min(1, { message: 'Username é obrigatório.' }),
  avatarUrl: safeCanvasUrl('avatarUrl'),
  bgUrl: safeCanvasUrl('bgUrl'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  titulo: z.string().optional(),
  subtitulo: z.string().optional()
});

export type CanvasDTO = z.infer<typeof CanvasSchema>;
