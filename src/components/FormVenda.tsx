'use client';
import SearchSelect from './SearchSelect';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { Input, Select, TextArea, Button, formatMoney } from './FormElements';
import toast from 'react-hot-toast';
import { Produto, Colaborador, Cliente, Venda, VendaItem } from '@/types';

interface FormVendaProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  venda?: Venda | null;
}

interface Loja {
  id: number;
  nome: string;
}

export default function FormVenda({ isOpen, onClose, onSaved, venda }: FormVendaProps) {
  const [form, setForm] = useState({
    loja_id: '', // NOVO: Campo de loja
    codigo: '', cliente_id: '', vendedor_id: '', valor_total: 0, lucro_parcial: 0,
    lucro_final: 0, data_venda: new Date().toISOString().split('T')[0],
    situacao: 'Finalizada', tipo_pagamento: 'À Vista', observacao: ''
  });
  const [itens, setItens] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Colaborador[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]); // NOVO: Lista de lojas
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoItem, setNovoItem] = useState({ produto_id: '', quantidade: 1, preco_unitario: 0, preco_custo: 0 });
  // Modal rápido de novo cliente
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', celular: '', cpf_cnpj: '' });
  const [loadingCliente, setLoadingCliente] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    carregarDados();
    if (venda) {
      setForm({
        loja_id: venda.loja_id?.toString() || '', // NOVO
        codigo: venda.codigo || '', cliente_id: venda.cliente_id?.toString() || '',
        vendedor_id: venda.vendedor_id?.toString() || '', valor_total: venda.valor_total || 0,
        lucro_parcial: venda.lucro_parcial || 0, lucro_final: venda.lucro_final || 0,
        data_venda: venda.data_venda?.split('T')[0] || new Date().toISOString().split('T')[0],
        situacao: venda.situacao || 'Finalizada', tipo_pagamento: venda.tipo_pagamento || 'À Vista',
        observacao: venda.observacao || ''
      });
      carregarItens(venda.id);
    } else {
      setForm({ 
        loja_id: '', // NOVO
        codigo: '', cliente_id: '', vendedor_id: '', valor_total: 0, lucro_parcial: 0, lucro_final: 0, 
        data_venda: new Date().toISOString().split('T')[0], situacao: 'Finalizada', tipo_pagamento: 'À Vista', observacao: '' 
      });
      setItens([]);
    }
  }, [venda, isOpen]);

  const carregarDados = async () => {
    const [c, v, p, l] = await Promise.all([
      supabase.from('clientes').select('id,nome').eq('status', 'Ativo').order('nome'),
      supabase.from('colaboradores').select('id,nome').eq('ativo', true).order('nome'),
      supabase.from('produtos').select('id,nome,preco_venda,preco_custo').order('nome'), // REMOVIDO: quantidade_estoque
      supabase.from('lojas').select('id,nome').order('nome'), // NOVO: Carregar lojas
    ]);
    if (c.data) setClientes(c.data);
    if (v.data) setVendedores(v.data);
    if (p.data) setProdutos(p.data);
    if (l.data) setLojas(l.data); // NOVO
  };

  const carregarItens = async (vendaId: number) => {
    const { data } = await supabase.from('vendas_itens').select('*').eq('venda_id', vendaId);
    if (data) setItens(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ['valor_total', 'lucro_parcial', 'lucro_final'].includes(name) ? parseFloat(value) || 0 : value }));
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id) { toast.error('Selecione um produto'); return; }
    const prod = produtos.find(p => p.id === Number(novoItem.produto_id));
    setItens(prev => [...prev, {
      produto_id: Number(novoItem.produto_id),
      quantidade: novoItem.quantidade,
      preco_unitario: novoItem.preco_unitario || prod?.preco_venda || 0,
      preco_custo: novoItem.preco_custo || prod?.preco_custo || 0,
      subtotal: (novoItem.quantidade || 1) * (novoItem.preco_unitario || prod?.preco_venda || 0),
      produto_nome: prod?.nome
    }]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0, preco_custo: 0 });
  };

  const removerItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const calcularTotal = () => {
    const total = itens.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    return total;
  };

  const criarClienteRapido = async () => {
    if (!novoCliente.nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    setLoadingCliente(true);
    try {
      const { data, error } = await supabase.from('clientes').insert([{
        nome: novoCliente.nome,
        telefone: novoCliente.telefone,
        celular: novoCliente.celular,
        cpf_cnpj: novoCliente.cpf_cnpj,
        status: 'Ativo',
      }]).select();
      if (error) throw error;
      if (data) {
        toast.success(`Cliente "${novoCliente.nome}" cadastrado!`);
        setForm(prev => ({ ...prev, cliente_id: data[0].id.toString() }));
        // Recarrega lista de clientes e seleciona o novo
        const { data: clientesAtualizados } = await supabase
          .from('clientes').select('id,nome').eq('status', 'Ativo').order('nome');
        if (clientesAtualizados) setClientes(clientesAtualizados);
        setShowNovoCliente(false);
        setNovoCliente({ nome: '', telefone: '', celular: '', cpf_cnpj: '' });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingCliente(false);
    }
  };

  // NOVO: Função para deduzir estoque
 // NOVA: Função que chama a Edge Function
const deduzirestoqueLojas = async (vendaId: number, itensVenda: any[]) => {
  try {
    const lojaId = parseInt(form.loja_id);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deduzir-estoque`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          vendaId,
          lojaId,
          itens: itensVenda.map((item) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
          })),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao deduzir estoque");
    }

    const data = await response.json();
    console.log("✅ Estoque detraído com sucesso:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Erro ao deduzir estoque:", err);
    throw new Error(`Erro ao atualizar estoque: ${err.message}`);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NOVO: Validação de loja
    if (!form.loja_id) {
      toast.error('Selecione uma loja');
      return;
    }
    
    if (itens.length === 0) { 
      toast.error('Adicione pelo menos um item à venda'); 
      return; 
    }
    
    setLoading(true);
    try {
      const total = calcularTotal();
      const vendaData = {
        loja_id: parseInt(form.loja_id), // NOVO
        ...form,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        vendedor_id: form.vendedor_id ? parseInt(form.vendedor_id) : null,
        valor_total: total,
        lucro_final: form.lucro_final || total * 0.3,
        lucro_parcial: form.lucro_parcial || total * 0.3,
      };

      if (venda) {
        const { error } = await supabase.from('vendas').update(vendaData).eq('id', venda.id);
        if (error) throw error;
        await supabase.from('vendas_itens').delete().eq('venda_id', venda.id);
        await supabase.from('vendas_itens').insert(itens.map(i => ({ venda_id: venda.id, produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, preco_custo: i.preco_custo, subtotal: i.subtotal })));
        
        // NOVO: Deduzir estoque ao atualizar
        await deduzirestoqueLojas(venda.id, itens);
        
        // Atualiza financeiro
        await supabase.from('contas_financeiro').update({
          valor: total,
          descricao: `Venda #${form.codigo || venda.id} - ${clientes.find(c => c.id === parseInt(form.cliente_id))?.nome || 'Cliente'}`,
        }).eq('referencia_id', venda.id).eq('categoria', 'Venda');
        toast.success('Venda atualizada!');
      } else {
        const { data, error } = await supabase.from('vendas').insert([vendaData]).select();
        if (error) throw error;
        if (data) {
          await supabase.from('vendas_itens').insert(itens.map(i => ({ venda_id: data[0].id, produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, preco_custo: i.preco_custo, subtotal: i.subtotal })));
          
          // NOVO: Deduzir estoque ao criar nova venda
          await deduzirestoqueLojas(data[0].id, itens);
          
          // Cria registro financeiro automaticamente
          const clienteNome = clientes.find(c => c.id === parseInt(form.cliente_id))?.nome || 'Cliente';
          await supabase.from('contas_financeiro').insert([{
            tipo: 'Receber',
            descricao: `Venda #${form.codigo || data[0].id} - ${clienteNome}`,
            valor: total,
            data_vencimento: form.data_venda,
            pago: form.situacao === 'Finalizada',
            data_pagamento: form.situacao === 'Finalizada' ? form.data_venda : null,
            categoria: 'Venda',
            referencia_id: data[0].id,
          }]);
        }
        toast.success('Venda registrada!');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={venda ? 'Editar Venda' : 'Nova Venda'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NOVO: Campo de Loja - DESTAQUE */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <Select 
            label="🏪 Loja (Obrigatório)" 
            value={form.loja_id} 
            onChange={handleChange} 
            name="loja_id"
            options={lojas.map(l => ({ value: l.id, label: l.nome }))} 
            placeholder="Selecione a loja"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código" value={form.codigo} onChange={handleChange} name="codigo" placeholder="Código da venda" />
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchSelect label="Cliente" value={form.cliente_id} onChange={(val) => setForm(prev => ({ ...prev, cliente_id: val }))}
  options={clientes.map(c => ({ value: c.id, label: c.nome }))} placeholder="Digite o nome do cliente..." />
              </div>
              <button type="button" onClick={() => setShowNovoCliente(true)}
                className="h-[42px] px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 text-sm whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo
              </button>
            </div>
          </div>
          <Select label="Vendedor" value={form.vendedor_id} onChange={handleChange} name="vendedor_id"
            options={vendedores.map(v => ({ value: v.id, label: v.nome }))} placeholder="Selecione o vendedor" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Data" type="date" value={form.data_venda} onChange={handleChange} name="data_venda" required />
          <Select label="Situação" value={form.situacao} onChange={handleChange} name="situacao"
            options={[{ value: 'Finalizada', label: 'Finalizada' }, { value: 'Cancelada', label: 'Cancelada' }, { value: 'Em Aberto', label: 'Em Aberto' }]} />
          <Select label="Tipo Pagamento" value={form.tipo_pagamento} onChange={handleChange} name="tipo_pagamento"
            options={[{ value: 'À Vista', label: 'À Vista' }, { value: 'Parcelado', label: 'Parcelado' }, { value: 'Cartão', label: 'Cartão' }, { value: 'PIX', label: 'PIX' }]} />
        </div>

        {/* Itens da Venda */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3">Itens da Venda</h3>
          
          {/* Lista de itens */}
          {itens.length > 0 && (
            <div className="mb-4 space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-700">{item.produto_nome || `Produto #${item.produto_id}`}</span>
                  <span className="text-sm text-gray-500">Qtd: {item.quantidade}</span>
                  <span className="text-sm text-green-600 font-medium">{formatMoney(item.subtotal)}</span>
                  <button type="button" onClick={() => removerItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar item */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <SearchSelect label="" value={novoItem.produto_id} onChange={(val) => {
  const prod = produtos.find(p => p.id === Number(val));
  setNovoItem({ ...novoItem, produto_id: val, preco_unitario: prod?.preco_venda || 0, preco_custo: prod?.preco_custo || 0 });
}} options={produtos.map(p => ({ value: p.id, label: `${p.nome} - ${formatMoney(p.preco_venda || 0)}` }))} placeholder="Digite o nome do produto..." />
            <Input label="" type="number" value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseFloat(e.target.value) || 1 })} min={0.01} step="0.01" />
            <Input label="" type="number" value={novoItem.preco_unitario} onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })} step="0.01" />
            <Input label="" type="number" value={novoItem.preco_custo} onChange={(e) => setNovoItem({ ...novoItem, preco_custo: parseFloat(e.target.value) || 0 })} step="0.01" />
            <Button type="button" onClick={adicionarItem} variant="success" className="h-[42px]">+ Adicionar</Button>
          </div>
          
          {/* Total */}
          <div className="text-right mt-3 pt-3 border-t border-gray-200">
            <span className="text-lg font-bold text-gray-800">Total: {formatMoney(calcularTotal())}</span>
          </div>
        </div>

        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{venda ? 'Salvar' : 'Registrar Venda'}</Button>
        </div>
      </form>

      {/* Modal rápido de Novo Cliente */}
      {showNovoCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Novo Cliente Rápido</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input type="text" value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Nome do cliente" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="(11) 0000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                  <input type="text" value={novoCliente.celular} onChange={(e) => setNovoCliente({ ...novoCliente, celular: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="(11) 90000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                <input type="text" value={novoCliente.cpf_cnpj} onChange={(e) => setNovoCliente({ ...novoCliente, cpf_cnpj: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => setShowNovoCliente(false)}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium">
                Cancelar
              </button>
              <button type="button" onClick={criarClienteRapido} disabled={loadingCliente}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
                {loadingCliente && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
