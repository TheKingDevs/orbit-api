import { z } from 'zod';

const LanguageSchema = z.preprocess(
  value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['auto', 'pt', 'en'])
);

const SummaryOptionsSchema = z.object({
  language: LanguageSchema.optional(),
  idioma: LanguageSchema.optional(),
  lang: LanguageSchema.optional(),
  style: z.preprocess(
    value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['paragraph', 'bullets']).optional()
  ),
  length: z.preprocess(
    value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['short', 'medium', 'detailed']).optional()
  )
});

export const OcrSchema = z.object({
  language: LanguageSchema.optional(),
  idioma: LanguageSchema.optional(),
  lang: LanguageSchema.optional()
}).transform(data => ({
  language: data.language ?? data.idioma ?? data.lang ?? 'auto'
}));

export const SummarizeSchema = SummaryOptionsSchema.extend({
  text: z.string().trim().min(1, 'O texto é obrigatório.').max(10_000, 'O texto pode ter no máximo 10.000 caracteres.')
}).transform(data => ({
  text: data.text,
  language: data.language ?? data.idioma ?? data.lang ?? 'auto',
  style: data.style ?? 'paragraph',
  length: data.length ?? 'medium'
}));

export const AudioSummarizeOptionsSchema = SummaryOptionsSchema.transform(data => ({
  language: data.language ?? data.idioma ?? data.lang ?? 'auto',
  style: data.style ?? 'paragraph',
  length: data.length ?? 'medium'
}));

export type OcrDTO = z.infer<typeof OcrSchema>;
export type SummarizeDTO = z.infer<typeof SummarizeSchema>;
export type AudioSummarizeOptionsDTO = z.infer<typeof AudioSummarizeOptionsSchema>;
