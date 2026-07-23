'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input, Select, Button, formatMoney, formatDate } from '@/components/FormElements';
import { getLocalDateString } from '@/lib/dateUtils';
import { Material, ResumoLoteProducao, LoteMaterialConsumido } from '@/types';
import toast from 'react-hot-toast';

interface CustoMedioCarcaca {
  medida: string;
  custo_medio_unitario: number;
}

interface CustoMaterial {
  material_id: number;
  nome: string;
  unidade_padrao: string;
  custo_unitario_atual: number;
}

interface ProdutoRef {
  id: number;
  nome: string;
  preco_venda: number;
}

export default function AbaLotes() {
  const [lotes, setLotes] = useState<ResumoLoteProducao[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [custosCarcaca, setCustosCarcaca] = useState<CustoMedioCarcaca[]>([]);
  const [custosMaterial, setCustosMaterial] = useState<CustoMaterial[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    data_producao: getLocalDateString(),
    medida: '',
    quantidade_carcacas_usadas: '',
    custo_unitario_carcaca: '',
    quantidade_produzida: '',
    loja_destino_id: '',
    observacao: '',
  });

  const [materiaisConsumidos, setMateriaisConsumidos] = useState<LoteMaterialConsumido[]>([]);
  const [novoMaterial, setNovoMaterial] = useState({ material_id: '', quantidade_consumida: '', custo_unitario: '' });

  const carregar = async () => {
    setLoading(true);
    const [{ data: lts, error }, { data: mats }, { data: lojasData }, { data: cCarcaca }, { data: cMaterial }, { data: prods }] = await Promise.all([
      supabase.from('resumo_lotes_producao').select('*'),
      supabase.from('materiais').select('*').eq('ativo', true).order('nome'),
      supabase.from('lojas').select('id,nome').eq('fisica', true).order('nome'),
      supabase.from('custo_medio_carcaca_por_medida').select('medida,custo_medio_unitario'),
      supabase.from('custo_materia_prima_atual').select('material_id,nome,unidade_padrao,custo_unitario_atual'),
      supabase.from('produtos').select('id,nome,preco_venda').eq('ativo', true).ilike('nome', '%remold%'),
    ]);
    if (error) toast.error(error.message);
    setLotes(lts || []);
    setMateriais(mats || []);
    setLojas(lojasData || []);
    setCustosCarcaca(cCarcaca || []);
    setCustosMaterial(cMaterial || []);
    setProdutos(prods || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMedidaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const medida = e.target.value;
    const sugestao = custosCarcaca.find((c) => c.medida.toLowerCase() === medida.toLowerCase());
    setForm((prev) => ({ ...prev, medida, custo_unitario_carcaca: sugestao ? String(sugestao.custo_medio_unitario) : prev.custo_unitario_carcaca }));
  };

  const handleMaterialSelecionado = (materialId: string) => {
    const custo = custosMaterial.find((c) => c.material_id === Number(materialId));
    setNovoMaterial({ material_id: materialId, quantidade_consumida: '', custo_unitario: custo ? String(custo.custo_unitario_atual) : '' });
  };

  const adicionarMaterial = () => {
    if (!novoMaterial.material_id || !novoMaterial.quantidade_consumida || Number(novoMaterial.quantidade_consumida) <= 0) {
      toast.error('Selecione o material e informe a quantidade consumida.');
      return;
    }
    const mat = materiais.find((m) => m.id === Number(novoMaterial.material_id));
    setMateriaisConsumidos((prev) => [...prev, {
      material_id: Number(novoMaterial.material_id),
      quantidade_consumida: Number(novoMaterial.quantidade_consumida),
      custo_unitario: Number(novoMaterial.custo_unitario) || 0,
      material_nome: mat?.nome,
      unidade: mat?.unidade_padrao,
    }]);
    setNovoMaterial({ material_id: '', quantidade_consumida: '', custo_unitario: '' });
  };

  const removerMaterial = (idx: number) => {
    setMateriaisConsumidos((prev) => prev.filter((_, i) => i !== idx));
  };

  const custoMateriaisTotal = materiaisConsumidos.reduce((acc, m) => acc + m.quantidade_consumida * m.custo_unitario, 0);
  const custoCarcacasTotal = (Number(form.quantidade_carcacas_usadas) || 0) * (Number(form.custo_unitario_carcaca) || 0);
  const custoPorPneuPrevisto = form.quantidade_produzida
    ? (custoCarcacasTotal + custoMateriaisTotal) / Number(form.quantidade_produzida)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medida || !form.quantidade_carcacas_usadas || !form.custo_unitario_carcaca || !form.quantidade_produzida) {
      toast.error('Preencha medida, carcaças usadas, custo unitário e quantidade produzida.');
      return;
    }
    if (Number(form.quantidade_produzida) > Number(form.quantidade_carcacas_usadas)) {
      toast.error('Quantidade produzida não pode ser maior que carcaças usadas.');
      return;
    }

    setSalvando(true);
    try {
      const { data, error } = await supabase.from('lotes_producao').insert({
        data_producao: form.data_producao,
        medida: form.medida,
        quantidade_carcacas_usadas: Number(form.quantidade_carcacas_usadas),
        custo_unitario_carcaca: Number(form.custo_unitario_carcaca),
        quantidade_produzida: Number(form.quantidade_produzida),
        loja_destino_id: form.loja_destino_id ? parseInt(form.loja_destino_id) : null,
        observacao: form.observacao || null,
      }).select().single();

      if (error) throw error;

      if (materiaisConsumidos.length > 0) {
        const { error: errMat } = await supabase.from('lote_materiais_consumidos').insert(
          materiaisConsumidos.map((m) => ({
            lote_id: data.id,
            material_id: m.material_id,
            quantidade_consumida: m.quantidade_consumida,
            custo_unitario: m.custo_unitario,
          }))
        );
        if (errMat) throw errMat;
      }

      toast.success('Lote de produção registrado!');
      setForm({
        data_producao: getLocalDateString(),
        medida: '',
        quantidade_carcacas_usadas: '',
        custo_unitario_carcaca: '',
        quantidade_produzida: '',
        loja_destino_id: '',
        observacao: '',
      });
      setMateriaisConsumidos([]);
      carregar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const encontrarPrecoVenda = (medida: string): ProdutoRef | undefined => {
    return produtos.find((p) => p.nome.toLowerCase().includes(medida.toLowerCase()));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Novo lote de produção</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input label="Data da produção" type="date" name="data_producao" value={form.data_producao} onChange={handleChange} required />
          <Input label="Medida" name="medida" value={form.medida} onChange={handleMedidaChange} placeholder="Ex: 175/70 R13" required />
          <Select label="Loja de destino" name="loja_destino_id" value={form.loja_destino_id} onChange={handleChange}
            options={lojas.map((l) => ({ value: l.id, label: l.nome }))} placeholder="Opcional" />
          <Input label="Carcaças usadas" type="number" min={1} name="quantidade_carcacas_usadas" value={form.quantidade_carcacas_usadas} onChange={handleChange} required />
          <Input label="Custo unitário da carcaça (R$)" type="number" step="0.01" min={0} name="custo_unitario_carcaca" value={form.custo_unitario_carcaca} onChange={handleChange} required />
          <Input label="Pneus produzidos" type="number" min={0} name="quantidade_produzida" value={form.quantidade_produzida} onChange={handleChange} required />
        </div>

        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-3">Insumos consumidos neste lote</h4>

          {materiaisConsumidos.length > 0 && (
            <div className="mb-4 space-y-2">
              {materiaisConsumidos.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-700">{m.material_nome}</span>
                  <span className="text-sm text-gray-500">{m.quantidade_consumida} {m.unidade}</span>
                  <span className="text-sm text-gray-400">{formatMoney(m.custo_unitario)}/{m.unidade}</span>
                  <span className="text-sm text-green-600 font-medium">{formatMoney(m.quantidade_consumida * m.custo_unitario)}</span>
                  <button type="button" onClick={() => removerMaterial(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select label="Material" value={novoMaterial.material_id} onChange={(e) => handleMaterialSelecionado(e.target.value)}
              options={materiais.map((m) => ({ value: m.id, label: m.nome }))} placeholder="Selecione..." />
            <Input label="Quantidade consumida" type="number" step="0.01" min={0} value={novoMaterial.quantidade_consumida}
              onChange={(e) => setNovoMaterial({ ...novoMaterial, quantidade_consumida: e.target.value })} />
            <Input label="Custo unitário (R$)" type="number" step="0.01" min={0} value={novoMaterial.custo_unitario}
              onChange={(e) => setNovoMaterial({ ...novoMaterial, custo_unitario: e.target.value })} />
            <Button type="button" onClick={adicionarMaterial} variant="success" className="h-[42px] mt-auto">+ Adicionar</Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-500 space-x-4">
            <span>Custo carcaças: <span className="font-medium text-gray-700">{formatMoney(custoCarcacasTotal)}</span></span>
            <span>Custo materiais: <span className="font-medium text-gray-700">{formatMoney(custoMateriaisTotal)}</span></span>
          </div>
          <span className="text-lg font-bold text-gray-800">Custo previsto por pneu: {formatMoney(custoPorPneuPrevisto)}</span>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={salvando}>Registrar lote</Button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h3 className="font-semibold text-gray-800 px-6 pt-5 pb-2">Histórico de produção</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Medida</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Produzidos</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Refugo</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Custo total</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Custo/pneu</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Preço venda</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Margem</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && lotes.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum lote registrado ainda.</td></tr>}
              {lotes.map((l) => {
                const produto = encontrarPrecoVenda(l.medida);
                const margem = produto ? produto.preco_venda - l.custo_por_pneu : null;
                return (
                  <tr key={l.lote_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{formatDate(l.data_producao)}</td>
                    <td className="py-3 px-4 text-gray-600">{l.medida}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{l.quantidade_produzida}</td>
                    <td className={`py-3 px-4 text-right ${l.quantidade_refugo > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{l.quantidade_refugo}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatMoney(l.custo_total)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800">{formatMoney(l.custo_por_pneu)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{produto ? formatMoney(produto.preco_venda) : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {margem === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={`font-semibold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {margem >= 0 ? '+' : ''}{formatMoney(margem)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {produtos.length === 0 && !loading && (
          <p className="text-xs text-gray-400 px-6 py-3 border-t border-gray-100">
            Nenhum produto com "remold" no nome encontrado em /produtos — a coluna de margem fica vazia até existir um produto correspondente à medida para comparar o preço de venda.
          </p>
        )}
      </div>
    </div>
  );
}
