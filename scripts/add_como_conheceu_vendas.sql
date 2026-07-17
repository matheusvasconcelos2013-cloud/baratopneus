-- Adiciona o canal de aquisicao (como o cliente conheceu a loja) na venda.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS como_conheceu TEXT;
