-- ============================================================
-- CUSTO DE INSUMO POR PERÍODO (substitui rastreio por lote)
-- ============================================================
-- Motivo: carcaça é unidade discreta (1 carcaça = 1 pneu), dá pra
-- contar exato por lote. Mas cola/antiquebra/bexiga/solvente são
-- consumidos aos poucos de um mesmo estoque comprado, sem fronteira
-- clara entre "isso aqui foi do lote 42, isso do lote 43" — na
-- prática, ninguém pesa o quanto de cada insumo entrou em cada
-- lote. Pedir isso no formulário deixava o campo de matéria-prima
-- do lote em branco/chutado, subestimando o custo real do pneu.
--
-- Novo modelo: custo de insumo por pneu = total gasto em matéria-
-- prima NO MÊS / total de pneus produzidos NO MESMO MÊS. Isso é
-- aplicado a cada pneu daquele mês, somado ao custo exato da
-- carcaça daquele lote (que essa parte continua exata).
-- ============================================================

-- lote_materiais_consumidos nunca teve dado real (só teste, já
-- removido) e deixa de ser usado — as views novas não dependem
-- mais dele.
DROP TABLE IF EXISTS lote_materiais_consumidos;

-- ------------------------------------------------------------
-- Custo médio de insumo por pneu, por mês
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW custo_insumo_medio_mensal
WITH (security_invoker = true) AS
WITH compras AS (
  SELECT DATE_TRUNC('month', data_compra)::date AS mes, SUM(valor_total) AS total_compras
  FROM entrada_materia_prima
  GROUP BY 1
),
producao AS (
  SELECT DATE_TRUNC('month', data_producao)::date AS mes, SUM(quantidade_produzida) AS total_produzido
  FROM lotes_producao
  GROUP BY 1
)
SELECT
  COALESCE(c.mes, p.mes) AS mes,
  COALESCE(c.total_compras, 0) AS total_compras_insumo,
  COALESCE(p.total_produzido, 0) AS total_produzido,
  ROUND(COALESCE(c.total_compras, 0) / NULLIF(p.total_produzido, 0), 2) AS custo_insumo_por_pneu
FROM compras c
FULL OUTER JOIN producao p ON p.mes = c.mes
ORDER BY 1 DESC;

-- ------------------------------------------------------------
-- Custo por lote: carcaça exata do lote + média de insumo do mês
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW resumo_lotes_producao
WITH (security_invoker = true) AS
SELECT
  lp.id AS lote_id,
  lp.data_producao,
  lp.medida,
  lp.quantidade_carcacas_usadas,
  lp.quantidade_produzida,
  (lp.quantidade_carcacas_usadas - lp.quantidade_produzida) AS quantidade_refugo,
  lp.custo_unitario_carcaca,
  lp.custo_carcacas,
  COALESCE(cim.custo_insumo_por_pneu, 0) AS custo_insumo_por_pneu,
  ROUND(lp.quantidade_produzida * COALESCE(cim.custo_insumo_por_pneu, 0), 2) AS custo_materiais,
  ROUND(lp.custo_carcacas + lp.quantidade_produzida * COALESCE(cim.custo_insumo_por_pneu, 0), 2) AS custo_total,
  ROUND(lp.custo_unitario_carcaca + COALESCE(cim.custo_insumo_por_pneu, 0), 2) AS custo_por_pneu,
  lp.loja_destino_id,
  l.nome AS loja_destino_nome
FROM lotes_producao lp
LEFT JOIN lojas l ON l.id = lp.loja_destino_id
LEFT JOIN custo_insumo_medio_mensal cim ON cim.mes = DATE_TRUNC('month', lp.data_producao)::date
ORDER BY lp.data_producao DESC, lp.id DESC;

-- ------------------------------------------------------------
-- Resumo mensal: custo de insumo agora vem das compras reais do
-- mês (entrada_materia_prima), não mais do que foi digitado por
-- lote.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW resumo_producao_mensal
WITH (security_invoker = true) AS
WITH prod AS (
  SELECT
    DATE_TRUNC('month', data_producao)::date AS mes,
    SUM(quantidade_produzida) AS total_produzido,
    SUM(quantidade_carcacas_usadas - quantidade_produzida) AS total_refugo,
    SUM(custo_carcacas) AS total_custo_carcacas
  FROM lotes_producao
  GROUP BY 1
),
mat AS (
  SELECT DATE_TRUNC('month', data_compra)::date AS mes, SUM(valor_total) AS total_custo_materiais
  FROM entrada_materia_prima
  GROUP BY 1
)
SELECT
  COALESCE(prod.mes, mat.mes) AS mes,
  COALESCE(prod.total_produzido, 0) AS total_produzido,
  COALESCE(prod.total_refugo, 0) AS total_refugo,
  COALESCE(prod.total_custo_carcacas, 0) AS total_custo_carcacas,
  COALESCE(mat.total_custo_materiais, 0) AS total_custo_materiais,
  COALESCE(prod.total_custo_carcacas, 0) + COALESCE(mat.total_custo_materiais, 0) AS total_investido,
  ROUND(
    (COALESCE(prod.total_custo_carcacas, 0) + COALESCE(mat.total_custo_materiais, 0)) / NULLIF(prod.total_produzido, 0),
    2
  ) AS custo_medio_por_pneu
FROM prod
FULL OUTER JOIN mat ON mat.mes = prod.mes
ORDER BY 1 DESC;
