// ============================================================
// Tipos TypeScript para o BS Oficina Web
// ============================================================

export interface Loja {
  id: number;
  nome: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  fisica?: boolean; // false para canais de venda sem estoque próprio (ex: Shopee)
  created_at: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  loja_id?: number;
  tipo: 'admin' | 'gerente' | 'vendedor';
  ativo: boolean;
}

export interface Cliente {
  id: number;
  loja_id?: number;
  nome: string;
  tipo_pessoa?: 'Física' | 'Jurídica';
  cpf_cnpj?: string;
  rg?: string;
  data_nascimento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  celular?: string;
  celular2?: string;
  email?: string;
  limite_credito?: number;
  desconto_padrao?: number;
  observacao?: string;
  status?: 'Ativo' | 'Bloqueado' | 'Atenção' | 'Inativo';
  created_at: string;
}

export interface Produto {
  id: number;
  loja_id?: number;
  codigo?: string;
  nome: string;
  tipo?: 'Produto' | 'Serviço';
  fabricante_id?: number;
  preco_venda?: number;
  preco_custo?: number;
  unidade?: string;
  quantidade_estoque?: number;
  estoque_minimo?: number;
  observacao?: string;
  ativo?: boolean;
  created_at: string;
}

export interface Venda {
  id: number;
  loja_id?: number;
  codigo?: string;
  vendedor_id?: number;
  cliente_id?: number;
  valor_total?: number;
  lucro_parcial?: number;
  lucro_final?: number;
  data_venda?: string;
  situacao?: string;
  tipo_pagamento?: string;
  observacao?: string;
  como_conheceu?: string;
  created_at: string;
  // Relacionamentos
  cliente?: Cliente;
  vendedor?: Colaborador;
  itens?: VendaItem[];
}

export interface VendaItem {
  id: number;
  venda_id: number;
  produto_id?: number;
  quantidade: number;
  preco_unitario: number;
  preco_custo: number;
  desconto?: number;
  garantia?: boolean;
  lado?: string;
  medida_esquerdo_antes?: number;
  medida_esquerdo_depois?: number;
  medida_direito_antes?: number;
  medida_direito_depois?: number;
  loja_id?: number; // loja física de onde sai o estoque deste item, se diferente da loja da venda
  subtotal: number;
}

export interface Colaborador {
  id: number;
  loja_id?: number;
  nome: string;
  funcao?: string;
  telefone?: string;
  comissao_percentual?: number;
  ativo?: boolean;
}

export interface Fabricante {
  id: number;
  nome: string;
}

export interface ModeloVeiculo {
  id: number;
  marca?: string;
  modelo?: string;
  tipo?: string;
}

export interface Veiculo {
  id: number;
  cliente_id: number;
  placa?: string;
  modelo_id?: number;
  marca?: string;
  modelo?: string;
  ano?: string;
  cor?: string;
  observacao?: string;
}

export interface ContaFinanceiro {
  id: number;
  loja_id?: number;
  tipo: 'Pagar' | 'Receber';
  descricao?: string;
  valor: number;
  data_vencimento?: string;
  data_pagamento?: string;
  pago: boolean;
  categoria?: string;
  referencia_id?: number;
  observacao?: string;
}

// ============================================================
// Controle de Produção (carcaças, matéria-prima, lotes)
// ============================================================

export interface Material {
  id: number;
  nome: string;
  unidade_padrao: string;
  ativo?: boolean;
}

export interface EntradaCarcaca {
  id: number;
  data_compra: string;
  fornecedor_id?: number;
  medida: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  observacao?: string;
  criado_por?: number;
  created_at: string;
  fornecedor?: { id: number; nome: string } | null;
}

export interface EntradaMateriaPrima {
  id: number;
  material_id: number;
  data_compra: string;
  fornecedor_id?: number;
  quantidade_comprada: number;
  valor_unitario: number;
  valor_total: number;
  observacao?: string;
  criado_por?: number;
  created_at: string;
  materiais?: { nome: string; unidade_padrao: string } | null;
  fornecedor?: { id: number; nome: string } | null;
}

export interface LoteMaterialConsumido {
  id?: number;
  lote_id?: number;
  material_id: number;
  quantidade_consumida: number;
  custo_unitario: number;
  valor_total?: number;
  material_nome?: string;
  unidade?: string;
}

export interface LoteProducao {
  id: number;
  data_producao: string;
  medida: string;
  quantidade_carcacas_usadas: number;
  custo_unitario_carcaca: number;
  custo_carcacas: number;
  quantidade_produzida: number;
  loja_destino_id?: number;
  observacao?: string;
  criado_por?: number;
  created_at: string;
}

export interface ResumoLoteProducao {
  lote_id: number;
  data_producao: string;
  medida: string;
  quantidade_carcacas_usadas: number;
  quantidade_produzida: number;
  quantidade_refugo: number;
  custo_unitario_carcaca: number;
  custo_carcacas: number;
  custo_materiais: number;
  custo_total: number;
  custo_por_pneu: number;
  loja_destino_id?: number;
  loja_destino_nome?: string;
}

export interface ResumoProducaoMensal {
  mes: string;
  total_produzido: number;
  total_refugo: number;
  total_custo_carcacas: number;
  total_custo_materiais: number;
  total_investido: number;
  custo_medio_por_pneu: number;
}
