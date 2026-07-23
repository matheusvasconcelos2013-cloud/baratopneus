-- ============================================================
-- CONTROLE DE PRODUÇÃO — Carcaças, Matéria-Prima e Lotes
-- ============================================================
-- Objetivo: saber o custo real de cada pneu remold produzido
-- (carcaça + insumos consumidos), não só o total gasto no mês.
--
-- PRÉ-REQUISITOS
-- 1. supabase/schema.sql já aplicado (tabelas fornecedores, lojas,
--    colaboradores, produtos).
-- 2. scripts/seguranca_rls.sql já aplicado (funções eh_admin(),
--    sou_colaborador_ativo(), meu_colaborador_id()) — este script
--    depende delas para as policies abaixo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATÁLOGO DE MATÉRIA-PRIMA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL UNIQUE,
  unidade_padrao VARCHAR(20) NOT NULL, -- Litro, Kg, Unidade, Metro...
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO materiais (nome, unidade_padrao) VALUES
  ('Solvente', 'Litro'),
  ('Cola', 'Litro'),
  ('Antiquebra', 'Kg'),
  ('Lâmina de Raspa', 'Unidade'),
  ('Bexiga', 'Unidade')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------
-- 2. ENTRADA DE CARCAÇAS
-- Segue o padrão de remessas: fornecedor por FK, não texto livre.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrada_carcacas (
  id SERIAL PRIMARY KEY,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  medida VARCHAR(50) NOT NULL,                     -- ex: "175/70 R13"
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  observacao TEXT,
  criado_por INTEGER REFERENCES colaboradores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrada_carcacas_data ON entrada_carcacas (data_compra DESC);
CREATE INDEX IF NOT EXISTS idx_entrada_carcacas_medida ON entrada_carcacas (medida);

-- ------------------------------------------------------------
-- 3. ENTRADA DE COMPRAS DE MATÉRIA-PRIMA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrada_materia_prima (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materiais(id),
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  quantidade_comprada DECIMAL(10,2) NOT NULL CHECK (quantidade_comprada > 0),
  valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0), -- valor por unidade padrão do material
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade_comprada * valor_unitario) STORED,
  observacao TEXT,
  criado_por INTEGER REFERENCES colaboradores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrada_mp_material ON entrada_materia_prima (material_id);
CREATE INDEX IF NOT EXISTS idx_entrada_mp_data ON entrada_materia_prima (data_compra DESC);

-- ------------------------------------------------------------
-- 4. LOTES DE PRODUÇÃO
-- Esta é a peça que faltava no esboço original: sem ela, dá pra
-- saber quanto se gastou no mês, mas não quanto custou CADA pneu.
-- Um lote consome N carcaças de uma medida (a custo médio travado
-- no momento do lançamento, editável) e produz M pneus — M pode
-- ser menor que N por refugo/quebra no processo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lotes_producao (
  id SERIAL PRIMARY KEY,
  data_producao DATE NOT NULL DEFAULT CURRENT_DATE,
  medida VARCHAR(50) NOT NULL,
  quantidade_carcacas_usadas INTEGER NOT NULL CHECK (quantidade_carcacas_usadas > 0),
  custo_unitario_carcaca DECIMAL(10,2) NOT NULL CHECK (custo_unitario_carcaca >= 0),
  custo_carcacas DECIMAL(10,2) GENERATED ALWAYS AS (quantidade_carcacas_usadas * custo_unitario_carcaca) STORED,
  quantidade_produzida INTEGER NOT NULL CHECK (quantidade_produzida >= 0),
  loja_destino_id INTEGER REFERENCES lojas(id), -- loja física para onde vai o pneu pronto (opcional)
  observacao TEXT,
  criado_por INTEGER REFERENCES colaboradores(id),
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (quantidade_produzida <= quantidade_carcacas_usadas)
);

CREATE INDEX IF NOT EXISTS idx_lotes_producao_data ON lotes_producao (data_producao DESC);
CREATE INDEX IF NOT EXISTS idx_lotes_producao_medida ON lotes_producao (medida);

-- ------------------------------------------------------------
-- 5. INSUMOS CONSUMIDOS POR LOTE (N materiais por lote)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lote_materiais_consumidos (
  id SERIAL PRIMARY KEY,
  lote_id INTEGER NOT NULL REFERENCES lotes_producao(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materiais(id),
  quantidade_consumida DECIMAL(10,2) NOT NULL CHECK (quantidade_consumida > 0),
  custo_unitario DECIMAL(10,2) NOT NULL CHECK (custo_unitario >= 0), -- travado no momento do lançamento
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade_consumida * custo_unitario) STORED
);

CREATE INDEX IF NOT EXISTS idx_lote_materiais_lote ON lote_materiais_consumidos (lote_id);

-- ============================================================
-- VIEWS
-- ============================================================

