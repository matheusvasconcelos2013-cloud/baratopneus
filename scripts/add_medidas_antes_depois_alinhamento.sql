-- Substitui a medida única de alinhamento/cambagem por medidas de antes e depois,
-- por lado. As medidas antigas (medida_esquerdo, medida_direito) ficam sem uso
-- e podem ser removidas depois, se desejar.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_esquerdo_antes NUMERIC;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_esquerdo_depois NUMERIC;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_direito_antes NUMERIC;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS medida_direito_depois NUMERIC;
