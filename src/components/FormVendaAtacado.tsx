'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { Input, TextArea, Button, formatMoney } from './FormElements';
import toast from 'react-hot-toast';
import { getLocalDateString } from '@/lib/dateUtils';
import { VendaAtacado } from '@/types';

interface FormVendaAtacadoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  venda?: VendaAtacado | null;
}

export default function FormVendaAtacado({ isOpen, onClose, onSaved, venda }: FormVendaAtacadoProps) {
  const [form, setForm] = useState({ comprador: '', data_venda: getLocalDateString(), frete: 0, observacao: '' });
  const [itens, setItens] = useState<any[]>([]);
  const [novoItem, setNovoItem] = useState({ medida: '', quantidade: 1, valor_unitario: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (venda) {
      setForm({
        comprador: venda.comprador || '',
        data_venda: venda.data_venda?.split('T')[0] || getLocalDateString(),
        frete: venda.frete || 0,
        observacao: venda.observacao || '',
      });
      carregarItens(venda.id);
    } else {
      setForm({ comprador: '', data_venda: getLocalDateString(), frete: 0, observacao: '' });
      setItens([]);
    }
    setNovoItem({ medida: '', quantidade: 1, valor_unitario: 0 });
  }, [venda, isOpen]);

  const carregarItens = async (vendaId: number) => {
    const { data, error } = await supabase.from('vendas_atacado_itens').select('*').eq('venda_atacado_id', vendaId).order('id');
    if (error) { toast.error(error.message); return; }
    setItens(data || []);
  };

  const adicionarItem = () => {
    if (!novoItem.medida.trim()) { toast.error('Informe a medida do pneu'); return; }
    const quantidade = Number(novoItem.quantidade) || 1;
    if (quantidade <= 0) { toast.error('Quantidade deve ser maior que zero'); return; }
    setItens(prev => [...prev, {
      medida: novoItem.medida.trim(),
      quantidade,
      valor_unitario: novoItem.valor_unitario || 0,
      subtotal: quantidade * (novoItem.valor_unitario || 0),
    }]);
    setNovoItem({ medida: '', quantidade: 1, valor_unitario: 0 });
  };

  const removerItem = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));

  const totalItens = () => itens.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
  const totalPedido = () => totalItens() + (Number(form.frete) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comprador.trim()) { toast.error('Informe o nome do comprador'); return; }
    if (itens.length === 0) { toast.error('Adicione pelo menos um pneu ao pedido'); return; }
    setLoading(true);
    try {
      const vendaData = {
        comprador: form.comprador.trim(),
        data_venda: form.data_venda,
        frete: Number(form.frete) || 0,
        observacao: form.observacao,
        valor_total: totalPedido(),
      };

      if (venda) {
        const { error } = await supabase.from('vendas_atacado').update(vendaData).eq('id', venda.id);
        if (error) throw error;

        await supabase.from('vendas_atacado_itens').delete().eq('venda_atacado_id', venda.id);
        const { error: itensError } = await supabase.from('vendas_atacado_itens').insert(
          itens.map(i => ({ venda_atacado_id: venda.id, medida: i.medida, quantidade: i.quantidade, valor_unitario: i.valor_unitario }))
        );
        if (itensError) throw itensError;

        toast.success('Venda atualizada!');
      } else {
        const { data, error } = await supabase.from('vendas_atacado').insert([vendaData]).select();
        if (error) throw error;

        const vendaId = data[0].id;
        const { error: itensError } = await supabase.from('vendas_atacado_itens').insert(
          itens.map(i => ({ venda_atacado_id: vendaId, medida: i.medida, quantidade: i.quantidade, valor_unitario: i.valor_unitario }))
        );
        if (itensError) throw itensError;

        toast.success('Venda no atacado registrada!');
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
    <Modal isOpen={isOpen} onClose={onClose} title={venda ? 'Editar Venda no Atacado' : 'Nova Venda no Atacado'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Comprador" value={form.comprador} onChange={(e) => setForm(prev => ({ ...prev, comprador: e.target.value }))}
            name="comprador" placeholder="Nome do comprador" required />
          <Input label="Data" type="text"
            value={form.data_venda.split('-').reverse().join('/')}
            onChange={(e) => {
              const [dia, mes, ano] = e.target.value.split('/');
              setForm(prev => ({ ...prev, data_venda: `${ano}-${mes}-${dia}` }));
            }}
            name="data_venda" placeholder="DD/MM/YYYY" />
        </div>

        {/* Itens do pedido */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3">Pneus do Pedido</h3>

          {itens.length > 0 && (
            <div className="mb-4 space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-700">{item.medida}</span>
                  <span className="text-sm text-gray-500">Qtd: {item.quantidade}</span>
                  <span className="text-sm text-gray-500">{formatMoney(item.valor_unitario)}/un</span>
                  <span className="text-sm text-green-600 font-medium">{formatMoney(item.quantidade * item.valor_unitario)}</span>
                  <button type="button" onClick={() => removerItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <Input label="Medida" value={novoItem.medida} onChange={(e) => setNovoItem({ ...novoItem, medida: e.target.value })}
              placeholder="Ex: 175/70 R13" />
            <Input label="Quantidade" type="number" value={novoItem.quantidade}
              onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseInt(e.target.value, 10) || 1 })} min={1} step="1" />
            <Input label="Valor Unitário" type="number" value={novoItem.valor_unitario}
              onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: parseFloat(e.target.value) || 0 })} step="0.01" min={0} />
            <Button type="button" onClick={adicionarItem} variant="success" className="h-[42px] mt-6">+ Adicionar</Button>
          </div>

          <div className="flex flex-col gap-1 pt-3 border-t border-gray-200 items-end">
            <span className="text-sm text-gray-600">Subtotal pneus: {formatMoney(totalItens())}</span>
            {Number(form.frete) > 0 && <span className="text-sm text-gray-600">Frete: {formatMoney(Number(form.frete))}</span>}
            <span className="text-lg font-bold text-gray-800">Total do Pedido: {formatMoney(totalPedido())}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Frete (opcional)" type="number" value={form.frete}
            onChange={(e) => setForm(prev => ({ ...prev, frete: parseFloat(e.target.value) || 0 }))} step="0.01" min={0} />
        </div>

        <TextArea label="Observação" value={form.observacao} onChange={(e) => setForm(prev => ({ ...prev, observacao: e.target.value }))} />

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>{venda ? 'Salvar' : 'Registrar Venda'}</Button>
        </div>
      </form>
    </Modal>
  );
}
