import ErrorPage from "@components/errors/ErrorPage";

export default function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Página não encontrada"
      message="O endereço acessado não existe, foi movido ou não está mais disponível."
    />
  );
}
