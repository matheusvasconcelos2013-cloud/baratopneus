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
  medida_esquerdo?: number;
  medida_direito?: number;
  subtotal: number;
}

export interface OrdemServico {
  id: number;
  loja_id?: number;
  codigo?: string;
  cliente_id?: number;
  veiculo_id?: number;
  tecnico_id?: number;
  tecnico2_id?: number;
  valor_total?: number;
  lucro_parcial?: number;
  lucro_final?: number;
  data_os?: string;
  status?: string;
  pagamento?: string;
  observacao?: string;
  created_at: string;
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
