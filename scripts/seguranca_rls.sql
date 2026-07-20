-- ============================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS) PARA AS TABELAS DE NEGÓCIO
-- ============================================================
--
-- POR QUE ISSO EXISTE
-- O app usa a chave "anon" do Supabase direto no navegador. O controle de
-- quem pode ver o quê (ex: um vendedor só ver suas próprias vendas) hoje é
-- feito só no código do front-end (filtro na query). Sem RLS habilitado nas
-- tabelas, qualquer usuário autenticado pode, via DevTools ou uma chamada
-- direta à API do Supabase, ignorar esse filtro e ler/editar dados de outras
-- lojas, vendedores ou o financeiro inteiro. Este script fecha essa brecha
-- no próprio banco, que é a camada que realmente importa.
--
-- PRÉ-REQUISITOS
-- 1. Rode supabase/schema.sql primeiro (ou pelo menos garanta que as colunas
--    colaboradores.email / colaboradores.is_admin e a tabela estoque_lojas
--    já existem — este script depende delas).
-- 2. Todo colaborador que faz login precisa ter o campo "email" preenchido
--    em colaboradores, igual ao e-mail usado no Supabase Auth. Sem isso, a
--    pessoa perde acesso a tudo depois de rodar este script.
--
-- COMO TESTAR ANTES DE CONFIAR
-- Depois de rodar, faça login como admin e como um vendedor comum e navegue
-- por todas as telas (vendas, produtos, clientes, financeiro, remessas,
-- colaboradores) antes de considerar concluído. Se algo quebrar, o policy
-- responsável aparece na mensagem de erro do Supabase ("new row violates
-- row-level security policy ..." ou similar).
--
-- Recomendado rodar fora do horário de pico, já que muda controle de acesso
-- de um sistema em produção.
-- ============================================================


-- ------------------------------------------------------------
-- Funções auxiliares (rodam com privilégio do dono/postgres via
-- SECURITY DEFINER, para poder ler colaboradores mesmo depois de
-- a própria tabela colaboradores ganhar RLS)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION sou_colaborador_ativo()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM colaboradores
    WHERE email IS NOT NULL
      AND lower(email) = lower(auth.email())
      AND ativo = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION eh_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM colaboradores
    WHERE email IS NOT NULL
      AND lower(email) = lower(auth.email())
      AND ativo = TRUE
      AND is_admin = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION meu_colaborador_id()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM colaboradores
  WHERE email IS NOT NULL
    AND lower(email) = lower(auth.email())
    AND ativo = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION sou_colaborador_ativo() TO authenticated;
GRANT EXECUTE ON FUNCTION eh_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION meu_colaborador_id() TO authenticated;

-- O Supabase concede EXECUTE a "anon" e "authenticated" por padrão em toda
-- função nova do schema public (é assim que o PostgREST expõe RPCs). Isso
-- significa que, sem o REVOKE abaixo, qualquer pessoa SEM LOGIN (role anon)
-- conseguiria chamar essas funções via /rest/v1/rpc/... Revogamos de anon
-- e mantemos só para authenticated.
REVOKE EXECUTE ON FUNCTION sou_colaborador_ativo() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION eh_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION meu_colaborador_id() FROM PUBLIC, anon;


-- ------------------------------------------------------------
-- Tabelas de catálogo/operacional: acesso liberado para qualquer
-- colaborador ativo (admin ou vendedor). Reflete o comportamento
-- atual do app, que não restringe essas telas por loja/cargo.
-- ------------------------------------------------------------
DO $$
DECLARE
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'lojas', 'clientes', 'fornecedores', 'fabricantes', 'produtos',
    'modelos_veiculos', 'veiculos', 'contas_financeiro',
    'movimentacao_estoque', 'estoque_lojas', 'remessas', 'remessas_itens'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "staff_acesso_total" ON %I', tabela);
    EXECUTE format(
      'CREATE POLICY "staff_acesso_total" ON %I FOR ALL TO authenticated USING (sou_colaborador_ativo()) WITH CHECK (sou_colaborador_ativo())',
      tabela
    );
  END LOOP;
END $$;


-- ------------------------------------------------------------
-- Colaboradores: qualquer colaborador ativo pode ver a lista (é o
-- diretório de quem trabalha na loja), mas só admin pode criar,
-- editar ou excluir. Isso fecha uma brecha real: hoje, sem RLS,
-- um vendedor poderia chamar a API diretamente e setar is_admin =
-- true para si mesmo.
--
-- Atenção: a tela de Colaboradores hoje deixa qualquer usuário
-- clicar em "Editar" em qualquer colega (só esconde os campos
-- email/is_admin/notificar_vendas se não for admin). Depois deste
-- script, um não-admin não vai mais conseguir salvar nem esses
-- campos "básicos" (nome, função, telefone, comissão) de outro
-- colaborador — só um admin poderá. Se isso for necessário para o
-- fluxo de vocês, avise para ajustarmos a policy.
-- ------------------------------------------------------------
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colaboradores_select" ON colaboradores;
CREATE POLICY "colaboradores_select" ON colaboradores
  FOR SELECT TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "colaboradores_admin_insert" ON colaboradores;
CREATE POLICY "colaboradores_admin_insert" ON colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (eh_admin());

DROP POLICY IF EXISTS "colaboradores_admin_update" ON colaboradores;
CREATE POLICY "colaboradores_admin_update" ON colaboradores
  FOR UPDATE TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

DROP POLICY IF EXISTS "colaboradores_admin_delete" ON colaboradores;
CREATE POLICY "colaboradores_admin_delete" ON colaboradores
  FOR DELETE TO authenticated
  USING (eh_admin());


-- ------------------------------------------------------------
-- Vendas: admin vê/edita/exclui tudo; vendedor só as próprias
-- (por vendedor_id). Qualquer colaborador ativo pode registrar uma
-- venda nova (o formulário permite escolher qualquer vendedor no
-- dropdown, então não travamos o INSERT por vendedor_id = você
-- mesmo — apenas exige ser colaborador ativo).
-- ------------------------------------------------------------
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas_select" ON vendas;
CREATE POLICY "vendas_select" ON vendas
  FOR SELECT TO authenticated
  USING (eh_admin() OR vendedor_id = meu_colaborador_id());

DROP POLICY IF EXISTS "vendas_insert" ON vendas;
CREATE POLICY "vendas_insert" ON vendas
  FOR INSERT TO authenticated
  WITH CHECK (sou_colaborador_ativo());

DROP POLICY IF EXISTS "vendas_update" ON vendas;
CREATE POLICY "vendas_update" ON vendas
  FOR UPDATE TO authenticated
  USING (eh_admin() OR vendedor_id = meu_colaborador_id())
  WITH CHECK (eh_admin() OR vendedor_id = meu_colaborador_id());

DROP POLICY IF EXISTS "vendas_delete" ON vendas;
CREATE POLICY "vendas_delete" ON vendas
  FOR DELETE TO authenticated
  USING (eh_admin() OR vendedor_id = meu_colaborador_id());


-- ------------------------------------------------------------
-- Itens da venda: visibilidade/edição segue a venda "pai".
-- ------------------------------------------------------------
ALTER TABLE vendas_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas_itens_select" ON vendas_itens;
CREATE POLICY "vendas_itens_select" ON vendas_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (eh_admin() OR v.vendedor_id = meu_colaborador_id())
  ));

