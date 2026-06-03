# Documentação Técnica do Projeto — TrimUp BarberHub

Esta documentação fornece uma visão geral técnica e funcional do sistema **TrimUp BarberHub**, mapeando a arquitetura do código-fonte, modelos de dados, fluxos de uso, regras de negócio e rotas da plataforma.

---

## 1. Visão Geral do Projeto

O **TrimUp BarberHub** é uma plataforma SaaS multilocatária (multi-tenant) voltada para o gerenciamento de barbearias e agendamento de serviços de estética masculina. O sistema conecta três perfis fundamentais de usuários:
- **Clientes**: Exploram barbearias parceiras no marketplace, realizam agendamentos, compram produtos e acompanham seu histórico.
- **Barbeiros**: Gerenciam suas agendas individuais, consultam seus rendimentos e adicionam agendamentos internos para clientes presenciais (função CRM).
- **Administradores (Donos de Barbearias)**: Controlam as configurações da barbearia (logo, banner, horários), cadastram serviços/produtos, gerenciam a equipe de barbeiros e analisam métricas financeiras.
- **SiteOwner (Administrador Geral do SaaS)**: Controla a plataforma globalmente, gerenciando planos, assinaturas, faturamento de barbearias e simulando papéis de teste.

---

## 2. Funcionalidades Implementadas

### 2.1. Central de Agendamentos (Marketplace e Checkout)
- **Seleção de Barbearias**: Listagem interativa com filtros de busca.
- **Checkout de Agendamento**: Fluxo que permite escolher o profissional, o dia/horário disponível e o serviço desejado.
- **Histórico de Agendamentos**: Visualização do status dos cortes realizados ou marcados pelo cliente.

### 2.2. Painel e Agenda do Barbeiro
- **Visualização de Agenda**: Painel mostrando a agenda diária do profissional ordenada por horário.
- **Gráfico de Faturamento**: Gráfico de área semanal gerado a partir de faturamento real de atendimentos concluídos.
- **CRM Interno / Novo Agendamento**: Modal interno de agendamento que possibilita consultar clientes cadastrados na barbearia e registrar novos de forma manual com validação de duplicidade.

### 2.3. Painel Administrativo (Loja)
- **Gestão de Equipe**: Controle de solicitações de vínculo e desligamento de barbeiros.
- **Gestão de Produtos e Serviços**: Cadastro, edição e controle de preços, categorias e estoques.
- **Configurações da Barbearia**: Alteração de dados, horários de funcionamento, upload de logo e banner.

### 2.4. Painel Administrativo Geral (SaaS - SiteOwner)
- **Gestão de Planos**: Cadastro de planos com controle de preço mensal/anual, descontos, dias de teste e limites de barbeiros/clientes.
- **Simulador de Testes**: Painel que permite ao SiteOwner emular qualquer papel de usuário (`admin`, `barber`, `client`) para realizar auditorias ou demonstrações sem precisar trocar de conta.

### 2.5. Notificações em Tempo Real
- Central de notificações reativa vinculada ao banco de dados Supabase que atualiza automaticamente e exibe alertas de novos agendamentos, cancelamentos, lembretes e aprovação de vínculos no cabeçalho/sidebar.

### 2.6. Upload de Imagem Inteligente (Canvas Cropper)
- Componente universal de upload que permite recortar, dar zoom e reposicionar imagens usando o mouse ou gestos de toque antes de enviá-las ao Supabase Storage. Reduz o tamanho e padroniza as fotos em 500x500 (perfil/logos) e 1200x400 (banners).

---

## 3. Casos de Uso Principais

### 3.1. Agendamento Online pelo Cliente
1. O cliente entra na rota `/explore` e seleciona uma barbearia.
2. Inicia o agendamento em `/booking`, escolhendo o barbeiro, o serviço e um horário disponível.
3. Confirma o agendamento. O sistema insere o registro na tabela `appointments`, gera uma notificação para o barbeiro e atualiza a agenda.

