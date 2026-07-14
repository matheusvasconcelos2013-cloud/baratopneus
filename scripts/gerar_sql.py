"""
Gera scripts SQL para importar CSVs no Supabase
"""
import csv

def limpar(valor):
    if not valor or valor.strip() in ["", "-", ".", "  .   .   -"]:
        return "NULL"
    v = valor.strip().replace("'", "''")
    return f"'{v}'"

def gerar_sql_clientes():
    linhas = []
    with open("/home/user/uploads/clientes_limpo_database.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nome = row.get("Nome", "").strip()
            if not nome or nome in ["", "-"]:
                continue
            
            cpf = row.get("CPF/CNPJ", "").strip()
            if cpf in ["", "-", ".", "  .   .   -", "  .   .   ."]:
                cpf = ""
            
            sql = f"  ({limpar(nome)}, {limpar(cpf)}, {limpar(row.get('RG',''))}, {limpar(row.get('Data de Nascimento',''))}, {limpar(row.get('CEP',''))}, {limpar(row.get('Endereço',''))}, {limpar(row.get('Número',''))}, {limpar(row.get('Complemento',''))}, {limpar(row.get('Bairro',''))}, {limpar(row.get('Cidade',''))}, {limpar(row.get('Estado',''))}, {limpar(row.get('Telefone',''))}, {limpar(row.get('Celular',''))}, {limpar(row.get('Celular 2',''))}, '{row.get('Status','Ativo').strip() if row.get('Status','').strip() else 'Ativo'}')"
            linhas.append(sql)
    
    arquivo = "/home/user/bs-oficina-web/scripts/importar_clientes.sql"
    with open(arquivo, "w", encoding="utf-8") as f:
        f.write("-- ===========================================\n")
        f.write("-- IMPORTAR CLIENTES\n")
        f.write("-- Execute no SQL Editor do Supabase\n")
        f.write("-- ===========================================\n\n")
        f.write("INSERT INTO clientes (nome, cpf_cnpj, rg, data_nascimento, cep, endereco, numero, complemento, bairro, cidade, estado, telefone, celular, celular2, status) VALUES\n")
        f.write(",\n".join(linhas))
        f.write(";\n\n")
        f.write(f"-- Total: {len(linhas)} clientes\n")
    
    print(f"SQL de clientes gerado: {len(linhas)} registros")
    return len(linhas)

def gerar_sql_vendas():
    linhas = []
    with open("/home/user/uploads/vendas_limpo_database.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            codigo = row.get("Código da Venda", "").strip()
            cliente = row.get("Cliente", "").strip()
            valor = float(row.get("Valor Total", 0) or 0)
            lucro = float(row.get("Lucro Final", 0) or 0)
            data = row.get("Data da Compra", "").strip()[:10]
            situacao = row.get("Situação", "Finalizada").strip()
            tipo_pag = row.get("Tipo de Pagamento", "À Vista").strip()
            
            if not codigo:
                continue
            
            sql = f"  ({limpar(codigo)}, {limpar(cliente)}, {valor}, {lucro}, {limpar(data)}, {limpar(situacao)}, {limpar(tipo_pag)})"
            linhas.append(sql)
    
    arquivo = "/home/user/bs-oficina-web/scripts/importar_vendas.sql"
    
    with open(arquivo, "w", encoding="utf-8") as f:
        f.write("-- ===========================================\n")
        f.write("-- IMPORTAR VENDAS\n")
        f.write("-- Execute DEPOIS de importar os clientes\n")
        f.write("-- ===========================================\n\n")
        f.write("-- Primeiro cria a vendedora Isabela\n")
        f.write("INSERT INTO colaboradores (nome, funcao, ativo) VALUES ('Isabela', 'Vendedora', true);\n\n")
        f.write("-- Depois insere as vendas\n")
        f.write("INSERT INTO vendas (codigo, cliente_nome_temp, valor_total, lucro_final, data_venda, situacao, tipo_pagamento) VALUES\n")
        f.write(",\n".join(linhas))
        f.write(";\n")
    
    print(f"SQL de vendas gerado: {len(linhas)} registros")
    return len(linhas)

print("Gerando scripts SQL...")
tc = gerar_sql_clientes()
tv = gerar_sql_vendas()
print(f"\nScripts gerados em:\n  scripts/importar_clientes.sql ({tc} clientes)\n  scripts/importar_vendas.sql ({tv} vendas)")
print("\nAbra cada arquivo, copie e cole no SQL Editor do Supabase!")
