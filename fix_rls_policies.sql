-- Fix RLS policies: change 'SITEOWNER' to 'siteowner' (lowercase)

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
CREATE POLICY "Gestão de fichas de clientes" ON public.client_records FOR ALL USING (public.is_shop_member(shop_id, 'owner') OR public.is_shop_member(shop_id, 'admin') OR public.is_shop_member(shop_id, 'barber') OR public.has_role('siteowner'));
