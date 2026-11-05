import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email({ message: 'E-mail fornecido é inválido.' }),
  plan: z.enum(['free', 'basic', 'gold']).default('free'),
  role: z.enum(['owner', 'admin', 'public']).default('public')
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
