-- ============================================================
-- PAGAMENTOS E VALES DOS FUNCIONÁRIOS DA FÁBRICA
-- ============================================================
-- Aba "Funcionários" dentro de Produção. Registra pagamentos e
-- vales adiantados aos funcionários da fábrica (Igor, Gordinho,
-- Vinicius, Alemão) com data e valor de cada lançamento.
--
-- PRÉ-REQUISITO: scripts/seguranca_rls.sql aplicado (eh_admin(),
-- sou_colaborador_ativo()).
-- ============================================================

-- ------------------------------------------------------------
-- 1. CADASTRO DE FUNCIONÁRIOS DA FÁBRICA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funcionarios_producao (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO funcionarios_producao (nome) VALUES
  ('Igor'),
  ('Gordinho'),
  ('Vinicius'),
  ('Alemão')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------
-- 2. PAGAMENTOS E VALES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamentos_funcionarios (
  id SERIAL PRIMARY KEY,
  funcionario_id INTEGER NOT NULL REFERENCES funcionarios_producao(id),
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Pagamento', 'Vale')),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  observacao TEXT,
  criado_por INTEGER REFERENCES colaboradores(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_func_funcionario ON pagamentos_funcionarios (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_func_data ON pagamentos_funcionarios (data_pagamento DESC);

-- ------------------------------------------------------------
-- 3. VIEW — resumo por funcionário (total pago, total em vale, último lançamento)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW resumo_pagamentos_funcionarios
WITH (security_invoker = true) AS
SELECT
  f.id AS funcionario_id,
  f.nome,
  COALESCE(SUM(p.valor) FILTER (WHERE p.tipo = 'Pagamento'), 0) AS total_pagamentos,
  COALESCE(SUM(p.valor) FILTER (WHERE p.tipo = 'Vale'), 0) AS total_vales,
  COALESCE(SUM(p.valor), 0) AS total_geral,
  MAX(p.data_pagamento) AS ultimo_lancamento
FROM funcionarios_producao f
LEFT JOIN pagamentos_funcionarios p ON p.funcionario_id = f.id
WHERE f.ativo = true
GROUP BY f.id, f.nome
ORDER BY f.nome;

-- ------------------------------------------------------------
-- 4. RLS — restrita a admin, igual ao resto da área de Produção.
-- ------------------------------------------------------------
ALTER TABLE funcionarios_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_funcionarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funcionarios_producao_select" ON funcionarios_producao;
CREATE POLICY "funcionarios_producao_select" ON funcionarios_producao
  FOR SELECT TO authenticated
  USING (sou_colaborador_ativo());

DROP POLICY IF EXISTS "funcionarios_producao_admin_all" ON funcionarios_producao;
CREATE POLICY "funcionarios_producao_admin_all" ON funcionarios_producao
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());

DROP POLICY IF EXISTS "pagamentos_func_admin_all" ON pagamentos_funcionarios;
CREATE POLICY "pagamentos_func_admin_all" ON pagamentos_funcionarios
  FOR ALL TO authenticated
  USING (eh_admin())
  WITH CHECK (eh_admin());
