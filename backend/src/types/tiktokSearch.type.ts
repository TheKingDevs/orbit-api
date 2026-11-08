import { z } from "zod";

export const tiktokSearchQuerySchema = z.object({
  text: z.string().min(1, "O parâmetro 'text' não pode estar vazio."),
  apikey: z.string().min(1, "A API Key de autenticação é obrigatória.")
});

export type TikTokSearchQueryDTO = z.infer<typeof tiktokSearchQuerySchema>;
