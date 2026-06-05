-- ================================================================
-- MIGRAÇÃO: CPF/CNPJ, LGPD, Campos Faltantes & Unicidade
-- Execute este script no Supabase SQL Editor
-- ================================================================

-- ========================
-- 1. PROFILES — CPF + LGPD
-- ========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_last4 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lgpd_consent boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lgpd_consent_date timestamptz;

-- Índice único para impedir dois perfis com o mesmo CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_hash
  ON public.profiles(cpf_hash) WHERE cpf_hash IS NOT NULL;

-- ========================
-- 2. SHOPS — CNPJ + Campos faltantes + 1 barbearia por dono
-- ========================
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS cnpj_hash text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS cnpj_last4 text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slogan text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#F59E0B';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#1F2937';

-- Índice único para impedir dois shops com o mesmo CNPJ
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_cnpj_hash
  ON public.shops(cnpj_hash) WHERE cnpj_hash IS NOT NULL;

-- IMPORTANTE: 1 barbearia por dono
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_owner_id
  ON public.shops(owner_id) WHERE is_active = true;

-- ========================
-- 3. BARBERS — Campos faltantes
-- ========================
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS career text;

-- ========================
-- 4. CLIENT_RECORDS — Campos faltantes
-- ========================
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS complement text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.client_records ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;

-- ========================
-- 5. TRIGGER: Auto-merge de cliente quando se cadastra no site
-- Se já existe client_record com o mesmo email mas sem profile_id, vincula automaticamente
-- ========================
CREATE OR REPLACE FUNCTION public.auto_merge_client_on_signup()
RETURNS trigger AS $$
BEGIN
  -- Vincula registros manuais de cliente ao novo perfil pelo email
  UPDATE public.client_records
  SET profile_id = NEW.id
  WHERE email = (SELECT email FROM auth.users WHERE id = NEW.id)
    AND profile_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dropar trigger se existir, recriar
DROP TRIGGER IF EXISTS trigger_auto_merge_client ON public.profiles;
CREATE TRIGGER trigger_auto_merge_client
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_merge_client_on_signup();

-- ========================
-- 6. Verificação final
-- ========================
-- Execute este SELECT para confirmar que as colunas foram criadas:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name IN ('profiles', 'shops', 'barbers', 'client_records')
-- AND column_name IN ('cpf_hash', 'cpf_last4', 'lgpd_consent', 'cnpj_hash', 'cnpj_last4', 'whatsapp', 'instagram', 'career', 'street', 'birthday', 'barber_id', 'phone', 'description', 'slogan', 'neighborhood', 'city', 'primary_color', 'secondary_color')
-- ORDER BY table_name, column_name;
