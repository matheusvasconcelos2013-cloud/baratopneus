-- ============================================================
-- BS OFICINA WEB — Schema Completo do Supabase (CORRIGIDO)
-- ============================================================

-- 1. TABELA DE LOJAS
CREATE TABLE IF NOT EXISTS lojas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(50),
  telefone VARCHAR(20),
  fisica BOOLEAN DEFAULT TRUE, -- FALSE para canais de venda sem loja física (ex: Shopee)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE lojas ADD COLUMN IF NOT EXISTS fisica BOOLEAN DEFAULT TRUE;

-- Canal "Shopee": faturamento das vendas do marketplace fica separado das
-- lojas físicas; o estoque de cada item é debitado da loja física real
-- via vendas_itens.loja_id (ver tabela 11 abaixo).
INSERT INTO lojas (nome, cidade, fisica)
SELECT 'Shopee', 'Online', FALSE
WHERE NOT EXISTS (SELECT 1 FROM lojas WHERE nome = 'Shopee');

-- 2. TABELA DE PERFIS (vincula o usuário do Auth com a loja)
-- O id é UUID porque referencia auth.users do Supabase
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  loja_id INTEGER REFERENCES lojas(id),
  tipo VARCHAR(20) DEFAULT 'vendedor' CHECK (tipo IN ('admin', 'gerente', 'vendedor')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  nome VARCHAR(200) NOT NULL,
  tipo_pessoa VARCHAR(10) CHECK (tipo_pessoa IN ('Física', 'Jurídica')),
  cpf_cnpj VARCHAR(20),
  rg VARCHAR(20),
  data_nascimento DATE,
  cep VARCHAR(10),
  endereco VARCHAR(300),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(50),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  celular2 VARCHAR(20),
  email VARCHAR(200),
  limite_credito DECIMAL(10,2) DEFAULT 0,
  desconto_padrao DECIMAL(5,2) DEFAULT 0,
  observacao TEXT,
  status VARCHAR(20) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Bloqueado', 'Atenção', 'Inativo')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  nome VARCHAR(200) NOT NULL,
  contato VARCHAR(100),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  email VARCHAR(200),
  endereco TEXT,
  cnpj VARCHAR(20),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABELA DE FABRICANTES
CREATE TABLE IF NOT EXISTS fabricantes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TABELA DE PRODUTOS / SERVIÇOS
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  codigo VARCHAR(50),
  nome VARCHAR(300) NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('Produto', 'Serviço')),
  fabricante_id INTEGER REFERENCES fabricantes(id),
  preco_venda DECIMAL(10,2) DEFAULT 0,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  unidade VARCHAR(20) DEFAULT 'UN',
  quantidade_estoque DECIMAL(10,2) DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  observacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABELA DE MODELOS DE VEÍCULOS
