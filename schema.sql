-- ======================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - TRIMUP BARBER HUB
-- ======================================================

-- Habilitar extensão pgcrypto para uuid_generate_v4 se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela: roles
CREATE TABLE public.roles (
    name text PRIMARY KEY,
    description text
);

-- 2. Tabela: notification_types
CREATE TABLE public.notification_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Tabela: profiles (Extensão da auth.users)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    avatar_url text,
    email text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Tabela: profile_roles
CREATE TABLE public.profile_roles (
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text REFERENCES public.roles(name) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, role)
);

-- 5. Tabela: profile_preferences
CREATE TABLE public.profile_preferences (
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    receive_notifications boolean DEFAULT true,
    theme text DEFAULT 'light',
    created_at timestamp with time zone DEFAULT now()
);

-- 6. Tabela: notification_preferences
CREATE TABLE public.notification_preferences (
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type_id uuid REFERENCES public.notification_types(id) ON DELETE CASCADE,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT true,
    whatsapp_enabled boolean DEFAULT true,
    PRIMARY KEY (profile_id, notification_type_id)
);

-- 7. Tabela: plans
CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    monthly_price numeric(10, 2) NOT NULL,
    annual_price numeric(10, 2) NOT NULL,
    trial_days integer DEFAULT 0,
    max_barbers integer DEFAULT 1,
    max_clients integer DEFAULT 100,
    max_units integer DEFAULT 1,
    features text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. Tabela: shops (Tenants)
CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    logo text,
    banner text,
    colors jsonb DEFAULT '{}',
    address text,
    lat numeric(9, 6),
    lng numeric(9, 6),
    rating numeric(3, 2) DEFAULT 5.0,
    plan_id uuid REFERENCES public.plans(id),
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    specialties text[] DEFAULT '{}',
    working_hours jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- 9. Tabela: shop_memberships (Multi-tenant permissions)
CREATE TABLE public.shop_memberships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'barber')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (shop_id, profile_id, role)
);

-- 10. Tabela: subscriptions
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES public.plans(id) ON DELETE RESTRICT,
    status text NOT NULL, -- e.g., 'active', 'trialing', 'canceled'
    start_date date NOT NULL DEFAULT current_date,
    end_date date,
    renewal_date date,
    monthly_value numeric(10, 2) NOT NULL,
    auto_renew boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. Tabela: barbers
CREATE TABLE public.barbers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    photo text,
    bio text,
    specialties text[] DEFAULT '{}',
    rating numeric(3, 2) DEFAULT 5.0,
    is_active boolean DEFAULT true,
    working_hours jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- 12. Tabela: barber_link_requests
CREATE TABLE public.barber_link_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 13. Tabela: barber_link_history
CREATE TABLE public.barber_link_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'requested', 'accepted', 'rejected', 'unlinked'
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 14. Tabela: barber_unlink_requests
CREATE TABLE public.barber_unlink_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES public.profiles(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- 15. Tabela: services
CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10, 2) NOT NULL,
    duration_minutes integer NOT NULL,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 16. Tabela: products
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(10, 2) NOT NULL,
    image text,
    category text,
    stock integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 17. Tabela: client_records (CRM)
CREATE TABLE public.client_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    whatsapp text,
    email text,
    address text,
    city text,
    cep text,
    notes text,
    is_vip boolean DEFAULT false,
    source text, -- 'manual', 'marketplace'
    total_visits integer DEFAULT 0,
    total_spent numeric(10, 2) DEFAULT 0.00,
    avg_ticket numeric(10, 2) DEFAULT 0.00,
    last_visit timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (shop_id, profile_id)
);

-- 18. Tabela: appointments
CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id uuid REFERENCES public.barbers(id) ON DELETE RESTRICT,
    client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
    date date NOT NULL,
    time text NOT NULL,
    status text NOT NULL DEFAULT 'agendado', -- 'agendado', 'confirmado', 'cancelado', 'concluido'
    price numeric(10, 2) NOT NULL,
    notes text,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    review text,
    created_at timestamp with time zone DEFAULT now()
);

-- 19. Tabela: appointment_status_history
CREATE TABLE public.appointment_status_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    status text NOT NULL,
    changed_by uuid REFERENCES public.profiles(id),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 20. Tabela: notifications
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type_id uuid REFERENCES public.notification_types(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 21. Tabela: notification_deliveries
CREATE TABLE public.notification_deliveries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'whatsapp')),
    status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    error_message text,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 22. Tabela: geocode_cache
