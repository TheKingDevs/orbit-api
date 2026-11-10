import { AppError, InvalidParameterError } from '@errors/index';
import { Logger } from '@utils/logger';

function sanitizeErrorMessage(message: string): string {
  if (!message) return 'Ocorreu uma falha no serviço.';
  if (/devworld/i.test(message)) {
    return 'Ocorreu uma falha no serviço.';
  }
  return message;
}

function publicErrorMessage(error: AppError): string {
  if (error.statusCode >= 500) {
    return 'Ocorreu um erro temporário no serviço. Tente novamente mais tarde.';
  }
  return sanitizeErrorMessage(error.message);
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
    if (error.statusCode !== 429) {
      Logger.warning(`Erro ${error.statusCode}, Página "${path}" - ${error.message}`, error.errorType);
    }
    const headers = error.statusCode === 429 && 'retryAfterSeconds' in error
      ? { 'Retry-After': String(error.retryAfterSeconds) }
      : undefined;
    return Response.json(
      {
        success: false,
        errorType: error.errorType,
        message: publicErrorMessage(error)
      },
      { status: error.statusCode, headers }
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
