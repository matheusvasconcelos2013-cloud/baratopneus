'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { Button, formatMoney, formatDate } from '@/components/FormElements';

export default function RelatoriosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [relatorio, setRelatorio] = useState<any>(null);
  const [vendasRecentes, setVendasRecentes] = useState<any[]>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user); gerarRelatorio();
    });
  }, [router]);

  const gerarRelatorio = async (p = periodo) => {
    setLoading(true);
    setPeriodo(p);

    const dias = p === 'hoje' ? 1 : p === 'semana' ? 7 : p === 'mes' ? 30 : 365;
    const dataInicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: vendas } = await supabase
      .from('vendas')
      .select('*, cliente:clientes(nome)')
      .gte('data_venda', dataInicio)
      .eq('situacao', 'Finalizada')
      .order('data_venda', { ascending: false });

    if (vendas) {
      const total = vendas.reduce((a: number, v: any) => a + (v.valor_total || 0), 0);
      const lucro = vendas.reduce((a: number, v: any) => a + (v.lucro_final || 0), 0);
      setRelatorio({ total, lucro, qtd: vendas.length, margem: total > 0 ? (lucro / total) * 100 : 0 });
      setVendasRecentes(vendas.slice(0, 20));

      // Top clientes
      const clientesMap = new Map<string, { nome: string; total: number; qtd: number }>();
      vendas.forEach((v: any) => {
        const nome = v.cliente?.nome || 'Consumidor';
        if (!clientesMap.has(nome)) clientesMap.set(nome, { nome, total: 0, qtd: 0 });
        const item = clientesMap.get(nome)!;
        item.total += v.valor_total || 0;
        item.qtd += 1;
      });
      setTopClientes(Array.from(clientesMap.values()).sort((a, b) => b.total - a.total).slice(0, 10));
    }

    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const imprimir = () => window.print();

  return (
    <div className="flex min-h-screen bg-gray-50 print:bg-white">
      <div className="hidden print:hidden"><Sidebar user={user} onLogout={handleLogout} /></div>
      <main className="flex-1 p-8 print:p-4">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 Relatórios</h1>
            <p className="text-gray-500 mt-1">Análise de vendas e desempenho</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={imprimir} variant="secondary">🖨️ Imprimir</Button>
            <Button onClick={() => gerarRelatorio(periodo)}>Atualizar</Button>
          </div>
        </header>

        <div className="print:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-2">
          {[{ k: 'hoje', l: 'Hoje' }, { k: 'semana', l: '7 dias' }, { k: 'mes', l: '30 dias' }, { k: 'ano', l: 'Último ano' }].map(i => (
            <button key={i.k} onClick={() => gerarRelatorio(i.k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${periodo === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i.l}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            {/* Cards de resumo */}
            {relatorio && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <p className="text-blue-100 text-sm">Vendas no período</p>
                  <p className="text-3xl font-bold mt-1">{relatorio.qtd}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <p className="text-green-100 text-sm">Faturamento</p>
                  <p className="text-3xl font-bold mt-1">{formatMoney(relatorio.total)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <p className="text-purple-100 text-sm">Lucro</p>
                  <p className="text-3xl font-bold mt-1">{formatMoney(relatorio.lucro)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <p className="text-orange-100 text-sm">Margem</p>
                  <p className="text-3xl font-bold mt-1">{relatorio.margem.toFixed(1)}%</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clientes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🏆 Top Clientes</h2>
                <div className="space-y-3">
                  {topClientes.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{i + 1}</span>
                        <span className="text-sm text-gray-700">{c.nome}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-green-600">{formatMoney(c.total)}</span>
                        <span className="text-xs text-gray-400 ml-2">({c.qtd} vendas)</span>
                      </div>
                    </div>
                  ))}
                  {topClientes.length === 0 && <p className="text-gray-400 text-center py-4">Sem dados no período</p>}
                </div>
              </div>

              {/* Últimas Vendas */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🕐 Últimas Vendas</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {vendasRecentes.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{v.cliente?.nome || 'Consumidor'}</p>
                        <p className="text-xs text-gray-400">{formatDate(v.data_venda)}</p>
                      </div>
                      <span className="text-sm font-medium text-green-600">{formatMoney(v.valor_total || 0)}</span>
                    </div>
                  ))}
                  {vendasRecentes.length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma venda no período</p>}
                </div>
              </div>
            </div>

            {/* Rodapé do relatório para impressão */}
            <div className="hidden print:block mt-8 text-center text-sm text-gray-400">
              Relatório gerado em {new Date().toLocaleString('pt-BR')} - BS Oficina Web
            </div>
          </>
        )}
      </main>
    </div>
  );
}
