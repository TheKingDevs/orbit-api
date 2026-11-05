import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Token de acesso inválido ou não fornecido.') {
    super(message, 401, 'UnauthorizedError');
  }
}