DROP POLICY IF EXISTS "vendas_itens_insert" ON vendas_itens;
CREATE POLICY "vendas_itens_insert" ON vendas_itens
  FOR INSERT TO authenticated
  WITH CHECK (sou_colaborador_ativo());

DROP POLICY IF EXISTS "vendas_itens_update" ON vendas_itens;
CREATE POLICY "vendas_itens_update" ON vendas_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (eh_admin() OR v.vendedor_id = meu_colaborador_id())
  ))
  WITH CHECK (sou_colaborador_ativo());

DROP POLICY IF EXISTS "vendas_itens_delete" ON vendas_itens;
CREATE POLICY "vendas_itens_delete" ON vendas_itens
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = vendas_itens.venda_id
      AND (eh_admin() OR v.vendedor_id = meu_colaborador_id())
  ));


-- ------------------------------------------------------------
-- Notificações e push_subscriptions já tinham RLS habilitado, mas
-- com "USING (true)" — ou seja, qualquer usuário autenticado no
-- projeto Supabase (não necessariamente um colaborador cadastrado)
-- tinha acesso total. Restringindo a colaboradores ativos.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários autenticados podem ver notificações" ON notificacoes;
CREATE POLICY "Usuários autenticados podem ver notificações"
  ON notificacoes FOR SELECT TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "Usuários autenticados podem criar notificações" ON notificacoes;
