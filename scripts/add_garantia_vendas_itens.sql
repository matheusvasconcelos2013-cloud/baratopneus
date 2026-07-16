-- Adiciona a coluna de garantia por item de venda.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
