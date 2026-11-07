export interface ErrorCopy {
  title: string;
  message: string;
}

const ERROR_COPY: Record<number, ErrorCopy> = {
  400: {
    title: "Requisição inválida",
    message:
      "Os dados enviados não puderam ser processados. Verifique as informações e tente novamente."
  },
  401: {
    title: "Acesso não autorizado",
    message: "Entre na sua conta para acessar este recurso."
  },
  403: {
    title: "Acesso negado",
    message: "Você não tem permissão para acessar este recurso."
  },
  404: {
    title: "Página não encontrada",
    message:
      "O endereço acessado não existe, foi movido ou não está mais disponível."
  },
  405: {
    title: "Método não permitido",
    message: "Esta ação não está disponível para este endereço."
  },
  408: {
    title: "Tempo esgotado",
    message: "A solicitação demorou mais que o esperado. Tente novamente."
  },
  409: {
    title: "Conflito na solicitação",
    message:
      "Não foi possível concluir a ação porque o recurso já foi alterado. Tente novamente."
  },
  410: {
    title: "Conteúdo indisponível",
    message: "O conteúdo acessado não está mais disponível."
  },
  413: {
    title: "Conteúdo muito grande",
    message: "O arquivo ou conteúdo enviado excede o tamanho permitido."
  },
  415: {
    title: "Formato não suportado",
    message: "O formato enviado não é suportado por esta operação."
  },
  422: {
    title: "Dados inválidos",
    message:
      "Não foi possível validar as informações enviadas. Revise os dados e tente novamente."
  },
  429: {
    title: "Muitas requisições",
    message: "Aguarde alguns instantes antes de tentar novamente."
  },
  500: {
    title: "Algo deu errado",
    message:
      "Não foi possível concluir esta ação. Tente novamente em instantes."
  },
  501: {
    title: "Recurso não implementado",
    message: "Este recurso ainda não está disponível."
  },
  502: {
    title: "Serviço temporariamente indisponível",
    message:
      "Estamos com uma instabilidade temporária. Tente novamente em instantes."
  },
  503: {
    title: "Serviço temporariamente indisponível",
    message:
      "Estamos com uma instabilidade temporária. Tente novamente em instantes."
  },
  504: {
    title: "Serviço temporariamente indisponível",
    message:
      "Estamos com uma instabilidade temporária. Tente novamente em instantes."
  }
};

export function normalizeErrorCode(value: string | number | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed >= 400 && parsed <= 599
    ? parsed
    : 500;
}

export function getErrorCopy(code: number): ErrorCopy {
  const normalized = normalizeErrorCode(code);
  const copy = ERROR_COPY[normalized];

  if (copy) return copy;

  if (normalized >= 500) return ERROR_COPY[500];

  return {
    title: "Não foi possível concluir",
    message:
      "A solicitação não pôde ser processada. Verifique os dados e tente novamente."
  };
}
