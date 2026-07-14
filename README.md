# 🚗 BS Oficina Web — Sistema de Gestão de Pneus

Sistema web completo para substituir o BS Oficina Professional (Bianchin Software), conectando todas as suas lojas em um só lugar.

## 🎯 Objetivo

Unificar vendas, clientes, ordens de serviço e estoque de **múltiplas lojas** em um sistema online acessível de qualquer lugar.

## 🛠️ Tecnologias

- **Frontend:** Next.js 14 (React + TypeScript)
- **Backend/Database:** Supabase (PostgreSQL)
- **Estilo:** Tailwind CSS
- **Autenticação:** Supabase Auth (email/senha)

## 📦 Estrutura do Projeto

```
bs-oficina-web/
├── src/
│   ├── app/                 # Páginas do Next.js
│   │   ├── login/           # Tela de login
│   │   ├── dashboard/       # Dashboard principal
│   │   ├── clientes/        # CRUD de clientes
│   │   ├── vendas/          # Vendas realizadas
│   │   ├── ordens-servico/  # Ordens de serviço (OS)
│   │   ├── produtos/        # Produtos e serviços
│   │   └── lojas/           # Gerenciar lojas
│   ├── components/          # Componentes reutilizáveis
│   ├── lib/                 # Configurações (Supabase, etc)
│   └── types/               # Tipos TypeScript
├── supabase/
│   └── schema.sql           # Script SQL completo
├── scripts/
│   └── importar-dados.js    # Script para importar seus CSVs
└── package.json
```

## 🚀 Como Começar

### 1. Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Crie um novo projeto (nome: `bs-oficina`)
3. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute
4. Vá em **Project Settings > API** e anote:
   - `Project URL` (ex: https://xxxxx.supabase.co)
   - `anon public` key

### 2. Rodar o projeto localmente

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.local.example .env.local
# Edite o .env.local com as credenciais do Supabase

# Rodar o servidor
npm run dev
```

Acesse: http://localhost:3000

### 3. Importar seus dados

Coloque seus arquivos CSV/Excel na pasta `scripts/dados/` e rode:

```bash
node scripts/importar-dados.js
```

## 🔄 Fluxo de Uso

1. **Admin** cria as lojas e os usuários de cada loja
2. Cada **loja** acessa o sistema e cadastra clientes, vendas, OS
3. O **dono** vê o dashboard unificado com dados de todas as lojas

## 📱 Acesso

- **Computador:** Pelo navegador (pode hospedar na Vercel ou outro serviço)
- **Celular:** Responsivo, funciona pelo navegador do celular
- **Tablet:** Também funciona perfeitamente
