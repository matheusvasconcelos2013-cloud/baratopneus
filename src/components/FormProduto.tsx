'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { Input, Select, TextArea, Button } from './FormElements';
import { Produto } from '@/types';
import toast from 'react-hot-toast';

interface FormProdutoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  produto?: Produto | null;
}

export default function FormProduto({ isOpen, onClose, onSaved, produto }: FormProdutoProps) {
  const [form, setForm] = useState({
    codigo: '', nome: '', tipo: 'Produto', fabricante_id: '',
    preco_venda: 0, preco_custo: 0, unidade: 'UN',
    quantidade_estoque: 0, estoque_minimo: 0, observacao: '', ativo: true,
  });
  const [fabricantes, setFabricantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('fabricantes').select('*').order('nome').then(({ data }) => {
      if (data) setFabricantes(data);
    });
    if (produto) {
      setForm({
        codigo: produto.codigo || '', nome: produto.nome || '', tipo: produto.tipo || 'Produto',
        fabricante_id: produto.fabricante_id?.toString() || '',
        preco_venda: produto.preco_venda || 0, preco_custo: produto.preco_custo || 0,
        unidade: produto.unidade || 'UN', quantidade_estoque: produto.quantidade_estoque || 0,
        estoque_minimo: produto.estoque_minimo || 0, observacao: produto.observacao || '',
        ativo: produto.ativo !== false,
      });
    } else {
      setForm({ codigo: '', nome: '', tipo: 'Produto', fabricante_id: '', preco_venda: 0, preco_custo: 0, unidade: 'UN', quantidade_estoque: 0, estoque_minimo: 0, observacao: '', ativo: true });
    }
  }, [produto, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: ['preco_venda', 'preco_custo', 'quantidade_estoque', 'estoque_minimo'].includes(name) ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      const dados = { ...form, fabricante_id: form.fabricante_id ? parseInt(form.fabricante_id) : null };
      if (produto) {
        const { error } = await supabase.from('produtos').update(dados).eq('id', produto.id);
        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase.from('produtos').insert([dados]);
        if (error) throw error;
        toast.success('Produto cadastrado!');
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
    <Modal isOpen={isOpen} onClose={onClose} title={produto ? 'Editar Produto' : 'Novo Produto'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Código" value={form.codigo} onChange={handleChange} name="codigo" placeholder="Código interno" />
          <Input label="Nome" value={form.nome} onChange={handleChange} name="nome" placeholder="Nome do produto" required className="md:col-span-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select label="Tipo" value={form.tipo} onChange={handleChange} name="tipo"
            options={[{ value: 'Produto', label: 'Produto' }, { value: 'Serviço', label: 'Serviço' }]} />
          <Select label="Fabricante" value={form.fabricante_id} onChange={handleChange} name="fabricante_id"
            options={fabricantes.map(f => ({ value: f.id, label: f.nome }))} placeholder="Selecione" />
          <Input label="Unidade" value={form.unidade} onChange={handleChange} name="unidade" placeholder="UN, PC, KG" />
          <Input label="Preço Venda" type="number" value={form.preco_venda} onChange={handleChange} name="preco_venda" step="0.01" min={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Preço Custo" type="number" value={form.preco_custo} onChange={handleChange} name="preco_custo" step="0.01" min={0} />
          <Input label="Qtd. Estoque" type="number" value={form.quantidade_estoque} onChange={handleChange} name="quantidade_estoque" step="0.01" min={0} />
          <Input label="Estoque Mínimo" type="number" value={form.estoque_minimo} onChange={handleChange} name="estoque_minimo" step="0.01" min={0} />
        </div>
        <TextArea label="Observação" value={form.observacao} onChange={handleChange} name="observacao" />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="ativo" className="text-sm text-gray-700">Produto ativo</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{produto ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
