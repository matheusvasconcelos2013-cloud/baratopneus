-- Adiciona as medidas do alinhamento (esquerdo/direito) por item de venda.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_esquerdo NUMERIC;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_direito NUMERIC;
