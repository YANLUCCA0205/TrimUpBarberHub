# TrimUp BarberHub — Plataforma de Agendamento e Gestão para Barbearias

Bem-vindo ao **TrimUp BarberHub**, uma plataforma SaaS premium e multilocatária (multi-tenant) voltada para o gerenciamento completo de barbearias e agendamento inteligente de serviços de estética masculina.

Este repositório contém todo o código frontend e a modelagem do banco de dados necessária para executar a aplicação localmente ou publicá-la.

---

## 1. Como Executar o Projeto Localmente

### Prerrequisitos
1. Certifique-se de ter o **Node.js** instalado (versão 18 ou superior recomendada).
2. Clone este repositório para o seu ambiente local.

### Passos para Configuração
1. Navegue até o diretório do projeto e instale as dependências:
   ```bash
   npm install
   ```
2. Crie um arquivo chamado `.env` ou `.env.local` na raiz do projeto e configure as variáveis de ambiente do Supabase:
   ```env
   VITE_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key-publica-do-supabase
   ```
3. Execute o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```
4. Abra o navegador no endereço indicado (geralmente `http://localhost:5173`).

---

## 2. Visão Geral do Sistema e Perfis de Usuário

O sistema conecta de forma integrada quatro perfis fundamentais de usuários:

- **Clientes (USER)**:
  - Exploram barbearias parceiras no marketplace.
  - Realizam agendamentos com checkout em tempo real.
  - Acompanham histórico de atendimentos e gerenciam seu perfil (incluindo progresso de perfil completo).
- **Barbeiros (BARBER)**:
  - Gerenciam sua agenda individual de atendimentos diários.
  - Acompanham gráficos de faturamento semanal de cortes finalizados.
  - Utilizam o CRM interno para agendar presencialmente clientes novos ou recorrentes com autocomplete inteligente.
- **Administradores (ADMIN / Dono da Barbearia)**:
  - Controlam as configurações do estabelecimento (banners, logo, cores da marca e horários).
  - Gerenciam a equipe de barbeiros, aceitando solicitações de vínculo ou desligamento.
  - Cadastram e gerenciam produtos e serviços (preço, categoria, tempo e estoque).
  - Acompanham o faturamento geral do estabelecimento e relatórios financeiros.
- **SiteOwner (SaaS Administrator)**:
  - Gerencia planos de assinatura da plataforma com limites parametrizáveis de barbeiros e clientes.
  - Acompanha faturamento global das assinaturas da plataforma.
  - Utiliza o Simulador de Papéis para testar o sistema como cliente, barbeiro ou administrador a partir de um único login.

---

## 3. Regras de Negócio e Casos de Uso

### 3.1. Restrições e Hierarquia de Papéis
- **Exclusividade**: Para evitar conflitos de interesse, donos de barbearias (`admin`) não podem ser barbeiros de outro estabelecimento. Barbeiros vinculados a uma barbearia também não podem criar outra loja na mesma conta.
- **Login Inteligente (`SmartHome`)**: Ao fazer login, o sistema analisa os papéis do usuário e redireciona automaticamente para a área de maior responsabilidade (`siteowner` -> `/siteowner`, `admin` -> `/admin`, `barber` -> `/barber-dashboard`, `user` -> `/dashboard`).

### 3.2. Controle de Conflitos e Duplicidade
- **Bloqueio de Agenda**: O sistema impede o agendamento de múltiplos serviços no mesmo horário para o mesmo barbeiro, considerando apenas agendamentos com status ativo (`agendado`, `confirmado` ou `em_andamento`).
- **Cadastro Unificado de CPF**: Contas profissionais (`barber`, `admin`, `siteowner`) são obrigadas a registrar e validar o CPF (armazenado de forma segura em hash criptográfico SHA-256 em conformidade com a LGPD) impedindo que uma mesma pessoa física crie múltiplas contas.

### 3.3. Validação e Persistência de Sessão
- A sessão de login do Supabase permanece salva no `localStorage` do navegador. 
- O sistema executa verificações de integridade ativas com o servidor (chamadas de `getUser()`) de forma periódica (a cada 2 minutos), no carregamento inicial e sempre que a aba do navegador ganha foco. Em caso de token expirado ou inválido, o usuário é deslogado de forma limpa e imediata.

---

## 4. Estrutura de Pastas e Arquivos Principais

```
TrimUpBarberHub/
├── schema.sql                   # Blueprint do banco de dados (PostgreSQL, Triggers, RLS)
├── README.md                    # Esta documentação do projeto
├── eslint.config.js             # Regras do Linter
├── tailwind.config.js           # Tokens e paleta de cores do Design System
├── src/
│   ├── App.jsx                  # Roteamento e SmartHome do sistema
│   ├── components/              # Componentes React reutilizáveis e layouts
│   │   ├── Layout.jsx           # Painel de clientes e menu lateral
│   │   ├── AdminLayout.jsx      # Painel administrativo da loja (Admin)
│   │   ├── SiteOwnerLayout.jsx  # Painel de controle do SaaS (SiteOwner)
│   │   ├── RegistrationModal.jsx# Modal de preenchimento obrigatório de dados
│   │   └── ImageUpload.jsx      # Componente com corte e edição de fotos (Canvas)
│   ├── pages/                   # Telas principais da aplicação
│   │   ├── Profile.jsx          # Tela de Perfil e Autocadastro de Barbeiro
│   │   ├── Booking.jsx          # Roteiro de agendamento online do cliente
│   │   ├── BarberDashboard.jsx  # Agenda, CRM e rendimento do profissional
│   │   ├── admin/               # Telas administrativas (Agenda, Clientes, Produtos)
│   │   └── siteowner/           # Telas do SaaS (Planos de Assinatura, Simulador)
│   ├── hooks/                   # Custom Hooks (Querys e Mutations customizados)
│   ├── lib/                     # Inicialização de bibliotecas (Supabase, AuthContext, db)
│   └── utils/                   # Utilitários (Formatadores de CEP, Estados Brasileiros)
```

---

## 5. Tecnologias Utilizadas

- **Frontend**: React 18, Vite (bundler), JavaScript ES6.
- **Roteamento**: React Router DOM v6.
- **Estado e Caching**: TanStack React Query v5.
- **Estilização**: Tailwind CSS com classes de design escuro premium e CSS puro.
- **Iconografia**: Lucide React.
- **Banco de Dados e Backend**: Supabase (PostgreSQL, Row Level Security, Triggers e Storage Buckets).
- **Animações**: Framer Motion (Transições e animações baseadas em mola física).
- **Componentes Avançados**: Canvas (crop de imagens), Recharts (relatórios estatísticos), Sonner (avisos toast).
