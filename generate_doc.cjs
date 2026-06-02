const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');
 
const GOLD = "D4A017";
const DARK = "1a1a2e";
const LIGHT_BG = "F8F5EE";
const BLUE = "2563EB";
const GREEN = "16A34A";
const RED = "DC2626";
const GRAY = "6B7280";
const BORDER_GRAY = "E5E7EB";
const TABLE_HEADER = "1E3A5F";
const TABLE_ALT = "EFF6FF";
const CODE_BG = "F1F5F9";
 
const border = (color = BORDER_GRAY) => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (color = BORDER_GRAY) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
 
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 6 } },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: DARK })]
  });
}
 
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: DARK })]
  });
}
 
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: BLUE })]
  });
}
 
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "374151", ...opts })]
  });
}
 
function pMixed(runs) {
  return new Paragraph({
    spacing: { after: 120 },
    children: runs.map(r => new TextRun({ font: "Arial", size: 22, color: "374151", ...r }))
  });
}
 
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "374151" })]
  });
}
 
function bulletMixed(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80 },
    children: runs.map(r => new TextRun({ font: "Arial", size: 22, color: "374151", ...r }))
  });
}
 
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "374151" })]
  });
}
 
function code(text) {
  return new Paragraph({
    spacing: { after: 80 },
    shading: { fill: CODE_BG, type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 20, color: "1E293B" })]
  });
}
 
function note(text, color = GOLD) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color, space: 12 } },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "374151", italics: true })]
  });
}
 
function spacer(size = 120) {
  return new Paragraph({ spacing: { after: size }, children: [] });
}
 
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
 
function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: borders("2563EB"),
    shading: { fill: TABLE_HEADER, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: "FFFFFF" })] })]
  });
}
 
function dataCell(text, width, shade = false, color = "374151") {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: borders(),
    shading: { fill: shade ? TABLE_ALT : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, color })] })]
  });
}
 
function dataRow(cells, shade = false) {
  return new TableRow({ children: cells.map((c, i) => dataCell(c.text, c.width, shade, c.color)) });
}
 
// ===========================
// ENTITY / TABLE MAPPING TABLE
// ===========================
const W = 9360; // content width in DXA (US Letter 1" margins)
 
function entityMappingTable() {
  const cols = [2340, 2340, 2340, 2340];
  const rows = [
    ["Appointment", "appointments", "id, barber_id, client_id (FK profiles), service_id, date, time, status, price, notes, rating, review", "client_email → client_id FK; status enum migrado"],
    ["Barber", "barbers", "id, profile_id (FK), shop_id (FK), name, photo, bio, specialties[], rating, is_active, working_hours (jsonb)", "owner_email substituído por FK"],
    ["Client", "client_records", "id, profile_id (FK), shop_id (FK), name, phone, whatsapp, email, address, city, cep, notes, is_vip, source, total_visits, total_spent, avg_ticket, last_visit", "Unique (shop_id, profile_id) — CRM por loja"],
    ["Shop", "shops", "id, owner_id (FK profiles), name, slug, logo, banner, colors, address, lat, lng, rating, plan, is_active, is_featured, specialties[], working_hours (jsonb)", "owner_email → owner_id FK"],
    ["Service", "services", "id, barber_id (FK), shop_id (FK), name, price, duration_minutes, category, is_active", "Adicionado shop_id para queries por loja"],
    ["Product", "products", "id, barber_id (FK), shop_id (FK), name, price, image, category, stock, is_active", "Adicionado shop_id"],
    ["Plan", "plans", "id, name, monthly_price, annual_price, trial_days, max_barbers, max_clients, max_units, features[], is_active", "Sem alterações estruturais"],
    ["Subscription", "subscriptions", "id, shop_id (FK), plan_id (FK), status, start_date, end_date, renewal_date, monthly_value, auto_renew", "barbershop_id → shop_id FK"],
  ];
 
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: cols.map((w, i) => headerCell(["Entidade Base44", "Tabela Supabase", "Colunas principais", "Observações"][i], w))
      }),
      ...rows.map((r, i) => new TableRow({
        children: r.map((text, j) => dataCell(text, cols[j], i % 2 === 1))
      }))
    ]
  });
}
 
function dbCallsTable() {
  const cols = [2600, 2760, 4000];
  const rows = [
    ["db.entities.X.filter({k:v})", "supabase.from('x').select('*').eq('k',v)", "Filtro simples por coluna"],
    ["db.entities.X.filter({k:v}, '-date', 500)", "supabase.from('x').select('*').eq('k',v).order('date',{asc:false}).limit(500)", "Ordenação e limit"],
    ["db.entities.X.list('-rating', 30)", "supabase.from('x').select('*').order('rating',{asc:false}).limit(30)", "Listagem com ordem"],
    ["db.entities.X.get(id)", "supabase.from('x').select('*').eq('id',id).single()", "Busca por ID"],
    ["db.entities.X.create({...})", "supabase.from('x').insert({...}).select().single()", "Criação de registro"],
    ["db.entities.X.update(id, {...})", "supabase.from('x').update({...}).eq('id',id).select().single()", "Atualização de registro"],
    ["db.entities.X.delete(id)", "supabase.from('x').delete().eq('id',id)", "Exclusão de registro"],
    ["db.auth.me()", "supabase.auth.getUser() → busca profiles por user.id", "Usuário autenticado"],
    ["db.auth.loginViaEmailPassword(e,p)", "supabase.auth.signInWithPassword({email,password})", "Login email/senha"],
    ["db.auth.register({email,password})", "supabase.auth.signUp({email,password})", "Cadastro de usuário"],
    ["db.auth.verifyOtp({email,otpCode})", "supabase.auth.verifyOtp({email,token,type:'email'})", "Verificação OTP"],
    ["db.auth.loginWithProvider('google',r)", "supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:r}})", "OAuth Google"],
    ["db.auth.logout()", "supabase.auth.signOut()", "Logout"],
    ["db.integrations.Core.InvokeLLM({prompt})", "Chamada direta à API Anthropic (claude-sonnet-4-*)", "IA Insights no dashboard"],
    ["db.integrations.Core.UploadFile(file)", "supabase.storage.from('uploads').upload(path, file)", "Upload de arquivos/fotos"],
  ];
 
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: cols.map((w, i) => headerCell(["Chamada Base44 atual", "Equivalente Supabase", "Descrição"][i], w))
      }),
      ...rows.map((r, i) => new TableRow({
        children: r.map((text, j) => dataCell(text, cols[j], i % 2 === 1))
      }))
    ]
  });
}
 
