-- ============================================================
-- ATUALIZAÇÃO: tabelas/colunas que já existiam em produção mas não
-- estavam no schema.sql versionado, + função atômica de estoque.
-- ============================================================
-- Seguro rodar mesmo que parte disso já exista (tudo usa IF NOT EXISTS
-- ou CREATE OR REPLACE). Rode este script ANTES de scripts/seguranca_rls.sql,
-- pois a RLS depende de colaboradores.email/is_admin e da tabela estoque_lojas.

-- 1. Colunas de login/admin em colaboradores (já devem existir em produção,
--    aqui é só para deixar o script do repositório fiel ao banco real)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Estoque por loja
CREATE TABLE IF NOT EXISTS estoque_lojas (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
  loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Antes de criar o índice único, confira se já não há duplicados
-- (produto_id, loja_id repetido) no seu banco:
--   SELECT produto_id, loja_id, COUNT(*) FROM estoque_lojas
--   GROUP BY produto_id, loja_id HAVING COUNT(*) > 1;
-- Se aparecer alguma linha, avise antes de continuar — o índice abaixo
-- vai falhar até esses duplicados serem resolvidos (mesclados/apagados).
CREATE UNIQUE INDEX IF NOT EXISTS ux_estoque_lojas_produto_loja
  ON estoque_lojas(produto_id, loja_id);

-- 3. Remessas (entrada de mercadoria)
CREATE TABLE IF NOT EXISTS remessas (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  data_entrada DATE DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remessas_itens (
  id SERIAL PRIMARY KEY,
  remessa_id INTEGER REFERENCES remessas(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  quantidade DECIMAL(10,2) DEFAULT 1,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_estoque_lojas_loja ON estoque_lojas(loja_id);
CREATE INDEX IF NOT EXISTS idx_remessas_loja ON remessas(loja_id);
CREATE INDEX IF NOT EXISTS idx_remessas_itens_remessa ON remessas_itens(remessa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_produto_loja ON movimentacao_estoque(produto_id, loja_id);

-- 5. Função atômica de ajuste de estoque (corrige a condição de corrida
--    da baixa/entrada de estoque — ver conversa anterior)
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

-- 6. (Opcional, irreversível) Remover as tabelas de Ordens de Serviço,
--    que nunca tiveram tela implementada e foram descontinuadas.
--    Descomente as duas linhas abaixo SÓ se tiver certeza de que não
--    quer guardar esses dados (ou depois de exportar um backup).
-- DROP TABLE IF EXISTS ordens_servico_itens;
-- DROP TABLE IF EXISTS ordens_servico;