CREATE TABLE public.geocode_cache (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    address text UNIQUE NOT NULL,
    lat numeric(9, 6) NOT NULL,
    lng numeric(9, 6) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 23. Tabela: client_record_geography
CREATE TABLE public.client_record_geography (
    client_record_id uuid REFERENCES public.client_records(id) ON DELETE CASCADE PRIMARY KEY,
    lat numeric(9, 6) NOT NULL,
    lng numeric(9, 6) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 24. Tabela: shop_geography_stats
CREATE TABLE public.shop_geography_stats (
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE PRIMARY KEY,
    total_geocoded_clients integer DEFAULT 0,
    last_calculated_at timestamp with time zone DEFAULT now()
);

-- 25. Tabela: geocode_jobs
CREATE TABLE public.geocode_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    records_processed integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

-- ======================================================
-- RLS FUNCTIONS HELPERS (POLICIES ACCESS CONTROLS)
-- ======================================================

CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS uuid AS $$
  SELECT id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_shop_member(p_shop_id uuid, p_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_memberships
    WHERE shop_id = p_shop_id
      AND profile_id = public.my_profile_id()
      AND role = p_role
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(p_role text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_roles pr
    WHERE pr.profile_id = public.my_profile_id() AND pr.role = p_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ======================================================
-- TRIGGERS E AUTOMATIZAÇÕES (FUNCTIONS E TRIGGERS)
-- ======================================================

-- Trigger 1: on_auth_user_created (Executa no cadastro de novos usuários)
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger 2: on_shop_created (Registra proprietário após criar uma barbearia)
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

CREATE TRIGGER on_shop_created
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_shop();


-- Trigger 3: on_barber_link_accepted (Dispara no aceite de vinculação de barbeiro)
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

CREATE TRIGGER on_barber_link_accepted
  AFTER UPDATE ON public.barber_link_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_barber_link_acceptance();


-- Trigger 4: update_client_metrics_on_complete (Recalcula visitas/gastos do cliente)
CREATE OR REPLACE FUNCTION public.handle_appointment_completion()
RETURNS trigger AS $$
DECLARE
  v_client_record_id uuid;
  v_total_visits integer;
  v_total_spent numeric(10,2);
  v_avg_ticket numeric(10,2);
BEGIN
  IF new.status = 'concluido' AND (old.status IS NULL OR old.status <> 'concluido') THEN
    SELECT id INTO v_client_record_id
    FROM public.client_records
    WHERE shop_id = new.shop_id AND profile_id = new.client_id;

    IF v_client_record_id IS NULL THEN
      INSERT INTO public.client_records (shop_id, profile_id, name, phone, email, source)
      SELECT
        new.shop_id,
        new.client_id,
        p.full_name,
        p.phone,
        p.email,
        'marketplace'
      FROM public.profiles p
      WHERE p.id = new.client_id
      RETURNING id INTO v_client_record_id;
    END IF;

    SELECT count(*), coalesce(sum(price), 0.00)
    INTO v_total_visits, v_total_spent
    FROM public.appointments
    WHERE shop_id = new.shop_id AND client_id = new.client_id AND status = 'concluido';

    IF v_total_visits > 0 THEN
      v_avg_ticket := v_total_spent / v_total_visits;
    ELSE
      v_avg_ticket := 0.00;
    END IF;

    UPDATE public.client_records
    SET
      total_visits = v_total_visits,
      total_spent = v_total_spent,
      avg_ticket = v_avg_ticket,
      last_visit = new.date::timestamp + new.time::interval
    WHERE id = v_client_record_id;

  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_client_metrics_on_complete
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_completion();


-- Trigger 5: check_appointment_conflict (Previne conflitos de horário no mesmo barbeiro)
CREATE OR REPLACE FUNCTION public.check_appointment_time_conflict()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE barber_id = new.barber_id
      AND date = new.date
      AND time = new.time
      AND id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status <> 'cancelado'
  ) THEN
    RAISE EXCEPTION 'Horário indisponível para este barbeiro.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_appointment_conflict
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_time_conflict();

-- ======================================================
-- POLÍTICAS DE SEGURANÇA POR LINHA (RLS - ROW LEVEL SECURITY)
-- ======================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Exemplo de Políticas RLS Básicas (Podem ser refinadas no Dashboard)

-- Profiles
CREATE POLICY "Qualquer um vê perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Profile Roles
CREATE POLICY "Leitura de roles própria" ON public.profile_roles FOR SELECT USING (true);
CREATE POLICY "Apenas SITEOWNER cria/edita roles" ON public.profile_roles FOR ALL USING (public.has_role('siteowner'));

-- Plans
CREATE POLICY "Qualquer um vê planos" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Apenas SITEOWNER edita planos" ON public.plans FOR ALL USING (public.has_role('siteowner'));

-- Shops
CREATE POLICY "Qualquer um vê lojas" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Qualquer usuário logado cria loja" ON public.shops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Proprietário edita loja" ON public.shops FOR UPDATE USING (
  owner_id = public.my_profile_id() 
  OR public.is_shop_member(id, 'owner') 
  OR public.is_shop_member(id, 'admin') 
  OR public.has_role('siteowner')
);

-- Shop Memberships
CREATE POLICY "Membros veem membros" ON public.shop_memberships FOR SELECT USING (true);
CREATE POLICY "Apenas proprietário edita membros" ON public.shop_memberships FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.has_role('siteowner'));

-- Subscriptions
CREATE POLICY "Proprietários da loja veem assinatura" ON public.subscriptions FOR SELECT USING (public.is_shop_member(shop_id, 'owner') OR public.has_role('siteowner'));

-- Barbers
CREATE POLICY "Qualquer um vê barbeiros" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "Dono ou Admin edita barbeiros" ON public.barbers FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));
CREATE POLICY "Usuário cria próprio perfil de barbeiro" ON public.barbers FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Usuário edita próprio perfil de barbeiro" ON public.barbers FOR UPDATE USING (profile_id = public.my_profile_id());

