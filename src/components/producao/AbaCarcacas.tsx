'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input, Select, TextArea, Button, formatMoney, formatDate } from '@/components/FormElements';
import SearchSelect from '@/components/SearchSelect';
import { getLocalDateString } from '@/lib/dateUtils';
import { EntradaCarcaca } from '@/types';
import toast from 'react-hot-toast';

interface CustoMedio {
  medida: string;
  custo_medio_unitario: number;
  total_comprado: number;
  ultima_compra: string;
}

// Extrai a medida do nome do produto em estoque, ex: "Pneu Remold 175/70-13" -> "175/70-13"
function extrairMedida(nome: string): string {
  return nome.replace(/^pneus?\s+(remolds?|usados?)\b\s*/i, '').trim();
}

export default function AbaCarcacas() {
  const [entradas, setEntradas] = useState<EntradaCarcaca[]>([]);
  const [custosMedios, setCustosMedios] = useState<CustoMedio[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [medidasEstoque, setMedidasEstoque] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const [form, setForm] = useState({
    data_compra: getLocalDateString(),
    fornecedor_id: '',
    medida: '',
    quantidade: '',
    valor_unitario: '',
    observacao: '',
  });

  const carregar = async () => {
    setLoading(true);
    const [{ data: ents, error }, { data: custos }, { data: forns }, { data: prods }] = await Promise.all([
      supabase.from('entrada_carcacas').select('*, fornecedor:fornecedores(id,nome)').order('data_compra', { ascending: false }),
      supabase.from('custo_medio_carcaca_por_medida').select('*').order('medida'),
      supabase.from('fornecedores').select('id,nome').order('nome'),
      supabase.from('produtos').select('nome').eq('ativo', true).or('nome.ilike.%remold%,nome.ilike.%usado%'),
    ]);
    if (error) toast.error(error.message);
    setEntradas((ents as any) || []);
    setCustosMedios(custos || []);
    setFornecedores(forns || []);

    const medidas = (prods || [])
      .map((p) => extrairMedida(p.nome))
      .filter((m) => m.length > 0);
    setMedidasEstoque(Array.from(new Set(medidas)).sort());

    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medida || !form.quantidade || !form.valor_unitario) {
      toast.error('Preencha medida, quantidade e valor unitário.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('entrada_carcacas').insert({
      data_compra: form.data_compra,
      fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id) : null,
      medida: form.medida,
      quantidade: Number(form.quantidade),
      valor_unitario: Number(form.valor_unitario),
      observacao: form.observacao || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Entrada de carcaças registrada!');
      setForm({
        data_compra: getLocalDateString(),
        fornecedor_id: '',
        medida: form.medida,
        quantidade: '',
        valor_unitario: '',
        observacao: '',
      });
      carregar();
    }
    setSalvando(false);
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta entrada de carcaças? Essa ação não pode ser desfeita.')) return;
    setExcluindoId(id);
    const { error } = await supabase.from('entrada_carcacas').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Entrada excluída.');
      carregar();
    }
    setExcluindoId(null);
  };

  const totalCarcacas = entradas.reduce((acc, e) => acc + e.quantidade, 0);
  const totalInvestido = entradas.reduce((acc, e) => acc + Number(e.valor_total), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Carcaças recebidas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalCarcacas}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Valor total investido</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{formatMoney(totalInvestido)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Nova entrada de carcaças</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input label="Data da compra" type="date" name="data_compra" value={form.data_compra} onChange={handleChange} required />
          <Select label="Fornecedor" name="fornecedor_id" value={form.fornecedor_id} onChange={handleChange}
            options={fornecedores.map((f) => ({ value: f.id, label: f.nome }))} placeholder="Selecione ou deixe em branco" />
          <SearchSelect label="Medida (aro)" value={form.medida} onChange={(val) => setForm({ ...form, medida: String(val) })}
            options={medidasEstoque.map((m) => ({ value: m, label: m }))} placeholder="Digite ou selecione do estoque" allowCustom required />
          <Input label="Quantidade" type="number" name="quantidade" min={1} value={form.quantidade} onChange={handleChange} required />
          <Input label="Valor unitário (R$)" type="number" step="0.01" min={0} name="valor_unitario" value={form.valor_unitario} onChange={handleChange} required />
          <Input label="Observação" name="observacao" value={form.observacao} onChange={handleChange} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={salvando}>Registrar entrada</Button>
        </div>
      </form>

      {custosMedios.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="font-semibold text-gray-800 px-6 pt-5">Custo médio atual por medida</h3>
          <p className="text-xs text-gray-400 px-6 pb-2">Usado como sugestão ao lançar um lote de produção</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left py-2.5 px-6 font-medium text-gray-500">Medida</th>
                  <th className="text-right py-2.5 px-6 font-medium text-gray-500">Custo médio</th>
                  <th className="text-right py-2.5 px-6 font-medium text-gray-500">Total comprado</th>
                  <th className="text-right py-2.5 px-6 font-medium text-gray-500">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {custosMedios.map((c) => (
                  <tr key={c.medida} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-6 font-medium text-gray-700">{c.medida}</td>
                    <td className="py-2.5 px-6 text-right text-gray-700">{formatMoney(c.custo_medio_unitario)}</td>
                    <td className="py-2.5 px-6 text-right text-gray-500">{c.total_comprado}</td>
                    <td className="py-2.5 px-6 text-right text-gray-500">{formatDate(c.ultima_compra)}</td>
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
                <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Fornecedor</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Medida</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Quantidade</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Valor unitário</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Valor total</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && entradas.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma entrada registrada ainda.</td></tr>}
              {entradas.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{formatDate(e.data_compra)}</td>
                  <td className="py-3 px-4 text-gray-600">{e.fornecedor?.nome || '-'}</td>
                  <td className="py-3 px-4 text-gray-600">{e.medida}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{e.quantidade}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatMoney(e.valor_unitario)}</td>
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
