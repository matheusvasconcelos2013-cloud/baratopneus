-- Adiciona a coluna de lado (esquerdo/direito) por item de venda, usada no alinhamento.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS lado TEXT;
