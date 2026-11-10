import { AppError } from './AppError';

export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas requisições. Aguarde um pouco e tente novamente.', public readonly retryAfterSeconds: number = 60) {
    super(message, 429, 'RateLimitError');
  }
}
