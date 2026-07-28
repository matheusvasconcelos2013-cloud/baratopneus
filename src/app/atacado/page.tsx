'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import FormVendaAtacado from '@/components/FormVendaAtacado';
import { Button, formatMoney, formatDate } from '@/components/FormElements';
import { VendaAtacado } from '@/types';
import toast from 'react-hot-toast';

interface VendaAtacadoComItens extends Omit<VendaAtacado, 'itens'> {
  itens: { id: number; medida: string; quantidade: number; valor_unitario: number; subtotal: number }[];
}

interface LinhaRelatorio {
  vendaId: number;
  comprador: string;
  data_venda?: string;
  medida: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  primeiraLinhaDoPedido: boolean;
  frete?: number;
  valorTotalPedido?: number;
}

export default function AtacadoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [vendas, setVendas] = useState<VendaAtacadoComItens[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VendaAtacado | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      carregar();
    });
  }, [router]);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendas_atacado')
      .select('*, itens:vendas_atacado_itens(id, medida, quantidade, valor_unitario, subtotal)')
      .order('data_venda', { ascending: false })
      .order('id', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setVendas((data as any) || []);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const excluir = async (id: number, comprador: string) => {
    if (!confirm(`Excluir a venda para "${comprador}"?`)) return;
    const { error } = await supabase.from('vendas_atacado').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Venda excluída');
    carregar();
  };

  const filtered = vendas.filter(v => !search || v.comprador.toLowerCase().includes(search.toLowerCase()));

  // Cada medida do pedido vira uma linha própria no relatório, como se fosse uma venda separada.
  // Frete e valor total do pedido só aparecem na primeira linha de cada grupo, pra não parecer
  // que cada medida individualmente teve aquele frete/total.
  const linhas: LinhaRelatorio[] = filtered.flatMap(v => {
    const itens = v.itens && v.itens.length > 0 ? v.itens : [{ id: 0, medida: '-', quantidade: 0, valor_unitario: 0, subtotal: 0 }];
    return itens.map((item, idx) => ({
      vendaId: v.id,
      comprador: v.comprador,
      data_venda: v.data_venda,
      medida: item.medida,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      subtotal: item.subtotal,
      primeiraLinhaDoPedido: idx === 0,
      frete: idx === 0 ? (v.frete || 0) : undefined,
      valorTotalPedido: idx === 0 ? (v.valor_total || 0) : undefined,
    }));
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏭 Atacado</h1>
            <p className="text-gray-500 mt-1">{vendas.length} pedidos ({linhas.length} vendas por medida) — pedidos vendidos direto de fábrica</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Nova Venda</Button>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <input type="text" placeholder="🔍 Buscar por comprador..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Comprador</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Medida</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Quantidade</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor Unitário</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Subtotal</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Frete</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Pedido</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, idx) => (
                  <tr key={`${linha.vendaId}-${idx}`}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${linha.primeiraLinhaDoPedido && idx > 0 ? 'border-t-2 border-t-gray-200' : ''}`}>
                    <td className="py-3 px-4 text-sm text-gray-600">{linha.data_venda ? formatDate(linha.data_venda) : '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{linha.comprador}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{linha.medida}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{linha.quantidade}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">{formatMoney(linha.valor_unitario)}</td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">{formatMoney(linha.subtotal)}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">{linha.frete !== undefined ? formatMoney(linha.frete) : ''}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800 font-semibold">{linha.valorTotalPedido !== undefined ? formatMoney(linha.valorTotalPedido) : ''}</td>
                    <td className="py-3 px-4">
                      {linha.primeiraLinhaDoPedido && (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => {
                            const venda = vendas.find(v => v.id === linha.vendaId);
                            if (!venda) return;
                            const { itens, ...vendaSemItens } = venda;
                            setEditing(vendaSemItens);
                            setShowForm(true);
                          }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={() => excluir(linha.vendaId, linha.comprador)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma venda no atacado registrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <FormVendaAtacado isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={carregar} venda={editing} />
      </main>
    </div>
  );
}
