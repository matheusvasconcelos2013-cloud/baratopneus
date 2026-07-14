"""
Script para IMPORTAR CSVs limpos para o Supabase
"""
import csv
import requests

SUPABASE_URL = "https://qffnlznnkercxufbfple.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm5sem5ua2VyY3h1ZmJmcGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODU2MjEsImV4cCI6MjA5OTI2MTYyMX0.HU0gbXM_oMrHytqT-uR5pezWpzbHh7GlINP8zLZndjA"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def enviar_lote(tabela, batch):
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{tabela}",
        headers=headers,
        json=batch
    )
    if resp.status_code not in [200, 201, 204]:
        print(f"   Erro em {tabela}: {resp.status_code}")
        return 0
    return len(batch)

def importar_clientes():
    print("Importando clientes...")
    batch = []
    total = 0
    
    with open("/home/user/uploads/clientes_limpo_database.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nome = row.get("Nome", "").strip()
            if not nome:
                continue
            
            cliente = {
                "nome": nome,
                "cpf_cnpj": row.get("CPF/CNPJ", "").strip() or None,
                "rg": row.get("RG", "").strip() or None,
                "cep": row.get("CEP", "").strip() or None,
                "endereco": row.get("Endereço", "").strip() or None,
                "numero": row.get("Número", "").strip() or None,
                "complemento": row.get("Complemento", "").strip() or None,
                "bairro": row.get("Bairro", "").strip() or None,
                "cidade": row.get("Cidade", "").strip() or None,
                "estado": row.get("Estado", "").strip() or None,
                "telefone": row.get("Telefone", "").strip() or None,
                "celular": row.get("Celular", "").strip() or None,
                "celular2": row.get("Celular 2", "").strip() or None,
                "observacao": row.get("Observação", "").strip() or None,
                "status": "Ativo",
            }
            batch.append(cliente)
            
            if len(batch) >= 200:
                total += enviar_lote("clientes", batch)
                print(f"   {total} clientes...")
                batch = []
        
        if batch:
            total += enviar_lote("clientes", batch)
    
    print(f"Total: {total} clientes importados")
    return total

def importar_vendas():
    print("\nImportando vendas...")
    
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/colaboradores?nome=eq.Isabela&select=id",
        headers=headers
    )
    vendedor_id = None
    if resp.status_code == 200 and resp.json():
        vendedor_id = resp.json()[0]["id"]
    
    if not vendedor_id:
        print("   Criando vendedora Isabela...")
        requests.post(
            f"{SUPABASE_URL}/rest/v1/colaboradores",
            headers=headers,
            json={"nome": "Isabela", "funcao": "Vendedora", "ativo": True}
        )
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/colaboradores?nome=eq.Isabela&select=id",
            headers=headers
        )
        if resp.status_code == 200 and resp.json():
            vendedor_id = resp.json()[0]["id"]
    
    print(f"   Vendedora Isabela ID: {vendedor_id}")
    
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/clientes?select=id,nome",
        headers=headers
    )
    clientes_map = {}
    if resp.status_code == 200:
        for c in resp.json():
            clientes_map[c["nome"].strip().lower()] = c["id"]
    
    print(f"   {len(clientes_map)} clientes mapeados")
    
    batch_v = []
    batch_f = []
    total_v = 0
    total_f = 0
    
    with open("/home/user/uploads/vendas_limpo_database.csv", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            codigo = row.get("Código da Venda", "").strip()
            cliente_nome = row.get("Cliente", "").strip()
            valor_total = float(row.get("Valor Total", 0) or 0)
            lucro = float(row.get("Lucro Final", 0) or 0)
            data_venda = row.get("Data da Compra", "").strip()[:10]
            situacao = row.get("Situação", "Finalizada").strip()
            tipo_pag = row.get("Tipo de Pagamento", "À Vista").strip()
            
            if not codigo:
                continue
            
            cliente_id = clientes_map.get(cliente_nome.lower(), None)
            
            venda = {
                "codigo": codigo,
                "cliente_id": cliente_id,
                "vendedor_id": vendedor_id,
                "valor_total": valor_total,
                "lucro_parcial": lucro,
                "lucro_final": lucro,
                "data_venda": data_venda,
                "situacao": situacao if situacao in ["Finalizada", "Cancelada", "Em Aberto"] else "Finalizada",
                "tipo_pagamento": tipo_pag,
            }
            batch_v.append(venda)
            
            fin = {
                "tipo": "Receber",
                "descricao": f"Venda #{codigo}",
                "valor": valor_total,
                "data_vencimento": data_venda,
                "data_pagamento": data_venda,
                "pago": situacao == "Finalizada",
                "categoria": "Venda",
            }
            batch_f.append(fin)
            
            if len(batch_v) >= 200:
                total_v += enviar_lote("vendas", batch_v)
                total_f += enviar_lote("contas_financeiro", batch_f)
                print(f"   {total_v} vendas...")
                batch_v = []
                batch_f = []
        
        if batch_v:
            total_v += enviar_lote("vendas", batch_v)
            total_f += enviar_lote("contas_financeiro", batch_f)
    
    print(f"   Total: {total_v} vendas, {total_f} contas financeiras")
    return total_v

print("=" * 40)
print("BS OFICINA WEB - IMPORTADOR DE CSVs")
print("=" * 40)

total_clientes = importar_clientes()
total_vendas = importar_vendas()

print("\n" + "=" * 40)
print("IMPORTACAO CONCLUIDA!")
print(f"Clientes: {total_clientes}")
print(f"Vendas: {total_vendas}")
print("=" * 40)