CREATE TABLE IF NOT EXISTS modelos_veiculos (
  id SERIAL PRIMARY KEY,
  marca VARCHAR(100),
  modelo VARCHAR(200),
  tipo VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TABELA DE VEÍCULOS DOS CLIENTES
CREATE TABLE IF NOT EXISTS veiculos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  placa VARCHAR(10),
  modelo_id INTEGER REFERENCES modelos_veiculos(id),
  marca VARCHAR(100),
  modelo VARCHAR(200),
  ano VARCHAR(10),
  cor VARCHAR(50),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. TABELA DE COLABORADORES (técnicos/vendedores)
CREATE TABLE IF NOT EXISTS colaboradores (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  nome VARCHAR(200) NOT NULL,
  funcao VARCHAR(100),
  telefone VARCHAR(20),
  comissao_percentual DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  notificar_vendas BOOLEAN DEFAULT FALSE,
  email VARCHAR(200),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Colunas abaixo já existiam no banco em produção (login por e-mail e
-- flag de administrador), mas não estavam registradas neste script.
-- Adicionadas aqui como ALTER para manter este arquivo idempotente
-- caso as colunas já existam.
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 10. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  codigo VARCHAR(50),
  vendedor_id INTEGER REFERENCES colaboradores(id),
  cliente_id INTEGER REFERENCES clientes(id),
  valor_total DECIMAL(10,2) DEFAULT 0,
  lucro_parcial DECIMAL(10,2) DEFAULT 0,
  lucro_final DECIMAL(10,2) DEFAULT 0,
  data_venda DATE DEFAULT CURRENT_DATE,
  situacao VARCHAR(30) DEFAULT 'Finalizada' CHECK (situacao IN ('Finalizada', 'Cancelada', 'Em Aberto', 'Em Andamento', 'Atrasada')),
  tipo_pagamento VARCHAR(50),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. ITENS DA VENDA
CREATE TABLE IF NOT EXISTS vendas_itens (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  quantidade DECIMAL(10,2) DEFAULT 1,
  preco_unitario DECIMAL(10,2) DEFAULT 0,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  desconto INTEGER DEFAULT 0,
  garantia BOOLEAN DEFAULT FALSE,
  loja_id INTEGER REFERENCES lojas(id), -- loja física de onde sai o estoque deste item; se nulo, usa vendas.loja_id
  subtotal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS loja_id INTEGER REFERENCES lojas(id);
COMMENT ON COLUMN vendas_itens.loja_id IS 'Loja física de onde sai o estoque deste item. Se nulo, usa a loja da venda (vendas.loja_id) — comportamento padrão para vendas de balcão.';

-- 12. TABELA DE ESTOQUE POR LOJA
-- Cada loja controla seu próprio saldo do mesmo produto (produtos.quantidade_estoque
-- ficou como campo legado/consolidado; o saldo real e por loja mora aqui).
CREATE TABLE IF NOT EXISTS estoque_lojas (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
  loja_id INTEGER REFERENCES lojas(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Garante no máximo um saldo por produto+loja. Necessário para o
-- UPSERT atômico usado pela função ajustar_estoque() (ver mais abaixo).
-- Antes de aplicar em um banco já existente, verifique duplicados com:
--   SELECT produto_id, loja_id, COUNT(*) FROM estoque_lojas
--   GROUP BY produto_id, loja_id HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS ux_estoque_lojas_produto_loja
  ON estoque_lojas(produto_id, loja_id);

-- 13. TABELA DE REMESSAS (entrada de mercadoria de fornecedores)
CREATE TABLE IF NOT EXISTS remessas (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  fornecedor_id INTEGER REFERENCES fornecedores(id),
  data_entrada DATE DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. ITENS DA REMESSA
CREATE TABLE IF NOT EXISTS remessas_itens (
  id SERIAL PRIMARY KEY,
  remessa_id INTEGER REFERENCES remessas(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  quantidade DECIMAL(10,2) DEFAULT 1,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. TABELA DE CONTAS FINANCEIRO
CREATE TABLE IF NOT EXISTS contas_financeiro (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  tipo VARCHAR(10) CHECK (tipo IN ('Pagar', 'Receber')),
  descricao VARCHAR(300),
  valor DECIMAL(10,2) DEFAULT 0,
  data_vencimento DATE,
  data_pagamento DATE,
  pago BOOLEAN DEFAULT FALSE,
  categoria VARCHAR(50) CHECK (categoria IN ('Venda', 'Ordem de Serviço', 'Orçamento', 'Conta Avulsa')),
  referencia_id INTEGER,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 15. TABELA DE MOVIMENTAÇÃO DE ESTOQUE
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
  loja_id INTEGER REFERENCES lojas(id),
  tipo VARCHAR(10) CHECK (tipo IN ('Entrada', 'Saída')),
  quantidade DECIMAL(10,2) NOT NULL,
  motivo VARCHAR(200),
  referencia_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 16. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notificacoes (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(30) DEFAULT 'venda',
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT,
  loja_id INTEGER REFERENCES lojas(id),
  referencia_id INTEGER,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver notificações"
  ON notificacoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar notificações"
  ON notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar notificações"
  ON notificacoes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem excluir notificações"
  ON notificacoes FOR DELETE
  TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- 17. TABELA DE INSCRIÇÕES DE PUSH (notificações no celular)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem gerenciar suas inscrições push"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_vendas_loja ON vendas(loja_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON produtos(loja_id);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lojas_loja ON estoque_lojas(loja_id);
CREATE INDEX IF NOT EXISTS idx_remessas_loja ON remessas(loja_id);
CREATE INDEX IF NOT EXISTS idx_remessas_itens_remessa ON remessas_itens(remessa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_produto_loja ON movimentacao_estoque(produto_id, loja_id);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Todas as views abaixo usam security_invoker = true: sem essa opção, uma
-- view roda com o privilégio de quem a criou (SECURITY DEFINER implícito) e
-- ignora completamente o RLS das tabelas de negócio — ou seja, qualquer
-- usuário que a consultasse via API veria todos os dados de todas as
-- lojas/vendedores, mesmo depois de habilitar RLS. Com security_invoker,
-- a view respeita o RLS de quem está consultando.

-- View: Vendas consolidadas por loja
CREATE OR REPLACE VIEW vendas_por_loja
WITH (security_invoker = true) AS
SELECT
  l.id AS loja_id,
  l.nome AS loja_nome,
  COUNT(v.id) AS total_vendas,
  COALESCE(SUM(v.valor_total), 0) AS valor_total,
  COALESCE(SUM(v.lucro_final), 0) AS lucro_total,
  COALESCE(AVG(v.valor_total), 0) AS ticket_medio
FROM lojas l
LEFT JOIN vendas v ON v.loja_id = l.id AND v.situacao = 'Finalizada'
GROUP BY l.id, l.nome
ORDER BY l.nome;

-- View: Dashboard do dono (todas as lojas)
-- Obs: "Ordens de Serviço" foi removido do produto (não havia tela implementada),
-- então o contador os_abertas saiu daqui junto com a tabela ordens_servico.
CREATE OR REPLACE VIEW dashboard_geral
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM clientes WHERE status = 'Ativo') AS total_clientes_ativos,
  (SELECT COUNT(*) FROM vendas WHERE situacao = 'Finalizada') AS total_vendas,
  (SELECT COALESCE(SUM(valor_total), 0) FROM vendas WHERE situacao = 'Finalizada') AS faturamento_total,
  (SELECT COALESCE(SUM(lucro_final), 0) FROM vendas WHERE situacao = 'Finalizada') AS lucro_total,
  (SELECT COUNT(*) FROM lojas) AS total_lojas;

-- View: estoque atual por produto/loja, já com o flag de estoque baixo
-- (existia em produção mas nunca tinha sido versionada aqui)
CREATE OR REPLACE VIEW estoque_atual
WITH (security_invoker = true) AS
SELECT
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.codigo,
  l.id AS loja_id,
  l.nome AS loja_nome,
  COALESCE(e.quantidade, 0) AS quantidade,
  COALESCE(e.estoque_minimo, p.estoque_minimo, 0) AS estoque_minimo,
  CASE WHEN COALESCE(e.quantidade, 0) <= COALESCE(e.estoque_minimo, p.estoque_minimo, 0)
    THEN true ELSE false END AS estoque_baixo
FROM produtos p
CROSS JOIN lojas l
LEFT JOIN estoque_lojas e ON e.produto_id = p.id AND e.loja_id = l.id
ORDER BY l.nome, p.nome;

-- View: soma de estoque de produtos "Pneu Remold" (todas as medidas) por loja física.
-- Usada no resumo da página /produtos. Exclui canais não-físicos (ex: Shopee).
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE VIEW estoque_remold_por_loja
WITH (security_invoker = true) AS
SELECT
  l.id AS loja_id,
  l.nome AS loja_nome,
  COALESCE(SUM(e.quantidade), 0)::numeric AS quantidade_total
FROM lojas l
CROSS JOIN produtos p
LEFT JOIN estoque_lojas e
  ON e.produto_id = p.id AND e.loja_id = l.id
WHERE extensions.unaccent(lower(p.nome)) LIKE '%pneu remold%'
  AND l.fisica = true
GROUP BY l.id, l.nome
ORDER BY l.nome;

-- View: relatório diário de vendas por loja (existia em produção mas
-- nunca tinha sido versionada aqui)
CREATE OR REPLACE VIEW relatorio_diario
WITH (security_invoker = true) AS
SELECT
  v.data_venda,
  l.nome AS loja_nome,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_total) AS faturamento,
  SUM(v.lucro_final) AS lucro,
  ROUND(SUM(v.valor_total) / NULLIF(COUNT(v.id), 0), 2) AS ticket_medio
FROM vendas v
JOIN lojas l ON l.id = v.loja_id
GROUP BY v.data_venda, l.id, l.nome
ORDER BY v.data_venda DESC, l.nome;

-- ============================================================
-- FUNÇÃO: BAIXA/ENTRADA DE ESTOQUE ATÔMICA
-- ============================================================
-- Centraliza todo ajuste de estoque (vendas, estornos, remessas) em uma
-- única operação atômica, evitando a condição de corrida do padrão antigo
-- "ler quantidade -> calcular no app -> gravar", que perde atualizações
-- quando duas vendas do mesmo produto/loja acontecem ao mesmo tempo.
--
-- p_delta: positivo para entrada (remessa, estorno de venda),
--          negativo para saída (venda, estorno de remessa).
-- p_tipo/p_motivo/p_referencia_id: se p_tipo for informado, registra
--          também o histórico em movimentacao_estoque na mesma transação.
--
-- SECURITY DEFINER: a função roda com os privilégios de quem a criou,
-- então funciona mesmo depois de RLS ser habilitado nas tabelas de
-- estoque (ver scripts/seguranca_rls.sql) — o controle de quem pode
-- chamar a função fica no GRANT EXECUTE abaixo.
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
