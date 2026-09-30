# 🗄️ Banco de Dados e Migrations — TrimUp BarberHub

Esta pasta contém todos os scripts SQL necessários para instanciar ou atualizar o banco de dados PostgreSQL no Supabase.

---

## 📌 Como Configurar um Banco Novo do Zero

Se você estiver criando um projeto novo no Supabase:

1. Abra o **SQL Editor** no painel do seu projeto Supabase.
2. Copie e cole o conteúdo de [`schema.sql`](./schema.sql) e execute (`Run`).
3. Em seguida, execute as migrações em ordem sequencial:
   - [`migrations/01_migrations.sql`](./migrations/01_migrations.sql) (Campos extras de CRM, lojas, agendamentos e produtos)
   - [`migrations/02_migration_cpf_cnpj_lgpd.sql`](./migrations/02_migration_cpf_cnpj_lgpd.sql) (Hash de CPF/CNPJ, LGPD e restrições de unicidade)
   - [`migrations/03_migration_barber_cancel.sql`](./migrations/03_migration_barber_cancel.sql) (Trigger de desligamento de barbeiro e limite de planos)

---

## 📂 Estrutura

- **`schema.sql`**: Blueprint inicial do banco de dados (tabelas base, tipos de notificação, perfis, papéis, regras RLS).
- **`migrations/`**:
  - `01_migrations.sql`: Novas colunas para suportar as telas do frontend.
  - `02_migration_cpf_cnpj_lgpd.sql`: Segurança de dados sensíveis e conformidade LGPD.
  - `03_migration_barber_cancel.sql`: Automação para desvincular barbeiro ao excluir conta.
