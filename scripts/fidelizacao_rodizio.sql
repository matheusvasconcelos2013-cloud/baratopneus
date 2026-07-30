-- ============================================================
-- FIDELIZAÇÃO — RODÍZIO DE CORTESIA (Clube Barato Pneus)
-- ============================================================
-- Aba "Fidelização". Traz de volta à loja quem comprou pneu há
-- alguns meses, oferecendo rodízio + calibragem de cortesia. O
-- rodízio é a isca: o faturamento vem do balanceamento, do
-- alinhamento e principalmente da venda dos outros 2 pneus, que
-- nessa altura já estão no fim da vida.
--
-- PRÉ-REQUISITO: scripts/seguranca_rls.sql aplicado (eh_admin(),
-- sou_colaborador_ativo()).
-- ============================================================

-- ------------------------------------------------------------
-- 1. REGISTRO DE CONTATOS
-- ------------------------------------------------------------
-- Uma linha por cliente contatado. venda_origem_id é a compra que
-- gerou o contato (evita contatar duas vezes pela mesma compra);
-- venda_gerada_id/valor_gerado é o retorno da visita —
-- sem eles não dá pra saber se o programa se paga.
CREATE TABLE IF NOT EXISTS fidelizacao_contatos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  venda_origem_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  data_contato DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Contatado'
    CHECK (status IN ('Contatado', 'Agendado', 'Compareceu', 'Nao respondeu', 'Recusou')),
  data_agendada DATE,
  venda_gerada_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  valor_gerado DECIMAL(10,2) DEFAULT 0,
  observacao TEXT,
  criado_por INTEGER REFERENCES colaboradores(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- No máximo um contato por compra de origem: a tela atualiza o
-- status do contato existente em vez de criar linhas duplicadas
-- quando o vendedor muda "Contatado" -> "Agendado" -> "Compareceu".
CREATE UNIQUE INDEX IF NOT EXISTS ux_fidelizacao_venda_origem
  ON fidelizacao_contatos(venda_origem_id)
  WHERE venda_origem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fidelizacao_cliente ON fidelizacao_contatos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fidelizacao_data ON fidelizacao_contatos(data_contato DESC);

-- criado_por preenchido no banco (mesmo padrão de vendas.criado_por),
-- pra não depender do app mandar o id certo.
CREATE OR REPLACE FUNCTION public.set_fidelizacao_criado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.criado_por := meu_colaborador_id();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fidelizacao_criado_por ON fidelizacao_contatos;
CREATE TRIGGER trg_fidelizacao_criado_por
  BEFORE INSERT ON fidelizacao_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fidelizacao_criado_por();

ALTER TABLE fidelizacao_contatos ENABLE ROW LEVEL SECURITY;

-- Qualquer colaborador ativo trabalha a lista (não é área só de admin,
-- como Produção — quem liga pro cliente é o vendedor da loja).
DROP POLICY IF EXISTS fidelizacao_staff_acesso_total ON fidelizacao_contatos;
CREATE POLICY fidelizacao_staff_acesso_total ON fidelizacao_contatos
  FOR ALL TO authenticated
  USING (sou_colaborador_ativo())
  WITH CHECK (sou_colaborador_ativo());

-- ------------------------------------------------------------
-- 2. VIEW — fila de clientes a contatar
-- ------------------------------------------------------------
-- Janela de 5 a 8 meses desde a ÚLTIMA compra. A janela é larga de
-- propósito na primeira rodada, pra recuperar o passivo de clientes
-- antigos; quem comprou de novo mais recentemente sai da lista
-- sozinho, porque só a última compra é considerada.
--
-- Considera QUALQUER venda finalizada, não só as com pneu no item:
-- o registro de itens por produto começou em 07/2026, então filtrar
-- por produto descartaria toda a base anterior (a fila ia a zero).
-- Como a loja vende essencialmente pneu, a venda inteira serve de
-- proxy. qtd_itens vem nulo nas vendas antigas, sem item lançado.
--
-- ATENÇÃO — esta view é SECURITY DEFINER (sem security_invoker), ao
-- contrário das demais views do sistema. Motivo: vendas tem RLS que
-- limita o vendedor a ver só as próprias vendas (vendas_select), e
-- com security_invoker cada vendedor veria só os clientes que ele
-- mesmo atendeu — a lista da loja ficaria pela metade. Para
-- compensar o bypass de RLS, a view (a) só devolve linha para
-- colaborador ativo, via sou_colaborador_ativo() no WHERE, e
-- (b) não expõe nenhum dado financeiro da venda de origem
-- (valor_total, lucro), apenas data e quantidade de itens.
DROP VIEW IF EXISTS clientes_rodizio_pendente;

CREATE VIEW clientes_rodizio_pendente AS
WITH compras AS (
  SELECT
    v.id AS venda_id,
    v.cliente_id,
    v.loja_id,
    v.data_venda
  FROM vendas v
  WHERE v.situacao = 'Finalizada'
    AND v.cliente_id IS NOT NULL
),
ultima_compra AS (
  SELECT DISTINCT ON (cliente_id) *
  FROM compras
  ORDER BY cliente_id, data_venda DESC, venda_id DESC
)
SELECT
  u.cliente_id,
  c.nome,
  tel.numero AS whatsapp,
  u.venda_id,
  u.loja_id,
  l.nome AS loja_nome,
  u.data_venda,
  it.qtd_itens,
  (CURRENT_DATE - u.data_venda) AS dias_desde_compra,
  ROUND((CURRENT_DATE - u.data_venda) / 30.0, 1) AS meses_desde_compra,
  ve.placa,
  NULLIF(TRIM(CONCAT_WS(' ', ve.marca, ve.modelo)), '') AS veiculo,
  ct.id AS contato_id,
  ct.status AS contato_status,
  ct.data_contato AS contato_data,
  ct.data_agendada AS contato_agendada,
  ct.valor_gerado AS contato_valor_gerado
FROM ultima_compra u
JOIN clientes c ON c.id = u.cliente_id
LEFT JOIN lojas l ON l.id = u.loja_id
-- Primeiro celular utilizável do cadastro. Boa parte da base importada
-- tem placeholder do tipo "(  )     -", que vira string vazia aqui.
CROSS JOIN LATERAL (
  SELECT COALESCE(
    NULLIF(regexp_replace(COALESCE(c.celular, ''), '[^0-9]', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(c.celular2, ''), '[^0-9]', '', 'g'), ''),
    NULLIF(regexp_replace(COALESCE(c.telefone, ''), '[^0-9]', '', 'g'), '')
  ) AS numero
) tel
-- Quantidade de itens da venda, quando ela tem item lançado.
LEFT JOIN LATERAL (
  SELECT SUM(quantidade) AS qtd_itens
  FROM vendas_itens
  WHERE venda_id = u.venda_id
) it ON true
LEFT JOIN LATERAL (
  SELECT placa, marca, modelo
  FROM veiculos
  WHERE cliente_id = c.id
  ORDER BY id DESC
  LIMIT 1
) ve ON true
-- Contato desta compra específica (não do cliente): se o cliente comprou
-- de novo, é um ciclo novo de rodízio e ele volta pra fila como "a contatar".
LEFT JOIN LATERAL (
  SELECT id, status, data_contato, data_agendada, valor_gerado
  FROM fidelizacao_contatos
  WHERE venda_origem_id = u.venda_id
  LIMIT 1
) ct ON true
WHERE sou_colaborador_ativo()
  AND c.status = 'Ativo'
  AND LENGTH(tel.numero) BETWEEN 10 AND 11
  AND u.data_venda BETWEEN CURRENT_DATE - INTERVAL '8 months'
                       AND CURRENT_DATE - INTERVAL '5 months'
ORDER BY u.data_venda;

-- View de SECURITY DEFINER não pode ficar acessível a quem não fez login.
REVOKE ALL ON clientes_rodizio_pendente FROM PUBLIC, anon;
GRANT SELECT ON clientes_rodizio_pendente TO authenticated;
