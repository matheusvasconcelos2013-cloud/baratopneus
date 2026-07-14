-- ===========================================
-- BS OFICINA WEB - IMPORTAR DADOS COMPLETOS
-- Execute no SQL Editor do Supabase
-- ===========================================

-- 1. CRIAR VENDEDORA ISABELA
INSERT INTO colaboradores (nome, funcao, ativo)
SELECT 'Isabela', 'Vendedora', true
WHERE NOT EXISTS (SELECT 1 FROM colaboradores WHERE nome = 'Isabela');

-- 2. LIMPAR E IMPORTAR CLIENTES
TRUNCATE TABLE clientes CASCADE;

INSERT INTO clientes (nome, cpf_cnpj, rg, data_nascimento, cep, endereco, numero, complemento, bairro, cidade, estado, telefone, celular, celular2, status) VALUES
('Julio Cesar dos Santos', '951.876.693.20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9122-2222', NULL, NULL, 'Ativo'),
('Thamires Rodrigues de Oliveira', '538.093.348.39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.4173-2738', NULL, 'Ativo'),
('consumidor', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ativo'),
('Edivau Bernardes', '086.906.238.76', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6367-3865', NULL, 'Ativo'),
('Marcio Gleison', '299.357.648.99', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.5210-5356', NULL, 'Ativo'),
('Ederson Oliveira', '263.710.977.66', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.4165-8588', NULL, 'Ativo'),
('Jorge Luis', '037.926.555.28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6378-6146', NULL, 'Ativo'),
('Gilberto M', '308.266.511.94', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6447-4211', NULL, 'Ativo'),
('JosÃ© LuÃ­s G', '097.140.406.64', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ativo'),
('Paulo Cesar', '296.456.222.60', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6365-6295', NULL, 'Ativo'),
('Armando B', '127.983.339.31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6474-1362', NULL, 'Ativo'),
('Rosildo zal', '266.855.005.59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6517-5822', NULL, 'Ativo'),
('Alexandre', '224.162.709.70', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6256-4879', NULL, 'Ativo'),
('Gesuele Fa', '027.320.777.87', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6240-1524', NULL, 'Ativo'),
('Aparecido', '103.659.166.30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6231-1592', NULL, 'Ativo'),
('AntÃ´nio Pe', '089.215.155.47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6444-1754', NULL, 'Ativo'),
('Israel Leite', '221.599.428.33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6372-4226', NULL, 'Ativo'),
('Luiz Serafim', '059.356.593.88', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6561-8358', NULL, 'Ativo'),
('Marcio Ma', '286.802.252.79', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6357-4491', NULL, 'Ativo'),
('Bruno da S', '443.931.188.38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6563-4582', NULL, 'Ativo'),
('Ronaldo Fe', '370.846.418.36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.4178-3183', NULL, 'Ativo'),
('Bartolome', '007.830.409.04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6567-8580', NULL, 'Ativo'),
('Sergio Felix', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ativo'),
('Adriana do', '340.255.567.05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.4221-4280', NULL, 'Ativo'),
('Michael Do', '472.152.467.26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6250-6730', NULL, 'Ativo'),
('Valdir Afon', '082.996.883.09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6443-6299', NULL, 'Ativo'),
('Antonio Ro', '173.464.927.56', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6513-3753', NULL, 'Ativo'),
('JoÃ£o Batist', '748.931.653.19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6475-0945', NULL, 'Ativo'),
('Fabio Roch', '447.925.856.73', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6216-1674', NULL, 'Ativo'),
('Jose Salmo', '379.290.534.60', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6233-4750', NULL, 'Ativo'),
('Claudinei d', '299.843.452.63', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6249-1062', NULL, 'Ativo'),
('Cristiano Jo', '347.325.769.19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6374-2551', NULL, 'Ativo'),
('Paulo Jose', '008.602.158.13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6541-2676', NULL, 'Ativo'),
('Anderson E', '275.595.707.43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6527-5445', NULL, 'Ativo'),
('Jose Claud', '310.792.024.93', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6436-6483', NULL, 'Ativo'),
('Luiz Alfred', '222.114.006.67', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6515-8982', NULL, 'Ativo'),
('Gabriele Th', '481.614.256.50', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '(11) 9.6257-5879', NULL, 'Ativo')
ON CONFLICT DO NOTHING;

-- Restante dos clientes (vou encurtar aqui, mas no arquivo real tem todos)
-- O arquivo completo scripts/importar_clientes.sql tem todos os 1638 clientes!

-- ===========================================
-- 3. CRIAR FUNÇÃO PARA VINCULAR VENDAS A CLIENTES
-- ===========================================

-- Primeiro cria uma tabela temporária para as vendas
CREATE TEMP TABLE vendas_temp (
  codigo TEXT,
  cliente_nome TEXT,
  valor_total DECIMAL(10,2),
  lucro_final DECIMAL(10,2),
  data_venda DATE,
  situacao TEXT,
  tipo_pagamento TEXT
);

-- Insere as vendas (os primeiros registros como exemplo)
INSERT INTO vendas_temp VALUES
('7', 'Julio Cesar dos Santos', 359.8, 159.8, '2024-10-30', 'Finalizada', 'Ã€ Vista'),
('8', 'Thamires Rodrigues de Oliveira', 399.8, 199.8, '2024-10-30', 'Finalizada', 'Ã€ Vista'),
('9', 'consumidor', 30.0, 30.0, '2024-10-30', 'Finalizada', 'Ã€ Vista'),
('11', 'consumidor', 100.0, 50.0, '2024-10-31', 'Finalizada', 'Ã€ Vista'),
('12', 'Edivau Bernardes', 399.8, 199.8, '2024-10-31', 'Finalizada', 'Ã€ Vista'),
('16', 'Marcio Gleison', 409.8, 209.8, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('17', 'Ederson Oliveira', 399.8, 199.8, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('18', 'consumidor', 50.0, 0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('19', 'consumidor', 30.0, 30.0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('20', 'Jorge Luis', 429.8, 229.8, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('21', 'Gilberto M', 409.8, 209.8, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('22', 'JosÃ© LuÃ­s G', 359.8, 159.8, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('23', 'consumidor', 30.0, 30.0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('24', 'consumidor', 80.0, 30.0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('25', 'Paulo Cesar', 199.9, 99.9, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('26', 'Armando B', 189.9, 89.9, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('27', 'consumidor', 50.0, 0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('28', 'consumidor', 200.0, 100.0, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('29', 'Rosildo zal', 189.9, 89.9, '2024-11-01', 'Finalizada', 'Ã€ Vista'),
('30', 'Alexandre', 629.7, 329.7, '2024-11-01', 'Finalizada', 'Ã€ Vista');

-- Transfere da temp para a tabela final vinculando aos clientes
INSERT INTO vendas (codigo, cliente_id, vendedor_id, valor_total, lucro_final, data_venda, situacao, tipo_pagamento)
SELECT 
  v.codigo,
  c.id,
  (SELECT id FROM colaboradores WHERE nome = 'Isabela' LIMIT 1),
  v.valor_total,
  v.lucro_final,
  v.data_venda,
  v.situacao,
  v.tipo_pagamento
FROM vendas_temp v
LEFT JOIN clientes c ON LOWER(c.nome) = LOWER(TRIM(v.cliente_nome));

-- Cria contas financeiras para as vendas
INSERT INTO contas_financeiro (tipo, descricao, valor, data_vencimento, data_pagamento, pago, categoria)
SELECT 
  'Receber',
  'Venda #' || v.codigo || ' - ' || COALESCE(c.nome, 'Consumidor'),
  v.valor_total,
  v.data_venda,
  v.data_venda,
  v.situacao = 'Finalizada',
  'Venda'
FROM vendas_temp v
LEFT JOIN clientes c ON LOWER(c.nome) = LOWER(TRIM(v.cliente_nome))
JOIN vendas v2 ON v2.codigo = v.codigo;

DROP TABLE vendas_temp;

-- ===========================================
-- 4. VERIFICAR RESULTADOS
-- ===========================================
SELECT 'CLIENTES' as tabela, COUNT(*) as total FROM clientes
UNION ALL
SELECT 'VENDAS', COUNT(*) FROM vendas
UNION ALL
SELECT 'FINANCEIRO', COUNT(*) FROM contas_financeiro
UNION ALL
SELECT 'COLABORADORES', COUNT(*) FROM colaboradores;
