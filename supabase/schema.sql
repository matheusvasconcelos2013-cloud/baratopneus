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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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
  created_at TIMESTAMP DEFAULT NOW()
);

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
  subtotal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. TABELA DE ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS ordens_servico (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  codigo VARCHAR(50),
  cliente_id INTEGER REFERENCES clientes(id),
  veiculo_id INTEGER REFERENCES veiculos(id),
  tecnico_id INTEGER REFERENCES colaboradores(id),
  tecnico2_id INTEGER REFERENCES colaboradores(id),
  valor_total DECIMAL(10,2) DEFAULT 0,
  lucro_parcial DECIMAL(10,2) DEFAULT 0,
  lucro_final DECIMAL(10,2) DEFAULT 0,
  data_os DATE DEFAULT CURRENT_DATE,
  status VARCHAR(30) DEFAULT 'Em Aberto' CHECK (status IN ('Finalizada', 'Cancelada', 'Em Aberto', 'Em Andamento', 'Atrasada')),
  pagamento VARCHAR(30) DEFAULT 'Não Pago' CHECK (pagamento IN ('Pago', 'Não Pago', 'Pago Parc.')),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. ITENS DA ORDEM DE SERVIÇO
CREATE TABLE IF NOT EXISTS ordens_servico_itens (
  id SERIAL PRIMARY KEY,
  os_id INTEGER REFERENCES ordens_servico(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id),
  tipo VARCHAR(20) CHECK (tipo IN ('Produto', 'Serviço')),
  quantidade DECIMAL(10,2) DEFAULT 1,
  preco_unitario DECIMAL(10,2) DEFAULT 0,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 14. TABELA DE CONTAS FINANCEIRO
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

ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_loja ON clientes(loja_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_vendas_loja ON vendas(loja_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_os_loja ON ordens_servico(loja_id);
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON produtos(loja_id);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON vendas_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_os_itens_os ON ordens_servico_itens(os_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente ON veiculos(cliente_id);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Vendas consolidadas por loja
CREATE OR REPLACE VIEW vendas_por_loja AS
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
CREATE OR REPLACE VIEW dashboard_geral AS
SELECT
  (SELECT COUNT(*) FROM clientes WHERE status = 'Ativo') AS total_clientes_ativos,
  (SELECT COUNT(*) FROM vendas WHERE situacao = 'Finalizada') AS total_vendas,
  (SELECT COALESCE(SUM(valor_total), 0) FROM vendas WHERE situacao = 'Finalizada') AS faturamento_total,
  (SELECT COALESCE(SUM(lucro_final), 0) FROM vendas WHERE situacao = 'Finalizada') AS lucro_total,
  (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Em Aberto') AS os_abertas,
  (SELECT COUNT(*) FROM lojas) AS total_lojas;
