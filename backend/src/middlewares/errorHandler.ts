import { AppError, InvalidParameterError } from '@errors/index';
import { Logger } from '@utils/logger';

function sanitizeErrorMessage(message: string): string {
  if (!message) return 'Ocorreu uma falha no serviço.';
  if (/devworld/i.test(message)) {
    return 'Ocorreu uma falha no serviço.';
  }
  return message;
}

export function handleRouteError(error: unknown, path: string = ''): Response {
  if (error instanceof InvalidParameterError) {
    Logger.warning(`Parâmetros inválidos em ${path}: ${error.message}`, 'InvalidParameterError');
    return Response.json(
      {
        success: false,
        errorType: error.errorType,
        message: sanitizeErrorMessage(error.message),
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    Logger.warning(`Erro ${error.statusCode}, Página "${path}" - ${error.message}`, error.errorType);
    return Response.json(
      {
        success: false,
        errorType: error.errorType,
        message: sanitizeErrorMessage(error.message)
      },
      { status: error.statusCode }
    );
  }

  Logger.error(`Erro interno em ${path}: ${String(error)}`, 'DangerError');
  return Response.json(
    {
      success: false,
      errorType: 'DangerError',
      message: 'Erro interno inesperado no servidor.'
    },
    { status: 500 }
  );
}
