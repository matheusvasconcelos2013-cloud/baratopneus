'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ---------- Tipos ----------
interface Venda {
  id: number;
  loja_id: number;
  valor_total: number;
  lucro_final: number;
  data_venda: string;
  situacao: string;
}

interface LojaResumo {
  loja_id: number;
  nome: string;
  faturamento: number;
  lucro: number;
  totalVendas: number;
  ticketMedio: number;
  pneusVendidos: number;
}

type Periodo = 'dia' | 'mes' | 'ano';

const CORES_LOJAS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

// ---------- Helpers ----------
function getRangeData(periodo: Periodo, dataRef: Date) {
  const inicio = new Date(dataRef);
  const fim = new Date(dataRef);

  if (periodo === 'dia') {
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(23, 59, 59, 999);
  } else if (periodo === 'mes') {
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    fim.setMonth(fim.getMonth() + 1, 0);
    fim.setHours(23, 59, 59, 999);
  } else {
    inicio.setMonth(0, 1);
    inicio.setHours(0, 0, 0, 0);
    fim.setMonth(11, 31);
    fim.setHours(23, 59, 59, 999);
  }
  return { inicio, fim };
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default function DashboardAdmin() {
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dataRef, setDataRef] = useState(new Date());
  const [lojaAtiva, setLojaAtiva] = useState<string>('');
  const [lojas, setLojas] = useState<any[]>([]);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pneusPorLoja, setPneusPorLoja] = useState<Record<number, number>>({});
  const [evolucao, setEvolucao] = useState<{ label: string; faturamento: number }[]>([]);

  useEffect(() => {
    carregarLojas();
  }, []);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, dataRef, lojaAtiva]);

  const carregarLojas = async () => {
    const { data } = await supabase.from('lojas').select('id, nome').order('nome');
    if (data) setLojas(data);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { inicio, fim } = getRangeData(periodo, dataRef);

      // 1) Vendas do período (exclui canceladas)
      let query = supabase
        .from('vendas')
        .select('id, loja_id, valor_total, lucro_final, data_venda, situacao')
        .gte('data_venda', formatDateInput(inicio))
        .lte('data_venda', formatDateInput(fim))
        .neq('situacao', 'Cancelada');

      if (lojaAtiva) query = query.eq('loja_id', parseInt(lojaAtiva));

      const { data: vendasData, error: vendasErr } = await query;
      if (vendasErr) throw vendasErr;
      setVendas(vendasData || []);

      // 2) Quantidade de pneus vendidos (produtos tipo = 'Produto') no período
      const vendaIds = (vendasData || []).map(v => v.id);
      if (vendaIds.length > 0) {
        const { data: itensData, error: itensErr } = await supabase
          .from('vendas_itens')
          .select('venda_id, quantidade, produto:produtos(tipo)')
          .in('venda_id', vendaIds);

        if (itensErr) throw itensErr;

        const mapaVendaLoja: Record<number, number> = {};
        (vendasData || []).forEach(v => { mapaVendaLoja[v.id] = v.loja_id; });

        const pneusPorLojaTmp: Record<number, number> = {};
        (itensData || []).forEach((item: any) => {
          const ehProduto = item.produto?.tipo === 'Produto';
          if (!ehProduto) return;
          const lojaId = mapaVendaLoja[item.venda_id];
          if (!lojaId) return;
          pneusPorLojaTmp[lojaId] = (pneusPorLojaTmp[lojaId] || 0) + (item.quantidade || 0);
        });
        setPneusPorLoja(pneusPorLojaTmp);
      } else {
        setPneusPorLoja({});
      }

      // 3) Evolução no período
      calcularEvolucao(vendasData || [], periodo);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      toast.error(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calcularEvolucao = (vendasData: Venda[], periodoAtual: Periodo) => {
    const mapa: Record<string, number> = {};

    vendasData.forEach(v => {
      const d = new Date(v.data_venda);
      let label: string;
      if (periodoAtual === 'ano') {
        label = d.toLocaleDateString('pt-BR', { month: 'short' });
      } else {
        label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }
      mapa[label] = (mapa[label] || 0) + (v.valor_total || 0);
    });

    const arr = Object.entries(mapa)
      .map(([label, faturamento]) => ({ label, faturamento }))
      .sort((a, b) => a.label.localeCompare(b.label));

    setEvolucao(arr);
  };

  // ---------- Agregações ----------
  const resumoPorLoja: LojaResumo[] = useMemo(() => {
    return lojas
      .filter(l => !lojaAtiva || l.id === parseInt(lojaAtiva))
      .map(loja => {
        const vendasLoja = vendas.filter(v => v.loja_id === loja.id);
        const faturamento = vendasLoja.reduce((acc, v) => acc + (v.valor_total || 0), 0);
        const lucro = vendasLoja.reduce((acc, v) => acc + (v.lucro_final || 0), 0);
        const totalVendas = vendasLoja.length;
        return {
          loja_id: loja.id,
          nome: loja.nome,
          faturamento,
          lucro,
          totalVendas,
          ticketMedio: totalVendas > 0 ? faturamento / totalVendas : 0,
          pneusVendidos: pneusPorLoja[loja.id] || 0,
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [lojas, vendas, pneusPorLoja, lojaAtiva]);

  const kpis = useMemo(() => {
    const faturamento = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const lucro = vendas.reduce((acc, v) => acc + (v.lucro_final || 0), 0);
    const totalVendas = vendas.length;
    const totalPneus = Object.values(pneusPorLoja).reduce((acc, q) => acc + q, 0);
    return {
      faturamento,
      lucro,
      totalVendas,
      ticketMedio: totalVendas > 0 ? faturamento / totalVendas : 0,
      totalPneus,
    };
  }, [vendas, pneusPorLoja]);

  const navegarPeriodo = (direcao: 1 | -1) => {
    const nova = new Date(dataRef);
    if (periodo === 'dia') nova.setDate(nova.getDate() + direcao);
    else if (periodo === 'mes') nova.setMonth(nova.getMonth() + direcao);
    else nova.setFullYear(nova.getFullYear() + direcao);
    setDataRef(nova);
  };

  const labelPeriodo = () => {
    if (periodo === 'dia') return dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (periodo === 'mes') return dataRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return dataRef.getFullYear().toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard Administrativo</h1>
        <p className="text-gray-500 mt-1 capitalize">{labelPeriodo()}</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        {[{ k: 'dia', l: 'Dia' }, { k: 'mes', l: 'Mês' }, { k: 'ano', l: 'Ano' }].map(i => (
          <button key={i.k} onClick={() => setPeriodo(i.k as Periodo)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${periodo === i.k ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {i.l}
          </button>
        ))}

        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => navegarPeriodo(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">◀</button>
          <span className="px-2 text-sm font-medium text-gray-700 min-w-[140px] text-center capitalize">{labelPeriodo()}</span>
          <button onClick={() => navegarPeriodo(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">▶</button>
        </div>

        <button onClick={() => setDataRef(new Date())}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
          Hoje
        </button>

        <select value={lojaAtiva} onChange={(e) => setLojaAtiva(e.target.value)}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none bg-white">
          <option value="">📍 Todas as Lojas</option>
          {lojas.map(loja => (
            <option key={loja.id} value={loja.id}>{loja.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard titulo="Faturamento" valor={formatMoney(kpis.faturamento)} borda="border-green-500" />
            <KpiCard titulo="Lucro" valor={formatMoney(kpis.lucro)} borda="border-blue-500" />
            <KpiCard titulo="Vendas" valor={kpis.totalVendas.toString()} borda="border-gray-400" />
            <KpiCard titulo="Ticket Médio" valor={formatMoney(kpis.ticketMedio)} borda="border-purple-500" />
            <KpiCard titulo="Pneus Vendidos" valor={kpis.totalPneus.toString()} borda="border-orange-500" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Faturamento por Loja</h2>
              {resumoPorLoja.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={resumoPorLoja}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Bar dataKey="faturamento" radius={[6, 6, 0, 0]}>
                      {resumoPorLoja.map((_, idx) => (
                        <Cell key={idx} fill={CORES_LOJAS[idx % CORES_LOJAS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Evolução do Faturamento</h2>
              {evolucao.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolucao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Line type="monotone" dataKey="faturamento" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Comparativo detalhado por loja */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Comparativo Detalhado por Loja</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 font-semibold text-gray-700">Loja</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-700">Vendas</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-700">Faturamento</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-700">Lucro</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-700">Ticket Médio</th>
                    <th className="text-right py-3 px-6 font-semibold text-gray-700">Pneus Vendidos</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPorLoja.map((r, idx) => (
                    <tr key={r.loja_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-6 text-gray-700 font-medium flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CORES_LOJAS[idx % CORES_LOJAS.length] }} />
                        {r.nome}
                      </td>
                      <td className="text-right py-3 px-6 text-gray-700">{r.totalVendas}</td>
                      <td className="text-right py-3 px-6 text-green-600 font-semibold">{formatMoney(r.faturamento)}</td>
                      <td className="text-right py-3 px-6 text-purple-600 font-semibold">{formatMoney(r.lucro)}</td>
                      <td className="text-right py-3 px-6 text-orange-600">{formatMoney(r.ticketMedio)}</td>
                      <td className="text-right py-3 px-6 text-orange-600 font-semibold">{r.pneusVendidos}</td>
                    </tr>
                  ))}
                  {resumoPorLoja.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma venda no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

function KpiCard({ titulo, valor, borda }: { titulo: string; valor: string; borda: string }) {
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${borda}`}>
      <p className="text-gray-600 text-sm font-medium">{titulo}</p>
      <p className="text-2xl font-bold text-gray-800 mt-2">{valor}</p>
    </div>
  );
}