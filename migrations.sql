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
CREATE POLICY "Proprietário edita loja" ON public.shops FOR UPDATE USING (
  owner_id = public.my_profile_id() 
  OR public.is_shop_member(id, 'owner') 
  OR public.is_shop_member(id, 'admin') 
  OR public.has_role('siteowner')
);

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

-- ====================================================================
-- RECRIAÇÃO DAS FUNÇÕES DE GATILHO (TRIGGERS) COM ROLES EM MINÚSCULO
-- ====================================================================

-- 1. Função: handle_new_user (Cadastro de usuários)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.profile_roles (profile_id, role)
  VALUES (v_profile_id, 'user');

  INSERT INTO public.profile_preferences (profile_id)
  VALUES (v_profile_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função: handle_new_shop (Registra proprietário após criar uma barbearia)
CREATE OR REPLACE FUNCTION public.handle_new_shop()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.shop_memberships (shop_id, profile_id, role)
  VALUES (new.id, new.owner_id, 'owner');

  INSERT INTO public.profile_roles (profile_id, role)
  VALUES (new.owner_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função: handle_barber_link_acceptance (Aceite de vinculação de barbeiro)
CREATE OR REPLACE FUNCTION public.handle_barber_link_acceptance()
RETURNS trigger AS $$
BEGIN
  IF new.status = 'accepted' AND old.status <> 'accepted' THEN
    INSERT INTO public.shop_memberships (shop_id, profile_id, role)
    VALUES (new.shop_id, new.profile_id, 'barber')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.profile_roles (profile_id, role)
    VALUES (new.profile_id, 'barber')
    ON CONFLICT DO NOTHING;

    IF new.barber_id IS NOT NULL THEN
      UPDATE public.barbers
      SET profile_id = new.profile_id, is_active = true, shop_id = new.shop_id
      WHERE id = new.barber_id;
    END IF;

    INSERT INTO public.barber_link_history (shop_id, profile_id, barber_id, action, notes)
    VALUES (new.shop_id, new.profile_id, new.barber_id, 'accepted', new.notes);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================================
-- POLÍTICAS RLS PARA SISTEMA DE VÍNCULOS
-- ====================================================================

-- Habilitar RLS nas tabelas se não estiverem
ALTER TABLE public.barber_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_unlink_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_link_history ENABLE ROW LEVEL SECURITY;

-- Políticas para barber_link_requests
DROP POLICY IF EXISTS "Usuário autenticado cria solicitações própria" ON public.barber_link_requests;
CREATE POLICY "Usuário autenticado cria solicitações própria" 
ON public.barber_link_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (profile_id = public.my_profile_id());

DROP POLICY IF EXISTS "Leitura de solicitações de vínculo" ON public.barber_link_requests;
CREATE POLICY "Leitura de solicitações de vínculo" 
ON public.barber_link_requests 
FOR SELECT 
USING (
  profile_id = public.my_profile_id() 
  OR public.is_shop_member(shop_id, 'owner') 
  OR public.is_shop_member(shop_id, 'admin') 
  OR public.has_role('siteowner')
);

DROP POLICY IF EXISTS "Gestão de solicitações de vínculo" ON public.barber_link_requests;
CREATE POLICY "Gestão de solicitações de vínculo" 
ON public.barber_link_requests 
FOR ALL 
USING (
  public.is_shop_member(shop_id, 'owner') 
  OR public.is_shop_member(shop_id, 'admin') 
  OR public.has_role('siteowner')
);

-- Políticas para barber_unlink_requests
DROP POLICY IF EXISTS "Criação de desvinculações" ON public.barber_unlink_requests;
CREATE POLICY "Criação de desvinculações" 
ON public.barber_unlink_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (requested_by = public.my_profile_id());

DROP POLICY IF EXISTS "Leitura de desvinculações" ON public.barber_unlink_requests;
CREATE POLICY "Leitura de desvinculações" 
ON public.barber_unlink_requests 
FOR SELECT 
USING (
  requested_by = public.my_profile_id() 
  OR public.is_shop_member(shop_id, 'owner') 
  OR public.is_shop_member(shop_id, 'admin') 
  OR public.has_role('siteowner')
);

DROP POLICY IF EXISTS "Gestão de desvinculações" ON public.barber_unlink_requests;
CREATE POLICY "Gestão de desvinculações" 
ON public.barber_unlink_requests 
FOR ALL 
USING (
  public.is_shop_member(shop_id, 'owner') 
  OR public.is_shop_member(shop_id, 'admin') 
  OR public.has_role('siteowner')
);

-- Políticas para barber_link_history
DROP POLICY IF EXISTS "Leitura do histórico de vínculos" ON public.barber_link_history;
CREATE POLICY "Leitura do histórico de vínculos" 
ON public.barber_link_history 
FOR SELECT 
USING (
  profile_id = public.my_profile_id() 
  OR public.is_shop_member(shop_id, 'owner') 
  OR public.is_shop_member(shop_id, 'admin') 
  OR public.is_shop_member(shop_id, 'barber') 
  OR public.has_role('siteowner')
);

DROP POLICY IF EXISTS "Inserção do histórico de vínculos pelo sistema" ON public.barber_link_history;
CREATE POLICY "Inserção do histórico de vínculos pelo sistema" 
ON public.barber_link_history 
FOR INSERT 
TO authenticated 
WITH CHECK (true);