-- Custo médio ponderado de carcaça por medida (sugestão ao lançar um lote).
CREATE OR REPLACE VIEW custo_medio_carcaca_por_medida
WITH (security_invoker = true) AS
SELECT
  medida,
  ROUND(SUM(valor_total) / NULLIF(SUM(quantidade), 0), 2) AS custo_medio_unitario,
  SUM(quantidade) AS total_comprado,
  MAX(data_compra) AS ultima_compra
FROM entrada_carcacas
GROUP BY medida;

-- Último custo pago por cada matéria-prima (sugestão ao lançar consumo).
CREATE OR REPLACE VIEW custo_materia_prima_atual
WITH (security_invoker = true) AS
SELECT DISTINCT ON (m.id)
  m.id AS material_id,
  m.nome,
  m.unidade_padrao,
  e.valor_unitario AS custo_unitario_atual,
  e.data_compra
FROM materiais m
JOIN entrada_materia_prima e ON e.material_id = m.id
ORDER BY m.id, e.data_compra DESC, e.created_at DESC;

-- Custo total e por pneu de cada lote — a resposta direta para
-- "quanto está saindo o meu produto no preço final".
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
  COALESCE(mat.custo_materiais, 0) AS custo_materiais,
  lp.custo_carcacas + COALESCE(mat.custo_materiais, 0) AS custo_total,
  ROUND(
    (lp.custo_carcacas + COALESCE(mat.custo_materiais, 0)) / NULLIF(lp.quantidade_produzida, 0),
    2
  ) AS custo_por_pneu,
  lp.loja_destino_id,
  l.nome AS loja_destino_nome
FROM lotes_producao lp
LEFT JOIN lojas l ON l.id = lp.loja_destino_id
LEFT JOIN (
  SELECT lote_id, SUM(valor_total) AS custo_materiais
  FROM lote_materiais_consumidos
  GROUP BY lote_id
) mat ON mat.lote_id = lp.id
ORDER BY lp.data_producao DESC, lp.id DESC;

-- Resumo mensal: produção total, custo total e custo médio por pneu.
CREATE OR REPLACE VIEW resumo_producao_mensal
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('month', lp.data_producao)::date AS mes,
  SUM(lp.quantidade_produzida) AS total_produzido,
  SUM(lp.quantidade_carcacas_usadas - lp.quantidade_produzida) AS total_refugo,
  SUM(lp.custo_carcacas) AS total_custo_carcacas,
  SUM(COALESCE(mat.custo_materiais, 0)) AS total_custo_materiais,
  SUM(lp.custo_carcacas + COALESCE(mat.custo_materiais, 0)) AS total_investido,
  ROUND(
    SUM(lp.custo_carcacas + COALESCE(mat.custo_materiais, 0)) / NULLIF(SUM(lp.quantidade_produzida), 0),
    2
  ) AS custo_medio_por_pneu
FROM lotes_producao lp
LEFT JOIN (
  SELECT lote_id, SUM(valor_total) AS custo_materiais
  FROM lote_materiais_consumidos
  GROUP BY lote_id
) mat ON mat.lote_id = lp.id
GROUP BY 1
ORDER BY 1 DESC;

-- ============================================================
-- RLS — reusa eh_admin() / sou_colaborador_ativo() de
-- scripts/seguranca_rls.sql. Produção fica restrita a admin,
-- assim como o esboço original pretendia.
-- ============================================================
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_carcacas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_materia_prima ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_materiais_consumidos ENABLE ROW LEVEL SECURITY;

-- Materiais: qualquer colaborador ativo pode ver o catálogo; só admin gerencia.
DROP POLICY IF EXISTS "materiais_select" ON materiais;
CREATE POLICY "materiais_select" ON materiais
  FOR SELECT TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "materiais_admin_all" ON materiais;
CREATE POLICY "materiais_admin_all" ON materiais
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

-- Entrada de carcaças: só admin.
DROP POLICY IF EXISTS "entrada_carcacas_admin_all" ON entrada_carcacas;
CREATE POLICY "entrada_carcacas_admin_all" ON entrada_carcacas
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

-- Entrada de matéria-prima: só admin.
DROP POLICY IF EXISTS "entrada_mp_admin_all" ON entrada_materia_prima;
CREATE POLICY "entrada_mp_admin_all" ON entrada_materia_prima
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

-- Lotes de produção: só admin.
DROP POLICY IF EXISTS "lotes_producao_admin_all" ON lotes_producao;
CREATE POLICY "lotes_producao_admin_all" ON lotes_producao
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

-- Insumos consumidos por lote: só admin.
DROP POLICY IF EXISTS "lote_materiais_admin_all" ON lote_materiais_consumidos;
CREATE POLICY "lote_materiais_admin_all" ON lote_materiais_consumidos
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());
