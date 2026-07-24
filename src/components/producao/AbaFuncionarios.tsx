'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input, Select, Button, formatMoney, formatDate } from '@/components/FormElements';
import { getLocalDateString } from '@/lib/dateUtils';
import { FuncionarioProducao, PagamentoFuncionario, ResumoPagamentoFuncionario } from '@/types';
import toast from 'react-hot-toast';

export default function AbaFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioProducao[]>([]);
  const [resumos, setResumos] = useState<ResumoPagamentoFuncionario[]>([]);
  const [lancamentos, setLancamentos] = useState<PagamentoFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [filtroFuncionario, setFiltroFuncionario] = useState('');

  const [form, setForm] = useState({
    funcionario_id: '',
    data_pagamento: getLocalDateString(),
    tipo: 'Vale',
    valor: '',
    observacao: '',
  });

  const carregar = async () => {
    setLoading(true);
    const [{ data: funcs }, { data: res }, { data: lancs, error }] = await Promise.all([
      supabase.from('funcionarios_producao').select('*').eq('ativo', true).order('nome'),
      supabase.from('resumo_pagamentos_funcionarios').select('*'),
      supabase.from('pagamentos_funcionarios').select('*, funcionario:funcionarios_producao(nome)').order('data_pagamento', { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    setFuncionarios(funcs || []);
    setResumos(res || []);
    setLancamentos((lancs as any) || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.funcionario_id || !form.valor || Number(form.valor) <= 0) {
      toast.error('Selecione o funcionário e informe um valor válido.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.from('pagamentos_funcionarios').insert({
      funcionario_id: parseInt(form.funcionario_id),
      data_pagamento: form.data_pagamento,
      tipo: form.tipo,
      valor: Number(form.valor),
      observacao: form.observacao || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${form.tipo} registrado!`);
      setForm({
        funcionario_id: form.funcionario_id,
        data_pagamento: getLocalDateString(),
        tipo: 'Vale',
        valor: '',
        observacao: '',
      });
      carregar();
    }
    setSalvando(false);
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este lançamento? Essa ação não pode ser desfeita.')) return;
    setExcluindoId(id);
    const { error } = await supabase.from('pagamentos_funcionarios').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Lançamento excluído.');
      carregar();
    }
    setExcluindoId(null);
  };

  const totalGeral = resumos.reduce((acc, r) => acc + Number(r.total_geral), 0);
  const totalVales = resumos.reduce((acc, r) => acc + Number(r.total_vales), 0);
  const totalPagamentos = resumos.reduce((acc, r) => acc + Number(r.total_pagamentos), 0);

  const lancamentosFiltrados = filtroFuncionario
    ? lancamentos.filter((l) => l.funcionario_id === parseInt(filtroFuncionario))
    : lancamentos;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total pago (vales + pagamentos)</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{formatMoney(totalGeral)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total em pagamentos</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{formatMoney(totalPagamentos)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total em vales</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{formatMoney(totalVales)}</p>
        </div>
      </div>

      {/* Cards por funcionário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {resumos.map((r) => (
          <div key={r.funcionario_id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="font-semibold text-gray-800">{r.nome}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatMoney(r.total_geral)}</p>
            <div className="text-xs text-gray-500 mt-2 space-y-0.5">
              <p>Pagamentos: <span className="font-medium text-green-600">{formatMoney(r.total_pagamentos)}</span></p>
              <p>Vales: <span className="font-medium text-amber-600">{formatMoney(r.total_vales)}</span></p>
              <p>Último lançamento: {r.ultimo_lancamento ? formatDate(r.ultimo_lancamento) : '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Novo pagamento / vale</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select label="Funcionário" name="funcionario_id" value={form.funcionario_id} onChange={handleChange}
            options={funcionarios.map((f) => ({ value: f.id, label: f.nome }))} placeholder="Selecione..." required />
          <Input label="Data" type="date" name="data_pagamento" value={form.data_pagamento} onChange={handleChange} required />
          <Select label="Tipo" name="tipo" value={form.tipo} onChange={handleChange}
            options={[{ value: 'Vale', label: 'Vale' }, { value: 'Pagamento', label: 'Pagamento' }]} required />
          <Input label="Valor (R$)" type="number" step="0.01" min={0} name="valor" value={form.valor} onChange={handleChange} required />
          <Input label="Observação" name="observacao" value={form.observacao} onChange={handleChange} className="md:col-span-4" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={salvando}>Registrar</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h3 className="font-semibold text-gray-800">Histórico de lançamentos</h3>
          <select value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">Todos os funcionários</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Funcionário</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Observação</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Valor</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && lancamentosFiltrados.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum lançamento registrado ainda.</td></tr>}
              {lancamentosFiltrados.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{formatDate(l.data_pagamento)}</td>
                  <td className="py-3 px-4 text-gray-600">{l.funcionario?.nome}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.tipo === 'Vale' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {l.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{l.observacao || '-'}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">{formatMoney(l.valor)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <button onClick={() => excluir(l.id)} disabled={excluindoId === l.id}
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
