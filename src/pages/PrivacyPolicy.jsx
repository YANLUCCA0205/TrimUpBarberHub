import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Dados que Coletamos",
      content: (
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Nome completo</li>
          <li>Endereço de e-mail</li>
          <li>Número de telefone</li>
          <li>CPF (para barbeiros e donos de barbearia)</li>
          <li>CNPJ (para barbearias)</li>
          <li>Endereço</li>
          <li>Histórico de agendamentos</li>
        </ul>
      ),
    },
    {
      title: "2. Finalidade do Tratamento",
      content: (
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Identificação e autenticação do usuário na plataforma</li>
          <li>Prevenção de duplicidade de cadastro e fraude</li>
          <li>Gestão e organização de agendamentos</li>
          <li>Comunicação sobre serviços, promoções e atualizações</li>
        </ul>
      ),
    },
    {
      title: "3. Armazenamento e Segurança",
      content: (
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>CPF e CNPJ são armazenados em formato hash (SHA-256), garantindo que o dado original não possa ser recuperado</li>
          <li>Apenas os últimos 4 dígitos ficam visíveis para fins de identificação</li>
          <li>Todos os dados são protegidos por criptografia em trânsito e em repouso</li>
          <li>Acesso restrito a dados sensíveis apenas por sistemas autorizados</li>
        </ul>
      ),
    },
    {
      title: "4. Seus Direitos (LGPD Art. 18)",
      content: (
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Acesso aos seus dados pessoais armazenados</li>
          <li>Correção de dados incompletos ou desatualizados</li>
          <li>Exclusão dos seus dados pessoais</li>
          <li>Portabilidade dos dados a outro fornecedor</li>
          <li>Revogação do consentimento a qualquer momento</li>
        </ul>
      ),
    },
    {
      title: "5. Compartilhamento de Dados",
      content: (
        <p className="text-muted-foreground">
          Seus dados <strong className="text-foreground">NÃO</strong> são compartilhados com terceiros.
          O compartilhamento de informações ocorre exclusivamente dentro da plataforma, entre a barbearia
          e o cliente, para viabilizar a prestação dos serviços contratados.
        </p>
      ),
    },
    {
      title: "6. Contato do Encarregado (DPO)",
      content: (
        <p className="text-muted-foreground">
          Em caso de dúvidas sobre o tratamento dos seus dados pessoais ou para exercer seus direitos,
          entre em contato com nosso Encarregado de Proteção de Dados pelo e-mail:{" "}
          <a href="mailto:suporte@trimup.com" className="text-primary hover:underline font-medium">
            suporte@trimup.com
          </a>
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground">
            TrimUp Barber Hub — Última atualização: Junho 2025
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <section
              key={index}
              className="bg-card border border-border/50 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              {section.content}
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TrimUp Barber Hub. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
