'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import FormRemessa from '@/components/FormRemessa';
import { Button, formatMoney, formatDate } from '@/components/FormElements';
import toast from 'react-hot-toast';

interface RemessaRow {
  id: number;
  data_entrada: string;
  observacao?: string;
  loja: { id: number; nome: string } | null;
  fornecedor: { id: number; nome: string } | null;
  total_itens?: number;
  valor_total?: number;
}

export default function RemessasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [remessas, setRemessas] = useState<RemessaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRemessa, setEditingRemessa] = useState<any>(null);
  const [filtroLoja, setFiltroLoja] = useState<string>('');
  const [lojas, setLojas] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      carregarLojas();
      carregar();
    });
  }, [router]);

  const carregarLojas = async () => {
    const { data } = await supabase.from('lojas').select('id,nome').order('nome');
    if (data) setLojas(data);
  };

  const carregar = async () => {
    try {
      let query = supabase
        .from('remessas')
        .select('*, loja:lojas(id,nome), fornecedor:fornecedores(id,nome)')
        .order('data_entrada', { ascending: false });

      if (filtroLoja) {
        query = query.eq('loja_id', parseInt(filtroLoja));
      }

      const { data } = await query;

      if (data) {
        // Calcula total de itens e valor por remessa
        const remessasComTotais = await Promise.all(
          data.map(async (remessa) => {
            const { data: itens } = await supabase
              .from('remessas_itens')
              .select('quantidade, preco_custo')
              .eq('remessa_id', remessa.id);

            const total_itens = itens?.reduce((acc, i) => acc + (i.quantidade || 0), 0) || 0;
            const valor_total = itens?.reduce((acc, i) => acc + ((i.quantidade || 0) * (i.preco_custo || 0)), 0) || 0;

            return { ...remessa, total_itens, valor_total };
          })
        );

        setRemessas(remessasComTotais);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar remessas:', err);
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta remessa permanentemente? O estoque será revertido!')) return;
    try {
      // 1. Busca a remessa e seus itens
      const remessaRes = await supabase.from('remessas').select('id, loja_id').eq('id', id).single();
      const itensRes = await supabase.from('remessas_itens').select('*').eq('remessa_id', id);

      if (!remessaRes.data || !itensRes.data) {
        toast.error('Remessa não encontrada');
        return;
      }

      const lojaId = remessaRes.data.loja_id;
      const itens = itensRes.data;

      // 2. Reverte o estoque de cada item via RPC atômica (ajustar_estoque)
      for (const item of itens) {
        const { error: erroEstorno } = await supabase.rpc('ajustar_estoque', {
          p_produto_id: item.produto_id,
          p_loja_id: lojaId,
          p_delta: -Math.abs(item.quantidade),
          p_tipo: 'Saída',
          p_motivo: 'Estorno de Remessa (exclusão)',
          p_referencia_id: id,
        });
        if (erroEstorno) throw erroEstorno;
      }

      // Remove o histórico de movimentação original desta remessa
      // (Obs: antes este delete usava a coluna "remessa_id", que não existe
      // em movimentacao_estoque — a coluna correta é "referencia_id" — então
      // esse histórico nunca era de fato removido. Corrigido aqui.)
      await supabase
        .from('movimentacao_estoque')
        .delete()
        .eq('referencia_id', id)
        .eq('motivo', 'Remessa');

      // 3. Deleta os itens da remessa
      await supabase.from('remessas_itens').delete().eq('remessa_id', id);

      // 4. Deleta a remessa
      const { error } = await supabase.from('remessas').delete().eq('id', id);
      if (error) { toast.error(error.message); return; }
      
      toast.success('Remessa excluída e estoque revertido!');
      carregar();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const remessasFiltradas = filtroLoja
    ? remessas.filter(r => r.loja?.id === parseInt(filtroLoja))
    : remessas;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📦 Remessas</h1>
            <p className="text-gray-500 mt-1">{remessasFiltradas.length} remessas</p>
          </div>
          <Button onClick={() => { setEditingRemessa(null); setShowForm(true); }}>+ Nova Remessa</Button>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <select value={filtroLoja} onChange={(e) => setFiltroLoja(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">📍 Todas as Lojas</option>
            {lojas.map(loja => (
              <option key={loja.id} value={loja.id}>{loja.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total de Remessas</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{remessasFiltradas.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total de Itens</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {remessasFiltradas.reduce((acc, r) => acc + (r.total_itens || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Valor Total</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {formatMoney(remessasFiltradas.reduce((acc, r) => acc + (r.valor_total || 0), 0))}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Data Entrada</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Loja</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fornecedor</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Itens</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {remessasFiltradas.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{formatDate(r.data_entrada)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{r.loja?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{r.fornecedor?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600 font-medium">{r.total_itens || 0}</td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">{formatMoney(r.valor_total || 0)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingRemessa(r); setShowForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => excluir(r.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {remessasFiltradas.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma remessa registrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <FormRemessa isOpen={showForm} onClose={() => { setShowForm(false); setEditingRemessa(null); }}
          onSaved={carregar} remessa={editingRemessa} />
      </main>
    </div>
  );
}