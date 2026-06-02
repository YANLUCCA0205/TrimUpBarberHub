-- ====================================================================
-- SCRIPT DE MIGRAÇÃO DE BANCO DE DADOS - TRIMUP BARBER HUB (OPÇÃO C)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- ====================================================================

-- 1. Alterações na tabela plans (Planos)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS annual_discount numeric(5,2) DEFAULT 0;

-- 2. Alterações na tabela appointments (Agendamentos - campos de cache/desnormalização)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS barber_name text;

-- 3. Alterações na tabela client_records (CRM de Clientes)
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS complement text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS birthday date;

-- 4. Alterações na tabela shops (Barbearias)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slogan text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS secondary_color text;

-- 5. Alterações na tabela products (Produtos)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost numeric(10, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_min integer DEFAULT 0;

-- 6. Alterações na tabela barbers (Barbeiros)
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS career text;

-- 7. Alterações na tabela services (Serviços)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description text;

-- ====================================================================
-- CORREÇÃO DE POLÍTICAS RLS (Alterando de 'SITEOWNER' para 'siteowner')
-- ====================================================================

DROP POLICY IF EXISTS "Proprietário edita loja" ON public.shops;
CREATE POLICY "Proprietário edita loja" ON public.shops FOR UPDATE USING (owner_id = public.my_profile_id() OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Apenas proprietário edita membros" ON public.shop_memberships;
CREATE POLICY "Apenas proprietário edita membros" ON public.shop_memberships FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Proprietários da loja veem assinatura" ON public.subscriptions;
CREATE POLICY "Proprietários da loja veem assinatura" ON public.subscriptions FOR SELECT USING (public.is_shop_member(shop_id, 'owner') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Dono ou Admin edita barbeiros" ON public.barbers;
CREATE POLICY "Dono ou Admin edita barbeiros" ON public.barbers FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Gestão de serviços" ON public.services;
CREATE POLICY "Gestão de serviços" ON public.services FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Gestão de produtos" ON public.products;
CREATE POLICY "Gestão de produtos" ON public.products FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Membros da loja veem clientes" ON public.client_records;
CREATE POLICY "Membros da loja veem clientes" ON public.client_records FOR SELECT USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber') OR public.has_role('siteowner'));

DROP POLICY IF EXISTS "Gestão de fichas de clientes" ON public.client_records;
CREATE POLICY "Gestão de fichas de clientes" ON public.client_records FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));
