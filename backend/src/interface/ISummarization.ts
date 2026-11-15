import type { SummarizeOptions } from '@apptypes/ai.type';

export interface ISummarizationService {
  summarize(text: string, options: SummarizeOptions, sourceLanguage?: string): Promise<string>;
}
