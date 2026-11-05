import type { Metadata } from "next";
import LandingContentLayout from "@components/landing/LandingContentLayout";
import { Icon } from "@components/dashboard/icons";

export const metadata: Metadata = {
  title: "Perguntas frequentes — Orbit API",
  description: "Respostas sobre planos, autenticação e integração da Orbit API."
};

const FAQ = [
  {
    question: "Preciso pagar para usar a Orbit API?",
    answer:
      "Não. O plano Free permite 100 requisições por dia. Os planos Basic e Gold ampliam os limites para quem precisa de mais volume."
  },
  {
    question: "Como envio minha API Key?",
    answer:
      "Envie o header Authorization com o valor Bearer SUA_API_KEY. Também é possível usar o parâmetro token na URL para testes rápidos."
  },
  {
    question: "Quais serviços estão disponíveis hoje?",
    answer:
      "Downloads de Instagram, Pinterest, TikTok e Play, transcrição de áudio, Canvas, stickers TTP, ATTP, Brat e Abrat, além da conversão para GIF."
  },
  {
    question: "A documentação tem exemplos prontos?",
    answer:
      "Sim. Cada endpoint possui tabela de parâmetros, exemplo em JavaScript e um playground para testar o resultado antes de integrar."
  },
  {
    question: "Consigo usar em qualquer bot ou automação?",
    answer:
      "Sim. Basta que a aplicação consiga fazer requisições HTTP. A Orbit API funciona com WhatsApp, Telegram, Discord e projetos próprios."
  }
];

export default function FaqPage() {
  return (
    <LandingContentLayout title="Perguntas frequentes">
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">
        Não encontrou o que procurava? Fale com a gente pelo grupo de suporte.
      </p>

      <div className="mt-10 divide-y divide-white/[0.1] border-y border-white/[0.1]">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-base font-medium text-zinc-200 marker:content-none">
              {item.question}
              <Icon
                name="chevronDown"
                className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180"
              />
            </summary>
            <p className="max-w-3xl pt-3 text-sm leading-relaxed text-zinc-400">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </LandingContentLayout>
  );
}
