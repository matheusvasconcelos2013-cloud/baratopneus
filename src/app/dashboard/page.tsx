'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { formatMoney, formatDate } from '@/components/FormElements';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
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
  pneusGarantia: number;
}

type Periodo = 'dia' | 'mes' | 'ano';

const CORES_LOJAS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

// ---------- Helpers de data ----------
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dataRef, setDataRef] = useState(new Date());
  const [lojaAtiva, setLojaAtiva] = useState<string>(''); // '' = todas
  const [lojas, setLojas] = useState<any[]>([]);

  // Carregar dados salvos
  useEffect(() => {
    const savedPeriodo = localStorage.getItem('dashboard_periodo') as Periodo;
    const savedDataRef = localStorage.getItem('dashboard_dataRef');
    const savedLojaAtiva = localStorage.getItem('dashboard_lojaAtiva');

    if (savedPeriodo) setPeriodo(savedPeriodo);
    if (savedDataRef) setDataRef(new Date(savedDataRef));
    if (savedLojaAtiva !== null) setLojaAtiva(savedLojaAtiva);
  }, []);

  // Salvar dados quando mudarem
  useEffect(() => {
    localStorage.setItem('dashboard_periodo', periodo);
    localStorage.setItem('dashboard_dataRef', dataRef.toISOString());
    localStorage.setItem('dashboard_lojaAtiva', lojaAtiva);
  }, [periodo, dataRef, lojaAtiva]);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pneusPorLoja, setPneusPorLoja] = useState<Record<number, number>>({});
  const [pneusGarantiaPorLoja, setPneusGarantiaPorLoja] = useState<Record<number, number>>({});
  const [evolucao, setEvolucao] = useState<{ label: string; faturamento: number }[]>([]);

  const [lojaDetalhe, setLojaDetalhe] = useState<{ id: number; nome: string } | null>(null);
  const [vendasDetalhe, setVendasDetalhe] = useState<any[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('is_admin')
        .eq('email', session.user.email)
        .single();
      if (!colaborador?.is_admin) { router.push('/vendas'); return; }
      setUser(session.user);
      carregarLojas();
    });
  }, [router]);

  useEffect(() => {
    if (user) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, periodo, dataRef, lojaAtiva]);

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

      // 2) Quantidade de pneus vendidos e em garantia (produtos tipo = 'Produto') nas vendas do período
      const vendaIds = (vendasData || []).map(v => v.id);
      if (vendaIds.length > 0) {
        const { data: itensData, error: itensErr } = await supabase
          .from('vendas_itens')
          .select('venda_id, quantidade, garantia, produto:produtos(tipo)')
          .in('venda_id', vendaIds);

        if (itensErr) throw itensErr;

        const mapaVendaLoja: Record<number, number> = {};
        (vendasData || []).forEach(v => { mapaVendaLoja[v.id] = v.loja_id; });

        const pneusPorLojaTmp: Record<number, number> = {};
        const pneusGarantiaTmp: Record<number, number> = {};
        (itensData || []).forEach((item: any) => {
          const ehProduto = item.produto?.tipo === 'Produto';
          if (!ehProduto) return;
          const lojaId = mapaVendaLoja[item.venda_id];
          if (!lojaId) return;

          if (item.garantia) {
            pneusGarantiaTmp[lojaId] = (pneusGarantiaTmp[lojaId] || 0) + (item.quantidade || 0);
          } else {
            pneusPorLojaTmp[lojaId] = (pneusPorLojaTmp[lojaId] || 0) + (item.quantidade || 0);
          }
        });
        setPneusPorLoja(pneusPorLojaTmp);
        setPneusGarantiaPorLoja(pneusGarantiaTmp);
      } else {
        setPneusPorLoja({});
        setPneusGarantiaPorLoja({});
      }

      // 3) Evolução no período (agrupado por dia se 'mes'/'dia', por mês se 'ano')
      calcularEvolucao(vendasData || [], periodo);

      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
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

  const abrirDetalheLoja = async (loja: { id: number; nome: string }) => {
    setLojaDetalhe(loja);
    setLoadingDetalhe(true);
    try {
      const { inicio, fim } = getRangeData(periodo, dataRef);
      const { data, error } = await supabase
        .from('vendas')
        .select('id, codigo, valor_total, lucro_final, data_venda, situacao, cliente:clientes(nome), itens:vendas_itens(quantidade, preco_unitario, produto:produtos(nome))')
        .eq('loja_id', loja.id)
        .gte('data_venda', formatDateInput(inicio))
        .lte('data_venda', formatDateInput(fim))
        .neq('situacao', 'Cancelada')
        .order('data_venda', { ascending: false });

      if (error) throw error;
      setVendasDetalhe(data || []);
    } catch (err) {
      console.error('Erro ao carregar detalhe da loja:', err);
      setVendasDetalhe([]);
    } finally {
      setLoadingDetalhe(false);
    }
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
          pneusGarantia: pneusGarantiaPorLoja[loja.id] || 0,
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [lojas, vendas, pneusPorLoja, pneusGarantiaPorLoja, lojaAtiva]);

  const kpis = useMemo(() => {
    const faturamento = vendas.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const lucro = vendas.reduce((acc, v) => acc + (v.lucro_final || 0), 0);
    const totalVendas = vendas.length;
    const totalPneus = Object.values(pneusPorLoja).reduce((acc, q) => acc + q, 0);
    const totalPneusGarantia = Object.values(pneusGarantiaPorLoja).reduce((acc, q) => acc + q, 0);
    return {
      faturamento,
      lucro,
      totalVendas,
      ticketMedio: totalVendas > 0 ? faturamento / totalVendas : 0,
      totalPneus,
      totalPneusGarantia,
    };
  }, [vendas, pneusPorLoja, pneusGarantiaPorLoja]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

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

  if (loading && vendas.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard Administrativo</h1>
            <p className="text-gray-500 mt-1 capitalize">{labelPeriodo()}</p>
          </div>
        </header>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3 items-center">
          {[{ k: 'dia', l: 'Dia' }, { k: 'mes', l: 'Mês' }, { k: 'ano', l: 'Ano' }].map(i => (
            <button key={i.k} onClick={() => setPeriodo(i.k as Periodo)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${periodo === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {i.l}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => navegarPeriodo(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">◀</button>
            <span className="px-2 text-sm font-medium text-gray-700 min-w-[140px] text-center capitalize">{labelPeriodo()}</span>
            <button onClick={() => navegarPeriodo(1)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">▶</button>
          </div>

          <button onClick={() => setDataRef(new Date())}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
            Hoje
          </button>

          <select value={lojaAtiva} onChange={(e) => setLojaAtiva(e.target.value)}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">📍 Todas as Lojas</option>
            {lojas.map(loja => (
              <option key={loja.id} value={loja.id}>{loja.nome}</option>
            ))}
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard titulo="Faturamento" valor={formatMoney(kpis.faturamento)} cor="text-green-600" icone="💰" />
          <KpiCard titulo="Lucro" valor={formatMoney(kpis.lucro)} cor="text-blue-600" icone="📈" />
          <KpiCard titulo="Vendas" valor={kpis.totalVendas.toString()} cor="text-gray-800" icone="🧾" />
          <KpiCard titulo="Ticket Médio" valor={formatMoney(kpis.ticketMedio)} cor="text-purple-600" icone="🎯" />
          <KpiCard titulo="Pneus Vendidos" valor={kpis.totalPneus.toString()} cor="text-orange-600" icone="🛞" />
          <KpiCard titulo="Pneus em Garantia" valor={kpis.totalPneusGarantia.toString()} cor="text-red-600" icone="🛡️" />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Comparativo entre lojas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Faturamento por Loja</h2>
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

          {/* Evolução no período */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Evolução do Faturamento</h2>
            {evolucao.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
<Tooltip formatter={(v) => formatMoney(Number(v))} />                  <Line type="monotone" dataKey="faturamento" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabela comparativa entre lojas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Comparativo Detalhado por Loja</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Loja</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Vendas</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Faturamento</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Lucro</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Ticket Médio</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Pneus Vendidos</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-500">Pneus em Garantia</th>
                </tr>
              </thead>
              <tbody>
                {resumoPorLoja.map((r, idx) => (
                  <tr key={r.loja_id} onClick={() => abrirDetalheLoja({ id: r.loja_id, nome: r.nome })}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-6 text-sm font-medium text-gray-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CORES_LOJAS[idx % CORES_LOJAS.length] }} />
                      {r.nome}
                    </td>
                    <td className="py-3 px-6 text-sm text-right text-gray-600">{r.totalVendas}</td>
                    <td className="py-3 px-6 text-sm text-right text-green-600 font-medium">{formatMoney(r.faturamento)}</td>
                    <td className="py-3 px-6 text-sm text-right text-blue-600">{formatMoney(r.lucro)}</td>
                    <td className="py-3 px-6 text-sm text-right text-purple-600">{formatMoney(r.ticketMedio)}</td>
                    <td className="py-3 px-6 text-sm text-right text-orange-600 font-medium">{r.pneusVendidos}</td>
                    <td className="py-3 px-6 text-sm text-right text-red-600 font-medium">{r.pneusGarantia}</td>
                  </tr>
                ))}
                {resumoPorLoja.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma venda no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal isOpen={!!lojaDetalhe} onClose={() => setLojaDetalhe(null)} title={`Vendas — ${lojaDetalhe?.nome || ''}`} size="lg">
          {loadingDetalhe ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : vendasDetalhe.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nenhuma venda no período</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {vendasDetalhe.map((v) => (
                <div key={v.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800">#{v.codigo || v.id} — {v.cliente?.nome || 'Consumidor'}</p>
                      <p className="text-xs text-gray-500">{formatDate(v.data_venda)}</p>
                    </div>
                    <p className="text-green-600 font-medium">{formatMoney(v.valor_total || 0)}</p>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {(v.itens || []).map((it: any, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.quantidade}x {it.produto?.nome || 'Item'}</span>
                        <span>{formatMoney(it.preco_unitario || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}

function KpiCard({ titulo, valor, cor, icone }: { titulo: string; valor: string; cor: string; icone: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{titulo}</span>
        <span className="text-lg">{icone}</span>
      </div>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}