CREATE POLICY "Usuários autenticados podem criar notificações"
  ON notificacoes FOR INSERT TO authenticated
  WITH CHECK (sou_colaborador_ativo());

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar notificações" ON notificacoes;
CREATE POLICY "Usuários autenticados podem atualizar notificações"
  ON notificacoes FOR UPDATE TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "Usuários autenticados podem excluir notificações" ON notificacoes;
CREATE POLICY "Usuários autenticados podem excluir notificações"
  ON notificacoes FOR DELETE TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar suas inscrições push" ON push_subscriptions;
CREATE POLICY "Usuários autenticados podem gerenciar suas inscrições push"
  ON push_subscriptions FOR ALL TO authenticated
  USING (sou_colaborador_ativo())
  WITH CHECK (sou_colaborador_ativo());


-- ------------------------------------------------------------
-- Blinda a função ajustar_estoque (criada em supabase/schema.sql /
-- scripts/atualizar_estoque_e_funcao.sql) agora que sou_colaborador_ativo()
-- já existe: recusa a chamada se quem estiver logado não for um
-- colaborador ativo, e revoga a execução de "anon" (sem login) pelo
-- mesmo motivo explicado acima.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION ajustar_estoque(
  p_produto_id INTEGER,
  p_loja_id INTEGER,
  p_delta DECIMAL(10,2),
  p_tipo VARCHAR(10) DEFAULT NULL,
  p_motivo VARCHAR(200) DEFAULT NULL,
  p_referencia_id INTEGER DEFAULT NULL
) RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova_quantidade DECIMAL(10,2);
BEGIN
  IF NOT sou_colaborador_ativo() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é um colaborador ativo';
  END IF;

  INSERT INTO estoque_lojas (produto_id, loja_id, quantidade, updated_at)
  VALUES (p_produto_id, p_loja_id, GREATEST(0, p_delta), NOW())
  ON CONFLICT (produto_id, loja_id)
  DO UPDATE SET
    quantidade = GREATEST(0, estoque_lojas.quantidade + p_delta),
    updated_at = NOW()
  RETURNING quantidade INTO v_nova_quantidade;

  IF p_tipo IS NOT NULL THEN
    INSERT INTO movimentacao_estoque (produto_id, loja_id, tipo, quantidade, motivo, referencia_id)
    VALUES (p_produto_id, p_loja_id, p_tipo, ABS(p_delta), p_motivo, p_referencia_id);
  END IF;

  RETURN v_nova_quantidade;
END;
$$;

GRANT EXECUTE ON FUNCTION ajustar_estoque(INTEGER, INTEGER, DECIMAL, VARCHAR, VARCHAR, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION ajustar_estoque(INTEGER, INTEGER, DECIMAL, VARCHAR, VARCHAR, INTEGER) FROM PUBLIC, anon;
