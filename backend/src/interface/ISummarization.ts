import type { SummarizeOptions } from '@types/ai.type';

export interface ISummarizationService {
  summarize(text: string, options: SummarizeOptions, sourceLanguage?: string): Promise<string>;
}
