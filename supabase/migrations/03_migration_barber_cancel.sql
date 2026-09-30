-- 1. Adicionar coluna max_appointments na tabela public.plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_appointments integer DEFAULT NULL;

-- 2. Criar política de exclusão (DELETE) para barbeiros na tabela public.barbers
DROP POLICY IF EXISTS "Usuário deleta próprio perfil de barbeiro" ON public.barbers;
CREATE POLICY "Usuário deleta próprio perfil de barbeiro" ON public.barbers 
FOR DELETE USING (profile_id = auth.uid());

-- 3. Criar trigger no postgres para limpar a role e memberships após remoção do barbeiro
CREATE OR REPLACE FUNCTION public.handle_barber_deletion()
RETURNS trigger AS $$
BEGIN
  -- Remover role 'barber' da tabela profile_roles
  DELETE FROM public.profile_roles 
  WHERE profile_id = old.profile_id AND role = 'barber';
  
  -- Remover do shop_memberships
  DELETE FROM public.shop_memberships
  WHERE profile_id = old.profile_id AND role = 'barber';

  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_barber_deleted ON public.barbers;
CREATE TRIGGER on_barber_deleted
  AFTER DELETE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_barber_deletion();
