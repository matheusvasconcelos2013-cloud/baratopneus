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

const TEXTO_CAMBAGEM = `Veiculo apresenta desgaste excessivo na parte internas dos pneus que foram substituídos. Foi informado para o cliente que esse desgaste é provocado por irregularidade na cambagem do veiculo.
Cliente foi orientado que é necessário fazer a correção da cambagem do veiculo, pois referida avaria causadas pelo problema da cambagem nos pneus resulta na perda da garantia dos pneus adquiridos pelo cliente.`;

export default function FormVenda({ isOpen, onClose, onSaved, venda }: FormVendaProps) {
  const [form, setForm] = useState({
    codigo: '', loja_id: '', cliente_id: '', vendedor_id: '', valor_total: 0, lucro_parcial: 0,
    lucro_final: 0, data_venda: new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-'),
    situacao: 'Finalizada', tipo_pagamento: 'À Vista', observacao: ''
  });
  const [itens, setItens] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Colaborador[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoItem, setNovoItem] = useState<{ produto_id: string; quantidade: number | ''; preco_unitario: number; preco_custo: number; desconto: number; garantia: boolean }>({ produto_id: '', quantidade: 1, preco_unitario: 0, preco_custo: 0, desconto: 0, garantia: false });
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', celular: '', cpf_cnpj: '' });
  const [loadingCliente, setLoadingCliente] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    carregarDados();
    if (venda) {
      setForm({
        codigo: venda.codigo || '',
        loja_id: (venda as any).loja_id?.toString() || '',
        cliente_id: venda.cliente_id?.toString() || '',
        vendedor_id: venda.vendedor_id?.toString() || '',
        valor_total: venda.valor_total || 0,
        lucro_parcial: venda.lucro_parcial || 0,
        lucro_final: venda.lucro_final || 0,
        data_venda: venda.data_venda?.split('T')[0] || new Date().toISOString().split('T')[0],
        situacao: venda.situacao || 'Finalizada',
        tipo_pagamento: venda.tipo_pagamento || 'À Vista',
        observacao: venda.observacao || ''
      });
      carregarItens(venda.id);
    } else {
      setForm({ codigo: '', loja_id: '', cliente_id: '', vendedor_id: '', valor_total: 0, lucro_parcial: 0, lucro_final: 0, data_venda: new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-'), situacao: 'Finalizada', tipo_pagamento: 'À Vista', observacao: '' });
      setItens([]);
    }
  }, [venda, isOpen]);

  const carregarDados = async () => {
    const [c, v, p, l] = await Promise.all([
      supabase.from('clientes').select('id,nome').eq('status', 'Ativo').order('nome'),
      supabase.from('colaboradores').select('id,nome').eq('ativo', true).order('nome'),
      supabase.from('produtos').select('id,nome,preco_venda,preco_custo,quantidade_estoque').order('nome'),
      supabase.from('lojas').select('id,nome').order('nome'),
    ]);
    if (c.data) setClientes(c.data as any);
    if (v.data) setVendedores(v.data as any);
    if (p.data) setProdutos(p.data as any);
    if (l.data) setLojas(l.data as any);
  };

  const carregarItens = async (vendaId: number) => {
    const { data } = await supabase.from('vendas_itens').select('*').eq('venda_id', vendaId);
    if (data) setItens(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ['valor_total', 'lucro_parcial', 'lucro_final'].includes(name) ? parseFloat(value) || 0 : value }));
  };

  const calcularTotalVendas = () => {
    return itens.reduce((acc, item) => {
      if (item.garantia) return acc;
      return acc + (item.subtotal || 0);
    }, 0);
  };

  const calcularLucro = () => {
    const lucroVendas = itens.reduce((acc, item) => {
      if (item.garantia) return acc;
      return acc + ((item.preco_unitario - item.preco_custo) * item.quantidade) - (item.desconto || 0);
    }, 0);

    const custosGarantia = itens.filter(item => item.garantia).reduce((acc, item) => acc + (100 * item.quantidade), 0);

    return lucroVendas - custosGarantia;
  };

  const contarGarantias = () => {
    return itens.filter(item => item.garantia).reduce((acc, item) => acc + item.quantidade, 0);
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id) { toast.error('Selecione um produto'); return; }
    const prod = produtos.find(p => p.id === Number(novoItem.produto_id));
    const quantidade = Number(novoItem.quantidade) || 1;
    const precoUnitario = novoItem.preco_unitario || prod?.preco_venda || 0;
    const desconto = novoItem.desconto || 0;
    setItens(prev => [...prev, {
      produto_id: Number(novoItem.produto_id),
      quantidade,
      preco_unitario: precoUnitario,
      preco_custo: novoItem.preco_custo || prod?.preco_custo || 0,
      desconto,
      subtotal: novoItem.garantia ? 0 : Math.max(0, quantidade * precoUnitario - desconto),
      produto_nome: prod?.nome,
      garantia: novoItem.garantia
    }]);
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0, preco_custo: 0, desconto: 0, garantia: false });
  };

  const removerItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));

  const deduzirEstoque = async (lojaId: number, vendaId: number) => {
    for (const item of itens) {
      const { data: estoqueAtual } = await supabase
        .from('estoque_lojas')
        .select('id, quantidade')
        .eq('produto_id', item.produto_id)
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (estoqueAtual) {
        const novaQtd = Math.max(0, estoqueAtual.quantidade - item.quantidade);
        await supabase
          .from('estoque_lojas')
          .update({ quantidade: novaQtd, updated_at: new Date().toISOString() })
          .eq('id', estoqueAtual.id);
      } else {
        await supabase.from('estoque_lojas').insert([{
          produto_id: item.produto_id,
          loja_id: lojaId,
          quantidade: 0,
        }]);
      }

      await supabase.from('movimentacao_estoque').insert([{
        produto_id: item.produto_id,
        loja_id: lojaId,
        tipo: 'Saída',
        quantidade: item.quantidade,
        motivo: item.garantia ? 'Garantia' : 'Venda',
        referencia_id: vendaId,
      }]);
    }
  };

  const reverterEstoque = async (lojaId: number, vendaId: number) => {
    const { data: itensAntigos } = await supabase
      .from('vendas_itens').select('*').eq('venda_id', vendaId);
    if (!itensAntigos) return;

    for (const item of itensAntigos) {
      const { data: estoqueAtual } = await supabase
        .from('estoque_lojas')
        .select('id, quantidade')
        .eq('produto_id', item.produto_id)
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (estoqueAtual) {
        await supabase
          .from('estoque_lojas')
          .update({ quantidade: estoqueAtual.quantidade + item.quantidade, updated_at: new Date().toISOString() })
          .eq('id', estoqueAtual.id);
      }
    }
  };

  const criarClienteRapido = async () => {
    if (!novoCliente.nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    setLoadingCliente(true);
    try {
      const { data, error } = await supabase.from('clientes').insert([{
        nome: novoCliente.nome, telefone: novoCliente.telefone,
        celular: novoCliente.celular, cpf_cnpj: novoCliente.cpf_cnpj, status: 'Ativo',
      }]).select();
      if (error) throw error;
      if (data) {
        toast.success(`Cliente "${novoCliente.nome}" cadastrado!`);
        setForm(prev => ({ ...prev, cliente_id: data[0].id.toString() }));
        const { data: clientesAtualizados } = await supabase.from('clientes').select('id,nome').eq('status', 'Ativo').order('nome');
        if (clientesAtualizados) setClientes(clientesAtualizados as any);
        setShowNovoCliente(false);
        setNovoCliente({ nome: '', telefone: '', celular: '', cpf_cnpj: '' });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingCliente(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) { toast.error('Adicione pelo menos um item à venda'); return; }
    if (!form.loja_id) { toast.error('Selecione a loja'); return; }
    if (!form.vendedor_id) { toast.error('Selecione o vendedor'); return; }
    setLoading(true);

    try {
      const total = calcularTotalVendas();
      const lucro = calcularLucro();
      const lojaId = parseInt(form.loja_id);

      const vendaData = {
        ...form,
        loja_id: lojaId,
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        vendedor_id: form.vendedor_id ? parseInt(form.vendedor_id) : null,
        valor_total: total,
        lucro_final: lucro,
        lucro_parcial: lucro,
      };

      if (venda) {
        const lojaIdAntiga = (venda as any).loja_id;
        if (lojaIdAntiga) await reverterEstoque(lojaIdAntiga, venda.id);

        const { error } = await supabase.from('vendas').update(vendaData).eq('id', venda.id);
        if (error) throw error;

        await supabase.from('vendas_itens').delete().eq('venda_id', venda.id);
        await supabase.from('vendas_itens').insert(itens.map(i => ({
          venda_id: venda.id, produto_id: i.produto_id, quantidade: i.quantidade,
          preco_unitario: i.preco_unitario, preco_custo: i.preco_custo, desconto: i.desconto || 0, subtotal: i.subtotal
        })));

        await deduzirEstoque(lojaId, venda.id);

        await supabase.from('contas_financeiro').update({
          valor: total,
          descricao: `Venda #${form.codigo || venda.id} - ${clientes.find(c => c.id === parseInt(form.cliente_id))?.nome || 'Cliente'}`,
        }).eq('referencia_id', venda.id).eq('categoria', 'Venda');

        toast.success('Venda atualizada!');
      } else {
        const { data, error } = await supabase.from('vendas').insert([vendaData]).select();
        if (error) throw error;

        if (data) {
          const vendaId = data[0].id;

          await supabase.from('vendas_itens').insert(itens.map(i => ({
            venda_id: vendaId, produto_id: i.produto_id, quantidade: i.quantidade,
            preco_unitario: i.preco_unitario, preco_custo: i.preco_custo, desconto: i.desconto || 0, subtotal: i.subtotal
          })));

          await deduzirEstoque(lojaId, vendaId);

          const clienteNome = clientes.find(c => c.id === parseInt(form.cliente_id))?.nome || 'Cliente';
          await supabase.from('contas_financeiro').insert([{
            tipo: 'Receber',
            descricao: `Venda #${form.codigo || vendaId} - ${clienteNome}`,
            valor: total,
            data_vencimento: form.data_venda,
            pago: form.situacao === 'Finalizada',
            data_pagamento: form.situacao === 'Finalizada' ? form.data_venda : null,
            categoria: 'Venda',
            referencia_id: vendaId,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input label="Código" value={form.codigo} onChange={handleChange} name="codigo" placeholder="Código da venda" />
          <Select label="Loja *" value={form.loja_id} onChange={handleChange} name="loja_id"
            options={lojas.map(l => ({ value: l.id, label: l.nome }))} placeholder="Selecione a loja" />
          <div className="md:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchSelect label="Cliente" value={form.cliente_id}
                  onChange={(val) => setForm(prev => ({ ...prev, cliente_id: val.toString() }))}
                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                  placeholder="Digite o nome do cliente..." />
              </div>
              <button type="button" onClick={() => setShowNovoCliente(true)}
                className="h-[42px] px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 text-sm whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select label="Vendedor *" value={form.vendedor_id} onChange={handleChange} name="vendedor_id"
            options={vendedores.map(v => ({ value: v.id, label: v.nome }))} placeholder="Selecione o vendedor" />
          <Input
            label="Data"
            type="text"
            value={form.data_venda.split('-').reverse().join('/')}
            onChange={(e) => {
              const [dia, mes, ano] = e.target.value.split('/');
              setForm(prev => ({ ...prev, data_venda: `${ano}-${mes}-${dia}` }));
            }}
            name="data_venda"
            placeholder="DD/MM/YYYY"
            required
          />
          <Select label="Situação" value={form.situacao} onChange={handleChange} name="situacao"
            options={[{ value: 'Finalizada', label: 'Finalizada' }, { value: 'Cancelada', label: 'Cancelada' }, { value: 'Em Aberto', label: 'Em Aberto' }]} />
          <Select label="Tipo Pagamento" value={form.tipo_pagamento} onChange={handleChange} name="tipo_pagamento"
            options={[{ value: 'À Vista', label: 'À Vista' }, { value: 'Parcelado', label: 'Parcelado' }, { value: 'Cartão', label: 'Cartão' }, { value: 'PIX', label: 'PIX' }]} />
        </div>

        {/* Itens da Venda */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3">Itens da Venda</h3>

          {itens.length > 0 && (
            <div className="mb-4 space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-700">{item.produto_nome || `Produto #${item.produto_id}`}</span>
                  <span className="text-sm text-gray-500">Qtd: {item.quantidade}</span>
                  {item.desconto > 0 && (
                    <span className="text-sm text-red-500 text-xs">Desconto: -{formatMoney(item.desconto)}</span>
                  )}
                  {item.garantia ? (
                    <span className="text-sm text-red-600 font-medium">-R$ 100,00</span>
                  ) : (
                    <span className="text-sm text-green-600 font-medium">{formatMoney(item.subtotal)}</span>
                  )}
                  <button type="button" onClick={() => removerItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
            <SearchSelect label="Produto" value={novoItem.produto_id} onChange={(val) => {
              const prod = produtos.find(p => p.id === Number(val));
              setNovoItem({ ...novoItem, produto_id: val.toString(), preco_unitario: prod?.preco_venda || 0, preco_custo: prod?.preco_custo || 0 });
            }} options={produtos.map(p => ({ value: p.id, label: `${p.nome} - ${formatMoney(p.preco_venda || 0)}` }))}
              placeholder="Digite o nome do produto..." />
            <Input label="Quantidade" type="number" value={novoItem.quantidade}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') { setNovoItem({ ...novoItem, quantidade: '' }); return; }
                const val = parseInt(raw, 10);
                setNovoItem({ ...novoItem, quantidade: isNaN(val) ? '' : val });
              }}
              onBlur={() => { if (novoItem.quantidade === '') setNovoItem({ ...novoItem, quantidade: 1 }); }}
              min={1} step="1" />
            <Input label="Preço Unitário" type="number" value={novoItem.preco_unitario}
              onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })} step="0.01" />
            <Input label="Desconto" type="number" value={novoItem.desconto}
              onChange={(e) => setNovoItem({ ...novoItem, desconto: parseFloat(e.target.value) || 0 })} step="0.01" />
            <Button type="button" onClick={adicionarItem} variant="success" className="h-[42px] mt-6">+ Adicionar</Button>
          </div>

          <div className="flex items-center gap-2 mb-3 bg-white p-3 rounded-lg border border-gray-200">
            <input type="checkbox" checked={novoItem.garantia || false}
              onChange={(e) => setNovoItem({ ...novoItem, garantia: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded" />
            <label className="text-sm text-gray-600">Garantia</label>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
            <span className="text-sm text-gray-600">Total Vendas: <span className="font-medium text-blue-600">{formatMoney(calcularTotalVendas())}</span></span>
            {contarGarantias() > 0 && (
              <span className="text-sm text-red-600">Garantia: -{formatMoney(contarGarantias() * 100)}</span>
            )}
            <span className="text-lg font-bold text-gray-800">Lucro Final: {formatMoney(calcularLucro())}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
          <input type="checkbox" checked={form.observacao.includes(TEXTO_CAMBAGEM)}
            onChange={(e) => {
              setForm(prev => {
                if (e.target.checked) {
                  const obs = prev.observacao.trim() ? `${prev.observacao}\n\n${TEXTO_CAMBAGEM}` : TEXTO_CAMBAGEM;
                  return { ...prev, observacao: obs };
                }
                const obs = prev.observacao.replace(`\n\n${TEXTO_CAMBAGEM}`, '').replace(TEXTO_CAMBAGEM, '').trim();
                return { ...prev, observacao: obs };
              });
            }}
            className="w-4 h-4 text-blue-600 rounded" />
          <label className="text-sm text-gray-600">Cambagem</label>
        </div>

        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{venda ? 'Salvar' : 'Registrar Venda'}</Button>
        </div>
      </form>

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
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium">Cancelar</button>
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