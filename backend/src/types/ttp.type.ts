import { z } from 'zod';
import { ColorUtil } from '@utils/color.util';

const PositionSchema = z
  .preprocess(
    value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['left', 'center', 'right'])
  )
  .optional();

const EffectSchema = z
  .preprocess(
    value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['pulse', 'wave', 'typing', 'rainbow', 'glow', 'zoomin'])
  )
  .optional();

const ColorSchema = z.string().trim().min(1).max(48).optional();

export const TtpSchema = z
  .object({
    text: z.string().max(500).optional(),
    texto: z.string().max(500).optional(),
    textColor: ColorSchema,
    corTexto: ColorSchema,
    color: ColorSchema,
    backgroundColor: ColorSchema,
    background: ColorSchema,
    bgColor: ColorSchema,
    corFundo: ColorSchema,
    position: PositionSchema,
    posicao: PositionSchema,
    local: PositionSchema,
    align: PositionSchema,
    alignment: PositionSchema,
    textAlign: PositionSchema,
    fontSize: z.coerce.number().int().min(16).max(120).optional(),
    effect: EffectSchema,
    efeito: EffectSchema,
    duration: z.coerce.number().min(1).max(8).optional(),
    durationSeconds: z.coerce.number().min(1).max(8).optional(),
    fps: z.coerce.number().int().min(5).max(20).optional()
  })
  .transform(data => ({
    text: data.text ?? data.texto ?? '',
    textColor: data.textColor ?? data.corTexto ?? data.color ?? '#ffffff',
    backgroundColor: data.backgroundColor ?? data.background ?? data.bgColor ?? data.corFundo ?? '#0f172a',
    position: data.position ?? data.posicao ?? data.local ?? data.align ?? data.alignment ?? data.textAlign ?? 'center',
    fontSize: data.fontSize,
    effect: data.effect ?? data.efeito ?? 'pulse',
    duration: data.duration ?? data.durationSeconds ?? 3,
    fps: data.fps ?? 12
  }))
  .superRefine((data, ctx) => {
    if (!data.text.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['text'],
        message: 'O texto é obrigatório.'
      });
    }

    if (!ColorUtil.isValid(data.textColor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['textColor'],
        message: 'Cor do texto inválida.'
      });
    }

    if (!ColorUtil.isValid(data.backgroundColor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['backgroundColor'],
        message: 'Cor de fundo inválida.'
      });
    }
  });

export type TtpDTO = z.infer<typeof TtpSchema>;
