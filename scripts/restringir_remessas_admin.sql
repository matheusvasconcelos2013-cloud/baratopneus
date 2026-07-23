-- ============================================================
-- RESTRINGE REMESSAS A ADMIN
-- ============================================================
-- scripts/seguranca_rls.sql colocou "remessas" e "remessas_itens" no
-- loop de tabelas operacionais (policy "staff_acesso_total"), que dá
-- acesso total a qualquer colaborador ativo — vendedor incluso. Isso
-- sobrescreve essa policy só nessas duas tabelas para restringir a
-- admin, acompanhando a mudança feita no front-end (aba Remessas
-- some do menu e a página redireciona não-admin para /vendas).
-- ============================================================

DROP POLICY IF EXISTS "staff_acesso_total" ON remessas;
CREATE POLICY "remessas_admin_all" ON remessas
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

DROP POLICY IF EXISTS "staff_acesso_total" ON remessas_itens;
CREATE POLICY "remessas_itens_admin_all" ON remessas_itens
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());