function rlsTable() {
  const cols = [2000, 2200, 2580, 2580];
  const rows = [
    ["appointments", "INSERT", "auth.uid() = client_profile_id OR barber profile owner OR admin role", "Cliente agenda para si; admin agenda para qualquer um"],
    ["appointments", "SELECT", "auth.uid() = client_profile_id OR barber profile owner OR admin role", "Cada um vê apenas os seus"],
    ["appointments", "UPDATE", "auth.uid() = client_profile_id OR barber owner OR admin", "Status só muda por quem tem direito"],
    ["barbers", "SELECT", "true (público)", "Barbeiros visíveis para todos"],
    ["barbers", "INSERT/UPDATE", "auth.uid() = profile_id OR shop owner OR admin", "Só dono edita"],
    ["client_records", "SELECT", "shop owner via shop_memberships role=owner/admin", "Admin da loja vê seus clientes"],
    ["client_records", "INSERT", "shop owner/admin da loja", "CRM privado por tenant"],
    ["shops", "SELECT", "true (público)", "Listagem pública"],
    ["shops", "INSERT", "auth.uid() presente (qualquer autenticado)", "Qualquer um cria sua barbearia"],
    ["shops", "UPDATE", "owner_id = auth.uid() OR admin", "Só dono edita"],
    ["services / products", "SELECT", "true (público)", "Catálogo público"],
    ["plans", "SELECT", "true (público)", "Planos visíveis para todos"],
    ["plans", "INSERT/UPDATE/DELETE", "siteowner role", "Apenas SiteOwner gerencia"],
    ["subscriptions", "SELECT", "siteowner OR shop owner (própria)", "Dono vê a sua"],
    ["subscriptions", "INSERT/UPDATE/DELETE", "siteowner role", "Apenas SiteOwner"],
  ];
 
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: cols.map((w, i) => headerCell(["Tabela", "Operação", "Condição (simplificada)", "Notas"][i], w))
      }),
      ...rows.map((r, i) => new TableRow({
        children: r.map((text, j) => dataCell(text, cols[j], i % 2 === 1))
      }))
    ]
  });
}
 
function pagesTable() {
  const cols = [2200, 2200, 2960, 2000];
  const rows = [
    ["Login.jsx", "Alta", "db.auth.loginViaEmailPassword → supabase.auth.signInWithPassword; db.auth.loginWithProvider('google') → supabase OAuth", "AuthContext controla redirect"],
    ["Register.jsx", "Alta", "db.auth.register → signUp; db.auth.verifyOtp → verifyOtp; db.entities.Client.create → inserir em client_records (trigger cria profiles)", "Trigger on_auth_user_created cria profile automaticamente"],
    ["ForgotPassword.jsx", "Média", "db.auth.resetPasswordByEmail → supabase.auth.resetPasswordForEmail", "Mínima alteração"],
    ["ResetPassword.jsx", "Média", "db.auth.confirmPasswordReset → supabase.auth.updateUser", "URL redirect configurar no Supabase dashboard"],
    ["Home.jsx", "Média", "db.entities.Shop.list('-rating',30) → query shops ordenado por rating", "Sem auth obrigatória — leitura pública"],
    ["Marketplace.jsx", "Baixa", "db.entities.Product.list('-created_date') → query products", "Leitura pública, sem RLS restritiva"],
    ["Booking.jsx", "Alta", "Shop.list, Barber.filter, Service.filter, Appointment.filter (slots), Appointment.create → múltiplas queries + insert", "Conflito de horário: CHECK no DB ou validação client-side"],
    ["ClientDashboard.jsx", "Média", "Appointments por client_email → por client_id (profile_id)", "Mudar filtro de email para FK"],
    ["BarberDashboard.jsx", "Média", "Barber.filter({owner_email}) → barbers por profile_id", "Mudar filtro"],
    ["BarberProfile.jsx", "Baixa", "Barber.get(id), Service.filter, Appointment — leituras", "Público, baixa complexidade"],
    ["ShopPage.jsx", "Baixa", "Shop.filter({slug}), Barbers, Services — leituras públicas", "Slug-based routing mantido"],
    ["ShopSettings.jsx", "Alta", "Shop CRUD + upload logo/banner → Supabase Storage", "Upload de imagem muda para storage API"],
    ["Profile.jsx", "Média", "User/profile update → supabase.auth.updateUser + profiles table", "Avatar upload → Storage"],
    ["admin/Dashboard.jsx", "Alta", "Shop por owner, Barbers, Appointments (loop), Clients + InvokeLLM", "Loop N+1 → query única com JOIN; InvokeLLM → API Anthropic direta"],
    ["admin/Agenda.jsx", "Alta", "CRUD completo Appointment, Barbers, Services — filtros complexos", "Maior página; requer múltiplas queries otimizadas"],
    ["admin/Clientes.jsx", "Alta", "CRUD Client (client_records) + Appointments por barbeiros", "client_records unique(shop_id, profile_id)"],
    ["admin/Produtos.jsx", "Média", "CRUD Product + upload imagem", "Storage para imagens"],
    ["admin/Configuracoes.jsx", "Média", "Shop update, configs gerais", "Direto"],
    ["siteowner/Dashboard.jsx", "Média", "Shops.list, Subscriptions, métricas globais", "Role siteowner no RLS"],
    ["siteowner/Planos.jsx", "Média", "CRUD Plans — apenas siteowner", "RLS bloqueia outros roles"],
    ["siteowner/Assinaturas.jsx", "Média", "CRUD Subscriptions", "Link shop ↔ plan"],
    ["siteowner/Simulador.jsx", "Baixa", "Apenas local state + cálculos", "Sem backend, migração trivial"],
    ["AuthContext.jsx", "Crítica", "Reescrever completamente: remover app-params/Base44 token, usar supabase.auth.onAuthStateChange, getSession, getUser; user object = profile row", "Ponto central — todas as pages dependem"],
  ];
 
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        tableHeader: true,
        children: cols.map((w, i) => headerCell(["Arquivo", "Complexidade", "Mudanças principais", "Observações"][i], w))
      }),
      ...rows.map((r, i) => new TableRow({
        children: r.map((text, j) => {
          let color = "374151";
          if (j === 1) {
            if (text === "Crítica") color = RED;
            else if (text === "Alta") color = "D97706";
            else if (text === "Média") color = BLUE;
            else color = GREEN;
          }
          return dataCell(text, cols[j], i % 2 === 1, color);
        })
      }))
    ]
  });
}
 
