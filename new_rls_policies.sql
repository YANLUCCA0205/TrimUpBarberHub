-- ==============================================
-- Novas Políticas RLS — TrimUp BarberHub
-- Execute no SQL Editor do Supabase Dashboard
-- ==============================================

-- 1. client_records: Permitir que o próprio usuário gerencie seu registro
CREATE POLICY "Usuário gerencia próprio registro de cliente"
  ON public.client_records
  FOR ALL
  USING (profile_id = public.my_profile_id());

-- 2. barbers: Permitir que o próprio usuário crie seu perfil de barbeiro
CREATE POLICY "Usuário cria próprio perfil de barbeiro"
  ON public.barbers
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- 3. barbers: Permitir que o próprio usuário edite seu perfil de barbeiro
CREATE POLICY "Usuário edita próprio perfil de barbeiro"
  ON public.barbers
  FOR UPDATE
  USING (profile_id = public.my_profile_id());

-- 4. notifications: Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. notifications: Usuário vê próprias notificações
CREATE POLICY "Usuário vê próprias notificações"
  ON public.notifications
  FOR SELECT
  USING (profile_id = public.my_profile_id());

-- 6. notifications: Usuários autenticados podem inserir notificações
CREATE POLICY "Autenticados inserem notificações"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. notifications: Usuário atualiza próprias notificações (marcar como lida)
CREATE POLICY "Usuário atualiza próprias notificações"
  ON public.notifications
  FOR UPDATE
  USING (profile_id = public.my_profile_id());

-- 8. client_records: Permitir que barbeiros gerenciem clientes da loja
CREATE POLICY "Barbeiros gerenciam clientes da loja"
  ON public.client_records
  FOR ALL
  USING (public.is_shop_member(shop_id, 'barber'));