### 3.2. Agendamento Presencial pelo Barbeiro (CRM)
1. No [BarberDashboard.jsx](file:///d:/Coding/Projects/TrimUpBarberHub/src/pages/BarberDashboard.jsx), o barbeiro clica em **"Novo Agendamento"**.
2. Digita o nome/e-mail do cliente. Se o cliente já possuir cadastro na barbearia, ele é sugerido pelo autocomplete.
3. Se o cliente for novo, o barbeiro alterna para "Cadastrar Novo" e preenche os dados. O sistema valida se há duplicidade antes de inserir na tabela `client_records`.
4. O barbeiro seleciona o serviço da lista, define a data/hora e confirma.

### 3.3. Configuração de Perfil com Recorte de Foto
1. O usuário acessa a aba "Meus dados" na página [Profile.jsx](file:///d:/Coding/Projects/TrimUpBarberHub/src/pages/Profile.jsx) e clica em **"Editar"**.
2. Clica na imagem de avatar. O cropper é exibido.
3. O usuário arrasta a foto para centralizar o rosto, define o zoom desejado e clica em **"Cortar e Salvar"**.
4. O canvas processa a imagem como JPEG, envia ao Supabase Storage sob a pasta `{user_id}/{filename}` e atualiza o estado visual instantaneamente.

---

## 4. Regras de Negócio do Sistema

### 4.1. Exclusividade e Hierarquia de Papéis
- **Exclusividade**: Donos de barbearia (administradores) não podem se cadastrar como barbeiros de outra empresa para evitar concorrência desleal ou vazamento de dados. Da mesma forma, barbeiros vinculados a uma loja não podem criar outra barbearia no mesmo login.
- **Hierarquia no Login (`SmartHome`)**: Ao acessar a home `/`, o sistema analisa as roles do usuário e redireciona para a maior hierarquia:
  1. `siteowner` -> Redireciona para `/siteowner`
  2. `admin` -> Redireciona para `/admin`
  3. `barber` -> Redireciona para `/barber-dashboard`
  4. Outro/Cliente -> Redireciona para `/dashboard`

### 4.2. Conflito de Agendamentos
- O sistema impede agendamentos simultâneos para o mesmo barbeiro na mesma data e hora. A validação verifica conflitos em registros que não estejam com status `"cancelado"` ou `"faltou"`.

### 4.3. Restrições RLS (Row Level Security) no Banco
- **Fichas de Clientes**: Clientes comuns só podem editar seu próprio registro pessoal. Administradores e barbeiros vinculados à barbearia têm autoridade para visualizar e cadastrar clientes no CRM (`client_records`).
- **Planos**: Apenas usuários com a role `siteowner` têm autoridade de CRUD na tabela `plans`.

---

## 5. Estrutura de Pastas e Arquivos Principais

```
TrimUpBarberHub/
├── schema.sql                   # Blueprint mestre do banco de dados (tabelas, triggers e RLS)
├── DOCS.md                      # Documentação técnica do projeto
├── src/
│   ├── App.jsx                  # Mapeamento de rotas e SmartHome
│   ├── components/              # Componentes comuns e layouts
│   │   ├── Layout.jsx           # Sidebar de navegação de clientes e barbeiros
│   │   ├── AdminLayout.jsx      # Layout do painel da Barbearia (Admin)
│   │   ├── SiteOwnerLayout.jsx  # Layout do painel do SaaS (SiteOwner)
│   │   ├── ImageUpload.jsx      # Editor Cropper + upload de imagem
│   │   └── NotificationBell.jsx # Sino de notificações reativo
│   ├── pages/                   # Telas principais da aplicação
│   │   ├── Profile.jsx          # Perfil, gerenciamento de dados e vínculo
│   │   ├── BarberDashboard.jsx  # Painel do barbeiro, faturamento e CRM
│   │   ├── Booking.jsx          # Checkout de agendamento do cliente
│   │   ├── admin/               # Telas do Administrador da Barbearia
│   │   │   └── Agenda.jsx       # Calendário interativo de agendamentos
│   │   └── siteowner/           # Telas do Administrador do SaaS
│   │       ├── Planos.jsx       # CRUD de planos de assinatura
│   │       └── Simulador.jsx    # Painel de simulação de roles
│   └── lib/                     # Integrações e estados globais
│       ├── db.js                # Wrapper de entidades e upload para Supabase
│       ├── supabase.js          # Inicialização do cliente Supabase
│       ├── AuthContext.js       # Gerenciamento de login e roles do usuário
│       └── notifications.js     # Helpers para criação de notificações
```

---

## 6. Rotas Frontend

| Rota | Acesso | Componente / Comportamento |
| :--- | :--- | :--- |
| `/` | Público (Autenticado) | Redireciona para o painel principal correspondente à maior role (`SmartHome`). |
| `/explore` | Público | Lista de barbearias e busca de estabelecimentos (`Home`). |
| `/dashboard` | Cliente | Painel com métricas do cliente, saldo de visitas e histórico (`ClientDashboard`). |
| `/booking` | Cliente | Checkout para agendar dia, horário, barbeiro e serviços (`Booking`). |
| `/barber-dashboard` | Barbeiro | Agenda diária, faturamento financeiro e CRM (`BarberDashboard`). |
| `/profile` | Qualquer perfil | Edição de nome, contatos e upload/recorte de foto de perfil (`Profile`). |
| `/admin` | Admin / SiteOwner | Dashboard da barbearia contendo faturamento e métricas (`AdminDashboard`). |
| `/admin/agenda` | Admin / SiteOwner | Calendário administrativo para ver e criar agendamentos (`AdminAgenda`). |
| `/admin/barbearia` | Admin / SiteOwner | Upload de logo/banner da barbearia, endereço e horários (`ShopSettings`). |
| `/siteowner` | SiteOwner | Dashboard global de faturamento do SaaS (`SiteOwnerDashboard`). |
| `/siteowner/planos` | SiteOwner | Criação e desativação de planos de assinatura da plataforma (`SiteOwnerPlanos`). |
| `/siteowner/simulador` | SiteOwner | Emulação de roles de teste (`SiteOwnerSimulador`). |

---

## 7. Modelos de Dados (Entidades)

```
[profiles] (1) ─── (N) [profile_roles]
[profiles] (1) ─── (N) [client_records] (CRM)
[shops] (1) ────── (N) [shop_memberships]
[profiles] (1) ─── (N) [shop_memberships]
[shops] (1) ────── (N) [barbers]
[barbers] (1) ──── (N) [services]
[barbers] (1) ──── (N) [appointments]
[shops] (1) ────── (N) [appointments]
```

### 7.1. profiles (Extensão da auth.users)
- `id` (uuid, PK): ID único do usuário.
- `full_name` (text): Nome completo.
- `avatar_url` (text): Link público da foto de perfil.
- `email` (text): E-mail do usuário.
- `phone` (text): Telefone para contato.

### 7.2. shops (Barbearias / Tenants)
- `id` (uuid, PK): ID da barbearia.
- `owner_id` (uuid, FK): ID do proprietário da barbearia.
- `name` (text): Nome do estabelecimento.
- `slug` (text, Unique): URL amigável da barbearia.
- `logo` (text): Link da logo.
- `banner` (text): Link do banner.
- `address` (text): Endereço físico.
- `phone` (text): Telefone comercial.

### 7.3. barbers (Barbeiros)
- `id` (uuid, PK): ID do barbeiro.
- `profile_id` (uuid, FK): Perfil do usuário barbeiro.
- `shop_id` (uuid, FK): Barbearia à qual está associado.
- `name` (text): Nome profissional do barbeiro.
- `bio` (text): Descrição curta das qualificações.
- `specialties` (text[]): Lista de especialidades.

### 7.4. client_records (CRM de Clientes)
- `id` (uuid, PK): Ficha do cliente.
- `profile_id` (uuid, FK, Nullable): Perfil opcional do cliente cadastrado.
- `shop_id` (uuid, FK): Barbearia à qual pertence este registro do CRM.
- `name` (text): Nome do cliente.
- `phone` (text): Telefone do cliente.
- `email` (text): E-mail do cliente.
- `source` (text): Canal de entrada (`'manual'` ou `'marketplace'`).

### 7.5. appointments (Agendamentos)
- `id` (uuid, PK): ID do agendamento.
- `shop_id` (uuid, FK): Barbearia.
- `barber_id` (uuid, FK): Barbeiro encarregado.
- `client_name` (text): Nome do cliente.
- `service_name` (text): Nome do serviço realizado.
- `price` (numeric): Valor do serviço.
- `date` (date): Data do corte.
- `time` (text): Horário do corte.
- `status` (text): Status (`'agendado'`, `'confirmado'`, `'concluido'`, `'cancelado'`, `'faltou'`).

### 7.6. plans (Planos de Assinatura)
- `id` (uuid, PK): ID do plano.
- `name` (text): Nome do plano.
- `description` (text): Descrição do plano.
- `monthly_price` (numeric): Valor mensal.
- `annual_price` (numeric): Valor anual.
- `annual_discount` (numeric): Porcentagem de desconto na anuidade.
- `max_barbers` (integer): Limite de profissionais na barbearia.
- `max_clients` (integer): Limite de clientes no CRM.

---

## 8. Tecnologias Utilizadas

- **Core**: React 18, Vite (bundler), JavaScript ES6.
- **Estilização**: Tailwind CSS (framework de utilitários), Lucide React (iconografia).
- **Banco de Dados e Backend**: Supabase (PostgreSQL, Storage Buckets, Auth, Row Level Security).
- **Roteamento**: React Router DOM v6.
- **Gráficos**: Recharts.
- **Animações**: Framer Motion.
- **Toast Alerts**: Sonner.
