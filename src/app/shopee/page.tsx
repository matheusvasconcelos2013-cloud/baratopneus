'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { formatMoney, formatDate } from '@/components/FormElements';

interface VendaItemRow {
  quantidade: number;
  produto: { nome: string } | null;
  loja: { nome: string } | null;
}

interface VendaRow {
  id: number;
  codigo: string;
  valor_total: number;
  lucro_final: number;
  data_venda: string;
  situacao: string;
  tipo_pagamento: string;
  cliente: { nome: string } | null;
  itens: VendaItemRow[];
}

export default function ShopeePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('is_admin')
        .ilike('email', session.user.email ?? '')
        .single();
      if (!colaborador?.is_admin) { router.push('/vendas'); return; }
      setUser(session.user);
      carregar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const carregar = async () => {
    setLoading(true);
    try {
      const { data: loja } = await supabase
        .from('lojas')
        .select('id')
        .eq('nome', 'Shopee')
        .maybeSingle();

      if (!loja) {
        setVendas([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vendas')
        .select('id, codigo, valor_total, lucro_final, data_venda, situacao, tipo_pagamento, cliente:clientes(nome), itens:vendas_itens(quantidade, produto:produtos(nome), loja:lojas(nome))')
        .eq('loja_id', loja.id)
        .neq('situacao', 'Cancelada')
        .order('data_venda', { ascending: false });

      if (error) throw error;
      setVendas((data as any) || []);
    } catch (err) {
      console.error('Erro ao carregar vendas Shopee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const hojeLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const vendasFiltradas = vendas.filter(v => {
    if (periodo === 'todos') return true;
    if (periodo === 'hoje') return v.data_venda === hojeLocal;
    const [ano, mes, dia] = v.data_venda.split('T')[0].split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (periodo === 'semana') return data >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return data >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  });

  const faturamento = vendasFiltradas.reduce((a, v) => a + (v.valor_total || 0), 0);
  const lucro = vendasFiltradas.reduce((a, v) => a + (v.lucro_final || 0), 0);
  const ticketMedio = vendasFiltradas.length > 0 ? faturamento / vendasFiltradas.length : 0;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🛒 Shopee</h1>
            <p className="text-gray-500 mt-1">{vendasFiltradas.length} vendas</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Faturamento</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(faturamento)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Lucro</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatMoney(lucro)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Margem</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{faturamento > 0 ? ((lucro / faturamento) * 100).toFixed(1) + '%' : '0%'}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Ticket Médio</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{formatMoney(ticketMedio)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-2">
          {[
            { k: 'hoje', l: 'Hoje' },
            { k: 'semana', l: '7 dias' },
            { k: 'mes', l: '30 dias' },
            { k: 'todos', l: 'Todas' },
          ].map(i => (
            <button key={i.k} onClick={() => setPeriodo(i.k as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${periodo === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i.l}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Itens (loja física)</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Lucro</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Pagto</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map(v => (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {(v.itens || []).map((item, idx) => (
                        <span key={idx} className="inline-block mr-2">
                          {item.produto?.nome || 'Item'} ({item.quantidade}x){item.loja?.nome ? ` — ${item.loja.nome}` : ''}
                        </span>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">{formatMoney(v.valor_total || 0)}</td>
                    <td className="py-3 px-4 text-sm text-right text-blue-600 font-medium">{formatMoney(v.lucro_final || 0)}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{formatDate(v.data_venda)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${v.tipo_pagamento === 'À Vista' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v.tipo_pagamento || '-'}</span>
                    </td>
                  </tr>
                ))}
                {vendasFiltradas.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma venda</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