-- Services
CREATE POLICY "Qualquer um vê serviços" ON public.services FOR SELECT USING (true);
CREATE POLICY "Gestão de serviços" ON public.services FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));

-- Products
CREATE POLICY "Qualquer um vê produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Gestão de produtos" ON public.products FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.has_role('siteowner'));

-- Client Records
CREATE POLICY "Membros da loja veem clientes" ON public.client_records FOR SELECT USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber') OR public.has_role('siteowner'));
CREATE POLICY "Gestão de fichas de clientes" ON public.client_records FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber') OR public.has_role('siteowner'));
CREATE POLICY "Usuário gerencia próprio registro de cliente" ON public.client_records FOR ALL USING (profile_id = public.my_profile_id());

-- Appointments
CREATE POLICY "Usuário vê próprios agendamentos" ON public.appointments FOR SELECT USING (client_id = public.my_profile_id());
CREATE POLICY "Membros da loja veem agendamentos da loja" ON public.appointments FOR SELECT USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber'));
CREATE POLICY "Clientes inserem agendamento próprio" ON public.appointments FOR INSERT WITH CHECK (client_id = public.my_profile_id());
CREATE POLICY "Dono/Admin agenda na loja" ON public.appointments FOR INSERT WITH CHECK (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin'));
CREATE POLICY "Cancelamento ou conclusão de agendamentos" ON public.appointments FOR UPDATE USING (client_id = public.my_profile_id() OR public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber'));

-- Notifications
CREATE POLICY "Usuário vê próprias notificações" ON public.notifications FOR SELECT USING (profile_id = public.my_profile_id());
CREATE POLICY "Autenticados inserem notificações" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuário atualiza próprias notificações" ON public.notifications FOR UPDATE USING (profile_id = public.my_profile_id());

-- Storage/Bucket 'uploads'
-- 0. Garantir a existência do bucket 'uploads' público
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Autenticados fazem upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Leitura pública dos uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Dono pode deletar upload" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Dono pode atualizar upload" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ======================================================
-- SEEDS INICIAIS (DADOS INICIAIS)
-- ======================================================

-- Seeds de roles
INSERT INTO public.roles (name, description) VALUES
('user', 'Papel de cliente padrão, pode realizar agendamentos e ver perfis públicos.'),
('barber', 'Papel de barbeiro, visualiza sua agenda, atendimentos e clientes da barbearia.'),
('admin', 'Administrador/Dono da barbearia, gerencia equipe, produtos, serviços e configurações da loja.'),
('siteowner', 'Administrador global do SaaS, gerencia planos, assinaturas e visualiza métricas globais.')
ON CONFLICT (name) DO NOTHING;

-- Seeds de tipos de notificações
INSERT INTO public.notification_types (name, description) VALUES
('appointment_reminders', 'Lembretes de agendamentos agendados, alterados ou concluídos.'),
('marketing', 'Campanhas promocionais, cupons e novidades.'),
('system', 'Alertas gerais sobre a plataforma e conta.')
ON CONFLICT (name) DO NOTHING;
