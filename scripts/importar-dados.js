/**
 * Script de Importação de Dados - BS Oficina Web
 * ===============================================
 * 
 * Como usar:
 * 1. Coloque seus arquivos CSV na pasta ./dados/
 * 2. Configure as variáveis SUPABASE_URL e SUPABASE_KEY abaixo
 * 3. Execute: node importar-dados.js
 * 
 * Formatos esperados dos CSVs:
 * 
 * clientes.csv:
 *   nome;cpf_cnpj;telefone;celular;email;endereco;cidade;estado;status
 * 
 * vendas.csv:
 *   codigo;cliente_nome;vendedor_nome;valor_total;lucro_final;data_venda;tipo_pagamento;situacao
 * 
 * produtos.csv:
 *   codigo;nome;tipo;preco_venda;preco_custo;unidade;quantidade_estoque
 */

// ===========================================
// CONFIGURE AQUI AS CREDENCIAIS DO SUPABASE
// ===========================================
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-aqui';
// ===========================================

const fs = require('fs');
const path = require('path');

async function importarDados() {
  console.log('🚗 BS Oficina Web - Importador de Dados\n');

  // Verificar se a URL foi configurada
  if (SUPABASE_URL === 'https://seu-projeto.supabase.co') {
    console.log('❌ Configure as credenciais do Supabase no arquivo importar-dados.js');
    console.log('   Edite as variáveis SUPABASE_URL e SUPABASE_KEY no início do script.');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const dadosDir = path.join(__dirname, 'dados');

  // Verificar se a pasta de dados existe
  if (!fs.existsSync(dadosDir)) {
    fs.mkdirSync(dadosDir, { recursive: true });
    console.log('📁 Pasta ./dados criada.');
    console.log('   Coloque seus arquivos CSV lá e execute novamente.\n');
    console.log('   Formatos esperados:');
    console.log('   - clientes.csv');
    console.log('   - vendas.csv');
    console.log('   - produtos.csv');
    console.log('   - lojas.csv');
    process.exit(0);
  }

  // 1. Importar Lojas
  if (fs.existsSync(path.join(dadosDir, 'lojas.csv'))) {
    console.log('📥 Importando lojas...');
    const linhas = fs.readFileSync(path.join(dadosDir, 'lojas.csv'), 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .slice(1); // Pula cabeçalho

    for (const linha of linhas) {
      const [nome, cidade, estado, telefone] = linha.split(';').map(s => s.trim());
      if (nome) {
        const { error } = await supabase.from('lojas').insert({ nome, cidade, estado, telefone });
        if (error) console.log(`   ⚠️  Erro ao importar loja "${nome}": ${error.message}`);
        else console.log(`   ✅ Loja "${nome}" importada`);
      }
    }
  }

  // 2. Importar Clientes
  if (fs.existsSync(path.join(dadosDir, 'clientes.csv'))) {
    console.log('\n📥 Importando clientes...');
    const linhas = fs.readFileSync(path.join(dadosDir, 'clientes.csv'), 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .slice(1);

    let count = 0;
    for (const linha of linhas) {
      const [nome, cpf_cnpj, telefone, celular, email, endereco, cidade, estado, status] = 
        linha.split(';').map(s => s.trim());
      
      if (nome) {
        const { error } = await supabase.from('clientes').insert({
          nome, cpf_cnpj, telefone, celular, email, endereco, cidade, estado,
          status: status || 'Ativo'
        });
        if (error) console.log(`   ⚠️  Erro ao importar "${nome}": ${error.message}`);
        else count++;
      }
    }
    console.log(`   ✅ ${count} clientes importados`);
  }

  // 3. Importar Produtos
  if (fs.existsSync(path.join(dadosDir, 'produtos.csv'))) {
    console.log('\n📥 Importando produtos...');
    const linhas = fs.readFileSync(path.join(dadosDir, 'produtos.csv'), 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .slice(1);

    let count = 0;
    for (const linha of linhas) {
      const [codigo, nome, tipo, preco_venda, preco_custo, unidade, quantidade_estoque] = 
        linha.split(';').map(s => s.trim());
      
      if (nome) {
        const { error } = await supabase.from('produtos').insert({
          codigo, nome,
          tipo: tipo || 'Produto',
          preco_venda: parseFloat(preco_venda) || 0,
          preco_custo: parseFloat(preco_custo) || 0,
          unidade: unidade || 'UN',
          quantidade_estoque: parseFloat(quantidade_estoque) || 0
        });
        if (error) console.log(`   ⚠️  Erro ao importar "${nome}": ${error.message}`);
        else count++;
      }
    }
    console.log(`   ✅ ${count} produtos importados`);
  }

  // 4. Importar Vendas
  if (fs.existsSync(path.join(dadosDir, 'vendas.csv'))) {
    console.log('\n📥 Importando vendas...');
    const linhas = fs.readFileSync(path.join(dadosDir, 'vendas.csv'), 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .slice(1);

    let count = 0;
    for (const linha of linhas) {
      const [codigo, cliente_nome, vendedor_nome, valor_total, lucro_final, data_venda, tipo_pagamento, situacao] = 
        linha.split(';').map(s => s.trim());
      
      if (codigo || valor_total) {
        // Buscar cliente pelo nome (assumindo que já foi importado)
        let cliente_id = null;
        if (cliente_nome) {
          const { data: clientes } = await supabase
            .from('clientes')
            .select('id')
            .eq('nome', cliente_nome)
            .limit(1);
          if (clientes && clientes.length > 0) cliente_id = clientes[0].id;
        }

        const { error } = await supabase.from('vendas').insert({
          codigo,
          cliente_id,
          valor_total: parseFloat(valor_total) || 0,
          lucro_final: parseFloat(lucro_final) || 0,
          data_venda: data_venda || new Date().toISOString().split('T')[0],
          tipo_pagamento: tipo_pagamento || 'À Vista',
          situacao: situacao || 'Finalizada'
        });
        if (error) console.log(`   ⚠️  Erro ao importar venda #${codigo}: ${error.message}`);
        else count++;
      }
    }
    console.log(`   ✅ ${count} vendas importadas`);
  }

  console.log('\n✅ Importação concluída!');
  console.log('   Acesse o dashboard para ver os dados importados.');
}

importarDados().catch(console.error);
