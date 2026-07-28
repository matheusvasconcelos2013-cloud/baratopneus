'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { formatMoney } from '@/components/FormElements';
import { Produto } from '@/types';
import toast from 'react-hot-toast';

export default function AtacadoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<number, string>>({});

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
      .from('produtos')
      .select('*')
      .eq('tipo', 'Produto')
      .order('nome');
    if (error) { toast.error(error.message); setLoading(false); return; }
    setProdutos(data || []);
    const inicial: Record<number, string> = {};
    (data || []).forEach(p => { inicial[p.id] = String(p.preco_atacado ?? 0); });
    setValores(inicial);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const salvarPrecoAtacado = async (produto: Produto) => {
    const novoValor = parseFloat(valores[produto.id]);
    if (isNaN(novoValor) || novoValor < 0) { toast.error('Valor inválido'); return; }
    if (novoValor === (produto.preco_atacado || 0)) return;

    setSalvandoId(produto.id);
    const { error } = await supabase.from('produtos').update({ preco_atacado: novoValor }).eq('id', produto.id);
    setSalvandoId(null);

    if (error) { toast.error(error.message); return; }
    toast.success(`Preço de atacado de "${produto.nome}" atualizado`);
    setProdutos(prev => prev.map(p => p.id === produto.id ? { ...p, preco_atacado: novoValor } : p));
  };

  const filtered = produtos.filter(p =>
    !search || p.nome.toLowerCase().includes(search.toLowerCase()) || (p.codigo || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏭 Atacado</h1>
            <p className="text-gray-500 mt-1">Preços especiais para venda por atacado — por sermos fábrica</p>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <input type="text" placeholder="🔍 Buscar produto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Código</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Preço Varejo</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Preço Atacado</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const alterado = parseFloat(valores[p.id] ?? '0') !== (p.preco_atacado || 0);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">{p.codigo || '-'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{p.nome}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-500">{formatMoney(p.preco_venda || 0)}</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={valores[p.id] ?? ''}
                          onChange={e => setValores(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={() => salvarPrecoAtacado(p)}
                          className="w-32 text-right px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-orange-600 font-medium"
                        />
                      </td>
                      <td className="py-3 px-4 text-center w-10">
                        {salvandoId === p.id && (
                          <svg className="animate-spin h-4 w-4 text-blue-600 mx-auto" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        {salvandoId !== p.id && alterado && (
                          <span className="text-xs text-amber-600">não salvo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum produto encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">💡 Os preços de atacado são editados diretamente nesta tela: altere o valor e clique fora do campo para salvar.</p>
      </main>
    </div>
  );
}
