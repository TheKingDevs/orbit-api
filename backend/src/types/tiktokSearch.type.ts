import { z } from "zod";

export const tiktokSearchQuerySchema = z.object({
  text: z.string().min(1, "O parâmetro 'text' não pode estar vazio."),
  token: z.string().min(1, "O token de autenticação é obrigatório.")
});

export type TikTokSearchQueryDTO = z.infer<typeof tiktokSearchQuerySchema>;
