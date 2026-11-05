import { z } from 'zod';

export type TranscribeLanguage = 'auto' | 'pt' | 'en';

const LanguageSchema = z.preprocess(
  value => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['auto', 'pt', 'en'])
);

export const TranscribeSchema = z
  .object({
    language: LanguageSchema.optional(),
    idioma: LanguageSchema.optional(),
    lang: LanguageSchema.optional()
  })
  .transform(data => ({
    language: data.language ?? data.idioma ?? data.lang ?? 'auto'
  }));

export type TranscribeDTO = z.infer<typeof TranscribeSchema>;

export interface TranscriptionResult {
  text: string;
  language: string;
  requestedLanguage: TranscribeLanguage;
  duration: number;
}
