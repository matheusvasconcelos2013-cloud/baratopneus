-- Adiciona preço por carcaça (aro 13, 14, 15) em cada fornecedor,
-- usado para pré-preencher o valor unitário ao lançar entrada de carcaças.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS preco_carcaca_13 DECIMAL(10,2);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS preco_carcaca_14 DECIMAL(10,2);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS preco_carcaca_15 DECIMAL(10,2);
