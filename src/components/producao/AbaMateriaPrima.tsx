'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input, Select, TextArea, Button, formatMoney, formatDate } from '@/components/FormElements';
import { getLocalDateString } from '@/lib/dateUtils';
import { Material, EntradaMateriaPrima } from '@/types';
import toast from 'react-hot-toast';

interface CustoAtual {
  material_id: number;
  nome: string;
  unidade_padrao: string;
  custo_unitario_atual: number;
  data_compra: string;
}

export default function AbaMateriaPrima() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [entradas, setEntradas] = useState<EntradaMateriaPrima[]>([]);
  const [custosAtuais, setCustosAtuais] = useState<CustoAtual[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const [form, setForm] = useState({
    material_id: '',
    data_compra: getLocalDateString(),
    fornecedor_id: '',
    quantidade_comprada: '',
    valor_unitario: '',
    observacao: '',
  });

  const carregar = async () => {
    setLoading(true);
    const [{ data: mats }, { data: ents, error }, { data: custos }, { data: forns }] = await Promise.all([
      supabase.from('materiais').select('*').eq('ativo', true).order('nome'),
      supabase.from('entrada_materia_prima').select('*, materiais(nome,unidade_padrao), fornecedor:fornecedores(id,nome)').order('data_compra', { ascending: false }),
      supabase.from('custo_materia_prima_atual').select('*'),
      supabase.from('fornecedores').select('id,nome').order('nome'),
    ]);
    if (error) toast.error(error.message);
    setMateriais(mats || []);
    setEntradas((ents as any) || []);
    setCustosAtuais(custos || []);
    setFornecedores(forns || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const materialSelecionado = materiais.find((m) => m.id === Number(form.material_id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.material_id || !form.quantidade_comprada || !form.valor_unitario) {
      toast.error('Selecione o material e preencha quantidade e valor.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('entrada_materia_prima').insert({
      material_id: parseInt(form.material_id),
      data_compra: form.data_compra,
      fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id) : null,
      quantidade_comprada: Number(form.quantidade_comprada),
      valor_unitario: Number(form.valor_unitario),
      observacao: form.observacao || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Compra de insumo registrada!');
      setForm({
        material_id: '',
        data_compra: getLocalDateString(),
        fornecedor_id: '',
        quantidade_comprada: '',
        valor_unitario: '',
        observacao: '',
      });
      carregar();
    }
    setSalvando(false);
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta compra de matéria-prima? Essa ação não pode ser desfeita.')) return;
    setExcluindoId(id);
    const { error } = await supabase.from('entrada_materia_prima').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Compra excluída.');
      carregar();
    }
    setExcluindoId(null);
  };

  const totalGeral = entradas.reduce((acc, e) => acc + Number(e.valor_total), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-xs">
        <p className="text-sm text-gray-500">Total investido em insumos</p>
        <p className="text-3xl font-bold text-purple-600 mt-1">{formatMoney(totalGeral)}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Nova compra de insumo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Select label="Material" name="material_id" value={form.material_id} onChange={handleChange}
            options={materiais.map((m) => ({ value: m.id, label: m.nome }))} placeholder="Selecione..." required />
          <Input label="Data da compra" type="date" name="data_compra" value={form.data_compra} onChange={handleChange} required />
          <Select label="Fornecedor" name="fornecedor_id" value={form.fornecedor_id} onChange={handleChange}
            options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} placeholder="Selecione ou deixe em branco" />
          <Input label={`Quantidade comprada${materialSelecionado ? ` (${materialSelecionado.unidade_padrao})` : ''}`}
            type="number" step="0.01" min={0} name="quantidade_comprada" value={form.quantidade_comprada} onChange={handleChange} required />
          <Input label={`Valor unitário (R$ por ${materialSelecionado?.unidade_padrao || 'unidade'})`}
            type="number" step="0.01" min={0} name="valor_unitario" value={form.valor_unitario} onChange={handleChange} required />
          <Input label="Observação" name="observacao" value={form.observacao} onChange={handleChange} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={salvando}>Registrar compra</Button>
        </div>
      </form>

      {custosAtuais.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-semibold text-gray-800 px-6 pt-5">Custo atual por material</h3>
          <p className="text-xs text-gray-400 px-6 pb-2">Última compra registrada — usado como sugestão ao lançar consumo de um lote</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left py-2.5 px-6 font-medium text-gray-500">Material</th>
                  <th className="text-right py-2.5 px-6 font-medium text-gray-500">Custo atual</th>
                  <th className="text-right py-2.5 px-6 font-medium text-gray-500">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {custosAtuais.map((c) => (
                  <tr key={c.material_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-6 font-medium text-gray-700">{c.nome}</td>
                    <td className="py-2.5 px-6 text-right text-gray-700">{formatMoney(c.custo_unitario_atual)} / {c.unidade_padrao}</td>
                    <td className="py-2.5 px-6 text-right text-gray-500">{formatDate(c.data_compra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Material</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Fornecedor</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Valor unitário</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Quantidade</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Valor total</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && entradas.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma compra registrada ainda.</td></tr>}
              {entradas.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{e.materiais?.nome}</td>
                  <td className="py-3 px-4 text-gray-600">{e.fornecedor?.nome || '-'}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatMoney(e.valor_unitario)} / {e.materiais?.unidade_padrao}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{e.quantidade_comprada}</td>
                  <td className="py-3 px-4 text-right font-medium text-green-600">{formatMoney(e.valor_total)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <button onClick={() => excluir(e.id)} disabled={excluindoId === e.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Excluir">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
