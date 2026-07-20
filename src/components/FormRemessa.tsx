'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import SearchSelect from './SearchSelect';
import { Input, Select, TextArea, Button, formatMoney } from './FormElements';
import toast from 'react-hot-toast';
import { getLocalDateString } from '@/lib/dateUtils';

interface FormRemessaProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  remessa?: any | null;
}

export default function FormRemessa({ isOpen, onClose, onSaved, remessa }: FormRemessaProps) {
  const [form, setForm] = useState({
    loja_id: '',
    fornecedor_id: '',
    data_entrada: getLocalDateString(),
    observacao: '',
  });

  const [itens, setItens] = useState<any[]>([]);
  const [novoItem, setNovoItem] = useState<{ produto_id: string; quantidade: number | ''; preco_custo: number }>({ produto_id: '', quantidade: 1, preco_custo: 0 });
  const [lojas, setLojas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    carregarDados();
    if (remessa) {
      setForm({
        loja_id: remessa.loja_id?.toString() || '',
        fornecedor_id: remessa.fornecedor_id?.toString() || '',
        data_entrada: remessa.data_entrada?.split('T')[0] || new Date().toISOString().split('T')[0],
        observacao: remessa.observacao || '',
      });
      carregarItens(remessa.id);
    } else {
      setForm({
        loja_id: '',
        fornecedor_id: '',
        data_entrada: getLocalDateString(),
        observacao: '',
      });
      setItens([]);
    }
  }, [remessa, isOpen]);

  const carregarDados = async () => {
    const [l, f, p] = await Promise.all([
      supabase.from('lojas').select('id,nome').order('nome'),
      supabase.from('fornecedores').select('id,nome').order('nome'),
      supabase.from('produtos').select('id,nome,preco_custo,unidade').eq('ativo', true).eq('tipo', 'Produto').not('nome', 'ilike', '%usado%').order('nome'),
    ]);
    if (l.data) setLojas(l.data);
    if (f.data) setFornecedores(f.data);
    if (p.data) setProdutos(p.data);
  };

  const carregarItens = async (remessaId: number) => {
    const { data } = await supabase.from('remessas_itens').select('*, produtos(nome)').eq('remessa_id', remessaId);
    if (data) {
      const itensComNome = data.map(item => ({ ...item, produto_nome: item.produtos?.nome }));
      setItens(itensComNome);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id) { toast.error('Selecione um produto'); return; }
    if (!novoItem.quantidade || novoItem.quantidade <= 0) { toast.error('Quantidade deve ser maior que 0'); return; }

    const prod = produtos.find(p => p.id === Number(novoItem.produto_id));
    const itemJaExiste = itens.find(i => i.produto_id === Number(novoItem.produto_id));

    if (itemJaExiste) {
      // Se já existe, soma a quantidade
      setItens(prev => prev.map(i =>
        i.produto_id === Number(novoItem.produto_id)
          ? { ...i, quantidade: i.quantidade + novoItem.quantidade }
          : i
      ));
    } else {
      // Novo item
      setItens(prev => [...prev, {
        produto_id: Number(novoItem.produto_id),
        quantidade: novoItem.quantidade,
        preco_custo: novoItem.preco_custo || prod?.preco_custo || 0,
        produto_nome: prod?.nome,
        unidade: prod?.unidade || 'UN',
      }]);
    }

    setNovoItem({ produto_id: '', quantidade: 1, preco_custo: 0 });
  };

  const removerItem = (idx: number) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const calcularTotal = () => {
    return itens.reduce((acc, item) => acc + ((item.quantidade || 0) * (item.preco_custo || 0)), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.loja_id) { toast.error('Selecione a loja'); return; }
    if (itens.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    setLoading(true);

    try {
      const remessaData = {
        loja_id: parseInt(form.loja_id),
        fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id) : null,
        data_entrada: form.data_entrada,
        observacao: form.observacao,
      };

      const lojaId = parseInt(form.loja_id);

      if (remessa) {
        // Edição: reverte estoque antigo via RPC atômica (ajustar_estoque)
        const itensAntigos = await supabase.from('remessas_itens').select('*').eq('remessa_id', remessa.id);
        if (itensAntigos.data) {
          for (const item of itensAntigos.data) {
            const { error: erroEstorno } = await supabase.rpc('ajustar_estoque', {
              p_produto_id: item.produto_id,
              p_loja_id: lojaId,
              p_delta: -Math.abs(item.quantidade),
              p_tipo: 'Saída',
              p_motivo: 'Estorno de Remessa (edição)',
              p_referencia_id: remessa.id,
            });
            if (erroEstorno) throw erroEstorno;
          }
        }

        const { error } = await supabase.from('remessas').update(remessaData).eq('id', remessa.id);
        if (error) throw error;

        await supabase.from('remessas_itens').delete().eq('remessa_id', remessa.id);
        await supabase.from('remessas_itens').insert(itens.map(i => ({
          remessa_id: remessa.id,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          preco_custo: i.preco_custo,
        })));

        // Aplica novo estoque
        for (const item of itens) {
          await adicionarAoEstoque(lojaId, item.produto_id, item.quantidade, remessa.id);
        }

        toast.success('Remessa atualizada!');
      } else {
        // Criação: insere remessa e itens
        const { data, error } = await supabase.from('remessas').insert([remessaData]).select();
        if (error) throw error;

        if (data) {
          const remessaId = data[0].id;

          await supabase.from('remessas_itens').insert(itens.map(i => ({
            remessa_id: remessaId,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_custo: i.preco_custo,
          })));

          // Adiciona ao estoque da loja
          for (const item of itens) {
            await adicionarAoEstoque(lojaId, item.produto_id, item.quantidade, remessaId);
          }
        }

        toast.success('Remessa registrada!');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ajuste de estoque via RPC atômica (ajustar_estoque, definida em supabase/schema.sql).
  const adicionarAoEstoque = async (lojaId: number, produtoId: number, quantidade: number, remessaId: number) => {
    const { error } = await supabase.rpc('ajustar_estoque', {
      p_produto_id: produtoId,
      p_loja_id: lojaId,
      p_delta: Math.abs(quantidade),
      p_tipo: 'Entrada',
      p_motivo: 'Remessa',
      p_referencia_id: remessaId,
    });
    if (error) throw error;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={remessa ? 'Editar Remessa' : 'Nova Remessa'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select label="Loja *" value={form.loja_id} onChange={handleChange} name="loja_id"
            options={lojas.map(l => ({ value: l.id, label: l.nome }))} placeholder="Selecione a loja" required />
          <Select label="Fornecedor" value={form.fornecedor_id} onChange={handleChange} name="fornecedor_id"
            options={fornecedores.map(f => ({ value: f.id, label: f.nome }))} placeholder="Selecione ou deixe em branco" />
          <Input label="Data Entrada" type="date" value={form.data_entrada} onChange={handleChange} name="data_entrada" required />
        </div>

        {/* Itens da Remessa */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3">Itens da Remessa</h3>

          {itens.length > 0 && (
            <div className="mb-4 space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-700">{item.produto_nome || `Produto #${item.produto_id}`}</span>
                  <span className="text-sm text-gray-500">Qtd: {item.quantidade} {item.unidade}</span>
                  <span className="text-sm text-gray-400">R$: {formatMoney(item.preco_custo)}</span>
                  <span className="text-sm text-green-600 font-medium">{formatMoney(item.quantidade * item.preco_custo)}</span>
                  <button type="button" onClick={() => removerItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <SearchSelect label="Produto" value={novoItem.produto_id} onChange={(val) => {
              const prod = produtos.find(p => p.id === Number(val));
setNovoItem({ ...novoItem, produto_id: String(val), preco_custo: prod?.preco_custo || 0 });            }} options={produtos.map(p => ({ value: p.id, label: `${p.nome}` }))}
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
            <Input label="Preço Custo" type="number" value={novoItem.preco_custo}
              onChange={(e) => setNovoItem({ ...novoItem, preco_custo: parseFloat(e.target.value) || 0 })} step="0.01" placeholder="Preço de custo" />
            <div></div>
            <Button type="button" onClick={adicionarItem} variant="success" className="h-[42px]">+ Adicionar</Button>
          </div>

          <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Total de itens: <span className="font-medium">{itens.reduce((acc, i) => acc + i.quantidade, 0)}</span></span>
            <span className="text-lg font-bold text-gray-800">Valor Total: {formatMoney(calcularTotal())}</span>
          </div>
        </div>

        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{remessa ? 'Salvar' : 'Registrar Remessa'}</Button>
        </div>
      </form>
    </Modal>
  );
}