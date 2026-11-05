import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado ou limite excedido.') {
    super(message, 403, 'ForbiddenError');
  }
}