// ===========================
// DOCUMENT
// ===========================
 
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 900, hanging: 360 } } } },
        ]
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
        ]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: DARK },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
 
        // ===== CAPA =====
        new Paragraph({
          spacing: { before: 1440, after: 120 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "✂️", font: "Segoe UI Emoji", size: 80 })]
        }),
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "TrimUp Barber Hub", font: "Arial", size: 56, bold: true, color: GOLD })]
        }),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Guia Completo de Migração", font: "Arial", size: 36, color: DARK })]
        }),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Base44  →  Supabase", font: "Arial", size: 28, color: GRAY, italics: true })]
        }),
        spacer(80),
        new Paragraph({
          spacing: { after: 80 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Versão 1.0  |  Junho 2026", font: "Arial", size: 22, color: GRAY })]
        }),
        spacer(400),
 
        // ===== SUMÁRIO EXECUTIVO =====
        pageBreak(),
        h1("Sumário Executivo"),
        p("Este documento cobre toda a migração do TrimUp Barber Hub da plataforma Base44 para o Supabase. O projeto exportado contém o frontend React completo com 23 páginas, mas nenhum backend real — a camada de dados está em stubs/mocks que retornam arrays vazios. A migração consiste em substituir esses stubs pelo Supabase Client SDK."),
        spacer(),
 
        h2("Estado atual do projeto exportado"),
 
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell("Componente", 3120), headerCell("Status", 6240)] }),
            new TableRow({ children: [dataCell("Frontend React", 3120, false), dataCell("✅ Completo — 23 páginas + layouts + componentes UI", 6240, false, GREEN)] }),
            new TableRow({ children: [dataCell("Backend", 3120, true), dataCell("❌ Inexistente — substituído por stubs (base44Client.js)", 6240, true, RED)] }),
            new TableRow({ children: [dataCell("Banco de dados", 3120, false), dataCell("⏳ Modelado, Supabase criado, tabelas ainda não executadas", 6240, false, "D97706")] }),
            new TableRow({ children: [dataCell("Autenticação", 3120, true), dataCell("⏳ AuthContext usa lógica Base44 — precisa ser reescrito", 6240, true, "D97706")] }),
            new TableRow({ children: [dataCell("RLS / Políticas", 3120, false), dataCell("⏳ Planejado, ainda não criado no Supabase", 6240, false, "D97706")] }),
            new TableRow({ children: [dataCell("Storage (fotos)", 3120, true), dataCell("❌ Não configurado — pages usam db.integrations.Core.UploadFile", 6240, true, RED)] }),
            new TableRow({ children: [dataCell("vite.config.js", 3120, false), dataCell("⚠️  Referencia plugin Base44 não instalado — bloqueia dev server", 6240, false, RED)] }),
          ]
        }),
        spacer(),
 
        h2("Stack tecnológica"),
        bullet("React 18 + Vite 6 + React Router DOM 6"),
        bullet("TanStack Query (React Query) para cache"),
        bullet("Tailwind CSS + Radix UI (shadcn/ui)"),
        bullet("Recharts para gráficos, React Leaflet para mapas"),
        bullet("Stripe (stripe-js + react-stripe-js) para pagamentos"),
        bullet("Framer Motion para animações"),
        spacer(),
 
        h2("Entidades do domínio"),
        p("O projeto define 8 entidades Base44 que serão traduzidas para tabelas Supabase:"),
        bullet("Shop — barbearia (tenant)"),
        bullet("Barber — barbeiro vinculado a uma loja"),
        bullet("Client — ficha CRM do cliente por loja"),
        bullet("Appointment — agendamento de serviço"),
        bullet("Service — serviço oferecido por barbeiro"),
        bullet("Product — produto do marketplace"),
        bullet("Plan — plano de assinatura do SaaS"),
        bullet("Subscription — assinatura de uma barbearia"),
        spacer(),
 
        // ===== FASE 1: BLOQUEIO IMEDIATO =====
        pageBreak(),
        h1("Fase 1 — Desbloqueio imediato"),
        p("Antes de qualquer integração com Supabase, o projeto precisa ser desbloqueado para rodar localmente. O problema é o vite.config.js que chama uma função base44() não definida."),
        spacer(),
 
        h2("1.1 Corrigir vite.config.js"),
        p("Substituir o conteúdo atual do vite.config.js por:"),
        spacer(60),
        code("// vite.config.js"),
        code("import react from '@vitejs/plugin-react'"),
        code("import { defineConfig } from 'vite'"),
        code("import path from 'path'"),
        code(""),
        code("export default defineConfig({"),
        code("  plugins: [react()],"),
        code("  resolve: {"),
        code("    alias: {"),
        code("      '@': path.resolve(__dirname, './src')"),
        code("    }"),
        code("  }"),
        code("})"),
        spacer(),
        note("O alias '@' provavelmente já funciona via jsconfig.json, mas defini-lo explicitamente no vite evita erros de resolução de módulos."),
        spacer(),
 
        h2("1.2 Remover dependências Base44 do package.json"),
        p("Remover da seção dependencies:"),
        code("\"@base44/sdk\": \"^0.8.31\","),
        code("\"@base44/vite-plugin\": \"^1.0.21\","),
        spacer(),
        p("Em seguida executar:"),
        code("npm install"),
        code("npm run dev"),
        spacer(),
        note("O projeto deve abrir em http://localhost:5173 mostrando a interface, mas sem dados reais (ainda com stubs)."),
        spacer(),
 
        h2("1.3 Instalar Supabase Client"),
        code("npm install @supabase/supabase-js"),
        spacer(),
 
        h2("1.4 Criar arquivo .env"),
        p("Na raiz do projeto, criar .env com as credenciais do Supabase:"),
        code("VITE_SUPABASE_URL=https://zgmzvlmyrppvfmkhzaak.supabase.co"),
        code("VITE_SUPABASE_ANON_KEY=<sua_anon_key>"),
        spacer(),
        note("⚠️  Nunca colocar service_role key no .env do frontend. Ela vai para o browser e é pública. Use apenas a anon key no cliente."),
        spacer(),
 
        h2("1.5 Criar src/lib/supabase.js"),
        code("import { createClient } from '@supabase/supabase-js'"),
        code(""),
        code("export const supabase = createClient("),
        code("  import.meta.env.VITE_SUPABASE_URL,"),
        code("  import.meta.env.VITE_SUPABASE_ANON_KEY"),
        code(")"),
        spacer(),
 
        // ===== FASE 2: BANCO DE DADOS =====
        pageBreak(),
        h1("Fase 2 — Banco de dados no Supabase"),
        spacer(),
 
        h2("2.1 Mapeamento de entidades Base44 → tabelas"),
        p("A tabela abaixo mostra como cada entidade do projeto exportado é traduzida para uma tabela Supabase, com as principais mudanças de schema:"),
        spacer(60),
        entityMappingTable(),
        spacer(),
 
        h2("2.2 Tabelas de sistema adicionais"),
        p("Além das entidades já existentes no Base44, o modelo Supabase inclui tabelas de infraestrutura:"),
        spacer(60),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell("Tabela", 2340), headerCell("Finalidade", 7020)] }),
            ...[
              ["profiles", "Extensão de auth.users — armazena full_name, avatar, role principal. Criada automaticamente por trigger on_auth_user_created."],
              ["profile_roles", "Permite múltiplos papéis (CLIENT, BARBER, ADMIN, SITEOWNER) por usuário."],
              ["shop_memberships", "Vincula perfis a barbearias com papel (owner, admin, barber). Base do multi-tenant."],
              ["barber_link_requests", "Convite ou candidatura para vincular barbeiro a uma loja."],
              ["barber_link_history", "Log de vínculos aceitos/rejeitados."],
              ["geocode_cache", "Cache server-side de coordenadas por endereço — evita geocoding no browser."],
              ["client_record_geography", "Coordenadas dos clientes para o heatmap do dashboard."],
            ].map((r, i) => new TableRow({ children: r.map((text, j) => dataCell(text, j === 0 ? 2340 : 7020, i % 2 === 1)) }))
          ]
        }),
        spacer(),
 
        h2("2.3 Ordem de criação das tabelas"),
        p("Execute os CREATE TABLE nessa ordem para respeitar as foreign keys:"),
        spacer(60),
        numbered("roles"),
        numbered("profiles  (depende de auth.users)"),
        numbered("profile_roles  (depende de profiles)"),
        numbered("plans"),
        numbered("shops  (depende de profiles como owner_id)"),
        numbered("shop_memberships  (depende de shops + profiles)"),
        numbered("subscriptions  (depende de shops + plans)"),
        numbered("barbers  (depende of shops + profiles)"),
        numbered("barber_link_requests  (depende de shops + profiles)"),
        numbered("barber_link_history"),
        numbered("services  (depende de barbers + shops)"),
        numbered("products  (depende de barbers + shops)"),
        numbered("client_records  (depende de shops + profiles)"),
        numbered("appointments  (depende de barbers + client_records + services)"),
        numbered("geocode_cache"),
        numbered("client_record_geography  (depende de client_records)"),
        spacer(),
 
        h2("2.4 Triggers obrigatórios"),
        spacer(60),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [3000, 3000, 3360],
          rows: [
            new TableRow({ children: [headerCell("Trigger", 3000), headerCell("Dispara em", 3000), headerCell("Ação", 3360)] }),
            ...[
              ["on_auth_user_created", "INSERT em auth.users", "Cria row em profiles com full_name do metadata; atribui role CLIENT em profile_roles"],
              ["on_shop_created", "INSERT em shops", "Cria shop_memberships(owner) para o criador da loja"],
              ["on_barber_link_accepted", "UPDATE barber_link_requests status='accepted'", "Cria shop_memberships(barber) e atualiza barbers.profile_id"],
              ["update_client_metrics_on_complete", "UPDATE appointments status='concluido'", "Recalcula total_visits, total_spent, avg_ticket em client_records"],
              ["check_appointment_conflict", "INSERT/UPDATE appointments", "RAISE EXCEPTION se já existe appointment no mesmo barber+date+time"],
            ].map((r, i) => new TableRow({ children: r.map((text, j) => dataCell(text, [3000,3000,3360][j], i % 2 === 1)) }))
          ]
        }),
        spacer(),
 
        // ===== FASE 3: RLS =====
        pageBreak(),
        h1("Fase 3 — Row Level Security (RLS)"),
        p("O RLS substitui a camada de controle de acesso que o Base44 fazia via user_condition e ownedShopId/ownedBarberId. Todas as tabelas devem ter RLS habilitado e nenhuma política permissiva demais."),
        spacer(),
 
        h2("3.1 Políticas por tabela"),
        spacer(60),
        rlsTable(),
        spacer(),
 
        h2("3.2 Helpers recomendados"),
        p("Criar estas funções SQL para simplificar as políticas:"),
        spacer(60),
        code("-- Verifica se usuário é membro de uma loja com determinado papel"),
        code("CREATE OR REPLACE FUNCTION is_shop_member(p_shop_id uuid, p_role text)"),
        code("RETURNS boolean AS $$"),
        code("  SELECT EXISTS ("),
        code("    SELECT 1 FROM shop_memberships"),
        code("    WHERE shop_id = p_shop_id"),
        code("      AND profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())"),
        code("      AND role = p_role"),
        code("      AND is_active = true"),
        code("  );"),
        code("$$ LANGUAGE sql SECURITY DEFINER;"),
        spacer(60),
        code("-- Retorna profile_id do usuário autenticado"),
        code("CREATE OR REPLACE FUNCTION my_profile_id()"),
        code("RETURNS uuid AS $$"),
        code("  SELECT id FROM profiles WHERE user_id = auth.uid();"),
        code("$$ LANGUAGE sql SECURITY DEFINER;"),
        spacer(60),
        code("-- Verifica se usuário tem determinado role"),
        code("CREATE OR REPLACE FUNCTION has_role(p_role text)"),
        code("RETURNS boolean AS $$"),
        code("  SELECT EXISTS ("),
        code("    SELECT 1 FROM profile_roles pr"),
        code("    JOIN profiles p ON p.id = pr.profile_id"),
        code("    WHERE p.user_id = auth.uid() AND pr.role = p_role"),
        code("  );"),
        code("$$ LANGUAGE sql SECURITY DEFINER;"),
        spacer(),
 
        // ===== FASE 4: AUTH CONTEXT =====
        pageBreak(),
        h1("Fase 4 — Reescrita do AuthContext"),
        p("O AuthContext.jsx atual contém lógica de token Base44, chamadas a /api/apps/public e dependência de app-params.js. Tudo isso precisa ser substituído pela API do Supabase Auth."),
        spacer(),
 
        h2("4.1 Novo fluxo de autenticação"),
        bullet("supabase.auth.onAuthStateChange() como fonte única de verdade"),
        bullet("Ao receber sessão: buscar row em profiles para obter full_name, avatar, roles"),
        bullet("Armazenar { session, user, profile, roles } no contexto"),
        bullet("Remover completamente: app-params.js, axios, /api/apps/public, tokens Base44"),
        spacer(),
 
        h2("4.2 Estrutura do novo AuthContext"),
        spacer(60),
        code("import { createContext, useState, useContext, useEffect } from 'react';"),
        code("import { supabase } from '@/lib/supabase';"),
        code(""),
        code("const AuthContext = createContext();"),
        code(""),
        code("export const AuthProvider = ({ children }) => {"),
        code("  const [session, setSession] = useState(null);"),
        code("  const [profile, setProfile] = useState(null);"),
        code("  const [roles, setRoles] = useState([]);"),
        code("  const [loading, setLoading] = useState(true);"),
        code(""),
        code("  useEffect(() => {"),
        code("    // Sessão inicial"),
        code("    supabase.auth.getSession().then(({ data: { session } }) => {"),
        code("      setSession(session);"),
        code("      if (session) loadProfile(session.user.id);"),
        code("      else setLoading(false);"),
        code("    });"),
        code(""),
        code("    // Listener de mudanças"),
        code("    const { data: { subscription } } = supabase.auth.onAuthStateChange("),
        code("      async (event, session) => {"),
        code("        setSession(session);"),
        code("        if (session) await loadProfile(session.user.id);"),
        code("        else { setProfile(null); setRoles([]); setLoading(false); }"),
        code("      }"),
        code("    );"),
        code("    return () => subscription.unsubscribe();"),
        code("  }, []);"),
        code(""),
        code("  const loadProfile = async (userId) => {"),
        code("    const { data: prof } = await supabase"),
        code("      .from('profiles').select('*, profile_roles(role)')"),
        code("      .eq('user_id', userId).single();"),
        code("    setProfile(prof);"),
        code("    setRoles(prof?.profile_roles?.map(r => r.role) || []);"),
        code("    setLoading(false);"),
        code("  };"),
        code(""),
        code("  const value = {"),
        code("    session,"),
        code("    user: session?.user ?? null,"),
        code("    profile,"),
        code("    roles,"),
        code("    isAuthenticated: !!session,"),
        code("    isLoadingAuth: loading,"),
        code("    hasRole: (role) => roles.includes(role),"),
        code("    logout: () => supabase.auth.signOut(),"),
        code("  };"),
        code(""),
        code("  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;"),
        code("};"),
        code(""),
        code("export const useAuth = () => useContext(AuthContext);"),
        spacer(),
 
        h2("4.3 Adaptar RoleRoute.jsx"),
        p("O RoleRoute atual verifica user.role (string única). Deve passar a verificar o array roles:"),
        spacer(60),
        code("// Antes"),
        code("if (!allowedRoles.includes(user.role)) return <Navigate to={redirectTo} replace />;"),
        code(""),
        code("// Depois"),
        code("const { roles } = useAuth();"),
        code("if (!roles.some(r => allowedRoles.includes(r))) return <Navigate to={redirectTo} replace />;"),
        spacer(),
 
        // ===== FASE 5: MAPEAMENTO DE CHAMADAS =====
        pageBreak(),
        h1("Fase 5 — Mapeamento de chamadas de dados"),
        p("Cada chamada ao mock db.entities.X deve ser substituída pela equivalente Supabase. A tabela abaixo cobre todos os padrões encontrados no código."),
        spacer(60),
        dbCallsTable(),
        spacer(),
 
        h2("5.1 Criar camada de abstração (recomendado)"),
        p("Para facilitar a migração e evitar repetição, criar src/lib/db.js como wrapper do Supabase Client, mantendo a interface parecida com o que o código já usa:"),
        spacer(60),
        code("// src/lib/db.js"),
        code("import { supabase } from './supabase';"),
        code(""),
        code("export const db = {"),
        code("  shops: {"),
        code("    list: (order = 'rating', limit = 50) =>"),
        code("      supabase.from('shops').select('*')"),
        code("        .order(order.replace('-',''), { ascending: !order.startsWith('-') })"),
        code("        .limit(limit).then(r => r.data ?? []),"),
        code("    filter: (filters) =>"),
        code("      Object.entries(filters).reduce("),
        code("        (q, [k,v]) => q.eq(k, v),"),
        code("        supabase.from('shops').select('*')"),
        code("      ).then(r => r.data ?? []),"),
        code("    get: (id) =>"),
        code("      supabase.from('shops').select('*').eq('id',id).single().then(r => r.data),"),
        code("    create: (data) =>"),
        code("      supabase.from('shops').insert(data).select().single().then(r => r.data),"),
        code("    update: (id, data) =>"),
        code("      supabase.from('shops').update(data).eq('id',id).select().single().then(r => r.data),"),
        code("    delete: (id) =>"),
        code("      supabase.from('shops').delete().eq('id',id),"),
        code("  },"),
        code("  // ... repetir para: barbers, appointments, clients, services, products, plans, subscriptions"),
        code("};"),
        spacer(),
        note("Essa abstração permite migrar página por página: basta trocar db.entities.Shop por db.shops em cada arquivo, sem reescrever a lógica de negócio."),
        spacer(),
 
        h2("5.2 Tratar o problema N+1 no Dashboard admin"),
        p("A página admin/Dashboard.jsx faz um loop de queries para buscar appointments de cada barbeiro:"),
        spacer(60),
        code("// ❌ Código atual — N+1 queries"),
        code("for (const barber of barbers) {"),
        code("  const a = await db.entities.Appointment.filter({ barber_id: barber.id }, '-date', 500);"),
        code("  allA.push(...a);"),
        code("}"),
        code(""),
        code("// ✅ Supabase — 1 query com IN"),
        code("const barberIds = barbers.map(b => b.id);"),
        code("const { data: allA } = await supabase"),
        code("  .from('appointments')"),
        code("  .select('*')"),
        code("  .in('barber_id', barberIds)"),
        code("  .order('date', { ascending: false })"),
        code("  .limit(500);"),
        spacer(),
 
        // ===== FASE 6: MAPEAMENTO POR PÁGINA =====
        pageBreak(),
        h1("Fase 6 — Migração por página"),
        p("A tabela abaixo mapeia cada arquivo do projeto, sua complexidade e o que precisa mudar. Migrar na ordem: AuthContext → Login/Register → Home/Marketplace → páginas admin → siteowner."),
        spacer(60),
        pagesTable(),
        spacer(),
 
        h2("6.1 Padrão de substituição (por arquivo)"),
        p("Para cada arquivo .jsx ou .js que contenha a linha de stub no topo:"),
        spacer(60),
        code("const db = globalThis.__B44_DB__ || { ... }; // REMOVER ESTA LINHA"),
        spacer(60),
        p("Substituir pelo import do cliente Supabase:"),
        code("import { supabase } from '@/lib/supabase';"),
        code("// ou"),
        code("import { db } from '@/lib/db'; // se usar a camada de abstração"),
        spacer(),
 
        h2("6.2 Padrão para funções de autenticação nas páginas"),
        spacer(60),
        code("// Login.jsx — handleSubmit"),
        code("const { error } = await supabase.auth.signInWithPassword({ email, password });"),
        code("if (error) throw error;"),
        code("window.location.href = '/'; // ou useNavigate"),
        code(""),
        code("// Login.jsx — handleGoogle"),
        code("await supabase.auth.signInWithOAuth({"),
        code("  provider: 'google',"),
        code("  options: { redirectTo: window.location.origin + '/' }"),
        code("});"),
        code(""),
        code("// Register.jsx — handleSubmit"),
        code("const { error } = await supabase.auth.signUp({ email, password });"),
        code("if (error) throw error;"),
        code("setShowOtp(true);"),
        code(""),
        code("// Register.jsx — handleVerify"),
        code("const { error } = await supabase.auth.verifyOtp({"),
        code("  email, token: otpCode, type: 'email'"),
        code("});"),
        code("// Trigger on_auth_user_created já cria o profile — não criar Client manualmente aqui"),
        spacer(),
 
        h2("6.3 Upload de arquivos (Storage)"),
        p("Substituir db.integrations.Core.UploadFile por Supabase Storage:"),
        spacer(60),
        code("// Criar bucket 'uploads' no Supabase Dashboard primeiro"),
        code("// Storage → New bucket → 'uploads' → public: true (para imagens de perfil/logo)"),
        code(""),
        code("async function uploadFile(file, path) {"),
        code("  const { data, error } = await supabase.storage"),
        code("    .from('uploads')"),
        code("    .upload(path, file, { upsert: true });"),
        code("  if (error) throw error;"),
        code("  const { data: { publicUrl } } = supabase.storage"),
        code("    .from('uploads').getPublicUrl(data.path);"),
        code("  return publicUrl;"),
        code("}"),
        code(""),
        code("// Uso em ShopSettings.jsx (logo):"),
        code("const url = await uploadFile(logoFile, `shops/${shopId}/logo.jpg`);"),
        code("await supabase.from('shops').update({ logo: url }).eq('id', shopId);"),
        spacer(),
 
        h2("6.4 AI Insights (InvokeLLM)"),
        p("O Dashboard usa db.integrations.Core.InvokeLLM para gerar insights via IA. No Supabase, essa chamada deve ir para uma Edge Function ou diretamente à API Anthropic via fetch:"),
        spacer(60),
        code("// Opção A: Supabase Edge Function (recomendado — esconde a API key)"),
        code("const { data } = await supabase.functions.invoke('generate-insights', {"),
        code("  body: { stats }"),
        code("});"),
        code(""),
        code("// Opção B: Direto da API Anthropic (API key exposta no frontend — não recomendado)"),
        code("const res = await fetch('https://api.anthropic.com/v1/messages', {"),
        code("  method: 'POST',"),
        code("  headers: { 'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY, ... },"),
        code("  body: JSON.stringify({ model: 'claude-sonnet-4-20250514', ... })"),
        code("});"),
        spacer(),
        note("Use obrigatoriamente a Edge Function para não expor a API key Anthropic no bundle do frontend."),
        spacer(),
 
        // ===== FASE 7: SUPABASE AUTH CONFIG =====
        pageBreak(),
        h1("Fase 7 — Configurações no Supabase Dashboard"),
        spacer(),
 
        h2("7.1 Authentication"),
        bullet("Providers → Email: habilitar Confirm email (envia OTP para verificação — compatível com Register.jsx)"),
        bullet("Providers → Google: configurar OAuth client_id e client_secret do Google Cloud Console"),
        bullet("URL Configuration → Site URL: https://seu-dominio.com (ou http://localhost:5173 para dev)"),
        bullet("URL Configuration → Redirect URLs: adicionar http://localhost:5173/** e o domínio de produção"),
        bullet("Email Templates: personalizar template de confirmação com a marca TrimUp"),
        spacer(),
 
        h2("7.2 Storage"),
        bullet("Criar bucket 'uploads' — público para logos/fotos que são exibidos no front"),
        bullet("Criar bucket 'private-docs' — privado para documentos sensíveis (se necessário)"),
        bullet("Configurar políticas de storage: authenticated users podem fazer upload na pasta {user_id}/"),
        spacer(),
 
        h2("7.3 Database"),
        bullet("Habilitar RLS em todas as tabelas após criá-las"),
        bullet("Executar as políticas na ordem correta (depois dos triggers)"),
        bullet("Criar indexes: shops(slug), appointments(barber_id, date), client_records(shop_id, profile_id)"),
        spacer(),
 
        h2("7.4 Edge Functions (para AI Insights)"),
        code("# Instalar Supabase CLI"),
        code("npm install -g supabase"),
        code(""),
        code("# Criar função"),
        code("supabase functions new generate-insights"),
        code(""),
        code("# Implementar em supabase/functions/generate-insights/index.ts"),
        code("# Fazer deploy"),
        code("supabase functions deploy generate-insights --project-ref zgmzvlmyrppvfmkhzaak"),
        code(""),
        code("# Configurar secret da API key Anthropic"),
        code("supabase secrets set ANTHROPIC_API_KEY=sk-ant-..."),
        spacer(),
 
        // ===== FASE 8: CHECKLIST =====
        pageBreak(),
        h1("Fase 8 — Checklist de migração"),
        spacer(),
 
        h2("Pré-requisitos"),
        bullet("[ ] Remover @base44/sdk e @base44/vite-plugin do package.json"),
        bullet("[ ] Corrigir vite.config.js (remover base44 plugin)"),
        bullet("[ ] npm install && npm run dev — projeto abre sem erros"),
        bullet("[ ] npm install @supabase/supabase-js"),
        bullet("[ ] Criar .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"),
        bullet("[ ] Criar src/lib/supabase.js"),
        spacer(),
 
        h2("Banco de dados"),
        bullet("[ ] Executar CREATE TABLE na ordem correta"),
        bullet("[ ] Criar funções helper (is_shop_member, my_profile_id, has_role)"),
        bullet("[ ] Criar triggers (on_auth_user_created, on_shop_created, etc.)"),
        bullet("[ ] Habilitar RLS em todas as tabelas"),
        bullet("[ ] Criar políticas RLS por tabela"),
        bullet("[ ] Criar indexes"),
        bullet("[ ] Seeds iniciais: roles, notification_types"),
        spacer(),
 
        h2("Autenticação"),
        bullet("[ ] Reescrever AuthContext.jsx usando supabase.auth.onAuthStateChange"),
        bullet("[ ] Adaptar RoleRoute.jsx para array de roles"),
        bullet("[ ] Configurar Google OAuth no Supabase Dashboard"),
        bullet("[ ] Configurar Redirect URLs"),
        bullet("[ ] Testar: register → email confirmation → login → logout"),
        spacer(),
 
        h2("Páginas — ordem de migração"),
        bullet("[ ] Login.jsx"),
        bullet("[ ] Register.jsx"),
        bullet("[ ] ForgotPassword.jsx / ResetPassword.jsx"),
        bullet("[ ] Home.jsx (listagem de shops — público)"),
        bullet("[ ] ShopPage.jsx (página da barbearia — público)"),
        bullet("[ ] Marketplace.jsx (produtos — público)"),
        bullet("[ ] Booking.jsx (agendamento)"),
        bullet("[ ] ClientDashboard.jsx"),
        bullet("[ ] BarberDashboard.jsx / BarberProfile.jsx"),
        bullet("[ ] Profile.jsx"),
        bullet("[ ] ShopSettings.jsx + upload Storage"),
        bullet("[ ] admin/Dashboard.jsx (resolver N+1 + InvokeLLM → Edge Function)"),
        bullet("[ ] admin/Agenda.jsx"),
        bullet("[ ] admin/Clientes.jsx"),
        bullet("[ ] admin/Produtos.jsx"),
        bullet("[ ] admin/Configuracoes.jsx"),
        bullet("[ ] siteowner/* (Dashboard, Planos, Assinaturas, Simulador)"),
        spacer(),
 
        h2("Infraestrutura e finalização"),
        bullet("[ ] Criar buckets de Storage e políticas"),
        bullet("[ ] Deploy Supabase Edge Function para AI Insights"),
        bullet("[ ] Rotacionar service_role key e senha do banco (feito antes do go-live)"),
        bullet("[ ] Configurar variáveis de ambiente no servidor de produção (Vercel/Netlify)"),
        bullet("[ ] Build de produção: npm run build"),
        bullet("[ ] Smoke test em produção: login, agendamento, dashboard admin"),
        spacer(),
 
        // ===== APÊNDICE =====
        pageBreak(),
        h1("Apêndice — Referências rápidas"),
        spacer(),
 
        h2("Padrões de query Supabase"),
        spacer(60),
        code("// SELECT simples"),
        code("const { data, error } = await supabase.from('shops').select('*');"),
        code(""),
        code("// SELECT com filtro"),
        code("const { data } = await supabase.from('barbers')"),
        code("  .select('*, services(*)')"),
        code("  .eq('shop_id', shopId)"),
        code("  .eq('is_active', true);"),
        code(""),
        code("// INSERT"),
        code("const { data } = await supabase.from('appointments')"),
        code("  .insert({ barber_id, service_id, date, time, status: 'agendado' })"),
        code("  .select().single();"),
        code(""),
        code("// UPDATE"),
        code("const { data } = await supabase.from('appointments')"),
        code("  .update({ status: 'concluido' })"),
        code("  .eq('id', appointmentId)"),
        code("  .select().single();"),
        code(""),
        code("// DELETE"),
        code("await supabase.from('products').delete().eq('id', productId);"),
        code(""),
        code("// Busca por slug"),
        code("const { data: shop } = await supabase.from('shops')"),
        code("  .select('*, barbers(*, services(*))')"),
        code("  .eq('slug', slug).single();"),
        spacer(),
 
        h2("Variáveis de ambiente"),
        spacer(60),
        new Table({
          width: { size: W, type: WidthType.DXA },
          columnWidths: [3500, 5860],
          rows: [
            new TableRow({ children: [headerCell("Variável", 3500), headerCell("Onde usar / Descrição", 5860)] }),
            ...[
              ["VITE_SUPABASE_URL", "Frontend — URL do projeto Supabase (pública)"],
              ["VITE_SUPABASE_ANON_KEY", "Frontend — chave anônima (pública, segura com RLS)"],
              ["SUPABASE_SERVICE_ROLE_KEY", "NUNCA no frontend — apenas em Edge Functions / servidor"],
              ["ANTHROPIC_API_KEY", "NUNCA no frontend — apenas em Edge Functions"],
              ["VITE_STRIPE_PUBLISHABLE_KEY", "Frontend — chave publicável do Stripe para integração de pagamentos no checkout"],
              ["STRIPE_SECRET_KEY", "Backend / Edge Function — chave secreta do Stripe (privada)"],
              ["STRIPE_WEBHOOK_SECRET", "Backend / Edge Function — segredo de webhook do Stripe para validação de eventos de pagamento"]
            ].map((r, i) => new TableRow({ children: r.map((text, j) => dataCell(text, [3500, 5860][j], i % 2 === 1)) }))
          ]
        })
      ]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Guia_de_Migracao_TrimUp.docx", buffer);
  console.log("Documento de migração gerado com sucesso em 'Guia_de_Migracao_TrimUp.docx'!");
}).catch((err) => {
  console.error("Erro ao gerar o documento:", err);
});
