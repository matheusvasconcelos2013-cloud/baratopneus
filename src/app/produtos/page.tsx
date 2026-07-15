'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import FormProduto from '@/components/FormProduto';
import { Button, formatMoney } from '@/components/FormElements';
import { Produto } from '@/types';
import toast from 'react-hot-toast';

interface ProdutoComEstoque extends Produto {
  estoque_atual?: number;
  estoque_minimo_atual?: number;
}

export default function ProdutosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [lojas, setLojas] = useState<any[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<string>(''); // '' = todas as lojas
  const [ordenarPor, setOrdenarPor] = useState<string>('nome');
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('asc');

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

  const carregar = async (lojaId?: string) => {
    try {
      // Carrega todos os produtos
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (!produtosData) {
        setLoading(false);
        return;
      }

      // Se uma loja foi selecionada, busca o estoque específico
      if (lojaId) {
        const { data: estoqueData } = await supabase
          .from('estoque_lojas')
          .select('produto_id, quantidade, estoque_minimo')
          .eq('loja_id', parseInt(lojaId));

        // Mapeia o estoque para cada produto
        const produtosComEstoque = produtosData.map(p => {
          const estoque = estoqueData?.find(e => e.produto_id === p.id);
          return {
            ...p,
            estoque_atual: estoque?.quantidade || 0,
            estoque_minimo_atual: estoque?.estoque_minimo || p.estoque_minimo || 0,
          };
        });
        setProdutos(produtosComEstoque);
      } else {
        // Sem loja selecionada: mostra estoque consolidado (soma de todas as lojas)
        const { data: estoqueData } = await supabase
          .from('estoque_lojas')
          .select('produto_id, quantidade');

        const produtosComEstoque = produtosData.map(p => {
          const estoqueTotal = estoqueData
            ?.filter(e => e.produto_id === p.id)
            .reduce((acc, e) => acc + (e.quantidade || 0), 0) || p.quantidade_estoque || 0;

          return {
            ...p,
            estoque_atual: estoqueTotal,
            estoque_minimo_atual: p.estoque_minimo || 0,
          };
        });
        setProdutos(produtosComEstoque);
      }

      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const handleLojaChange = (novaLoja: string) => {
    setLojaAtiva(novaLoja);
    carregar(novaLoja || undefined);
  };

  const excluir = async (id: number, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Produto excluído');
    carregar(lojaAtiva || undefined);
  };

  const handleOrdenar = (coluna: string) => {
    if (ordenarPor === coluna) {
      // Se clicou na mesma coluna, inverte a direção
      setDirecao(direcao === 'asc' ? 'desc' : 'asc');
    } else {
      // Se clicou em coluna diferente, ordena ascendente
      setOrdenarPor(coluna);
      setDirecao('asc');
    }
  };

  const filtered = produtos
    .filter(p => {
      if (filtro === 'produtos' && p.tipo !== 'Produto') return false;
      if (filtro === 'servicos' && p.tipo !== 'Serviço') return false;
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Ao ordenar por estoque, Serviços (sem estoque) sempre ficam por último
      if (ordenarPor === 'estoque_atual') {
        const aEhServico = a.tipo !== 'Produto';
        const bEhServico = b.tipo !== 'Produto';
        if (aEhServico && !bEhServico) return 1;
        if (!aEhServico && bEhServico) return -1;
        if (aEhServico && bEhServico) return 0; // mantém ordem entre serviços
      }

      let aVal: any = a[ordenarPor as keyof ProdutoComEstoque];
      let bVal: any = b[ordenarPor as keyof ProdutoComEstoque];

      // Ordena números
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direcao === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Ordena strings
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direcao === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📦 Produtos e Serviços</h1>
            <p className="text-gray-500 mt-1">
              {produtos.length} itens cadastrados
              {lojaAtiva && ` - ${lojas.find(l => l.id === parseInt(lojaAtiva))?.nome}`}
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Novo Produto</Button>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          
          {/* Filtro de Lojas */}
          <select value={lojaAtiva} onChange={(e) => handleLojaChange(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">📍 Todas as Lojas</option>
            {lojas.map(loja => (
              <option key={loja.id} value={loja.id}>{loja.nome}</option>
            ))}
          </select>

          {/* Filtro de Tipo */}
          {[{ k: 'todos', l: 'Todos' }, { k: 'produtos', l: 'Produtos' }, { k: 'servicos', l: 'Serviços' }].map(i => (
            <button key={i.k} onClick={() => setFiltro(i.k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filtro === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i.l}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th onClick={() => handleOrdenar('codigo')} className="text-left py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none">
                    Código {ordenarPor === 'codigo' && (direcao === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleOrdenar('nome')} className="text-left py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none">
                    Nome {ordenarPor === 'nome' && (direcao === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                  <th onClick={() => handleOrdenar('preco_venda')} className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none">
                    Preço Venda {ordenarPor === 'preco_venda' && (direcao === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleOrdenar('preco_custo')} className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none">
                    Preço Custo {ordenarPor === 'preco_custo' && (direcao === 'asc' ? '↑' : '↓')}
                  </th>
                  {filtered.some(p => p.tipo === 'Produto') && (
                    <th onClick={() => handleOrdenar('estoque_atual')} className="text-center py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100 select-none">
                      Estoque {ordenarPor === 'estoque_atual' && (direcao === 'asc' ? '↑' : '↓')}
                      {lojaAtiva ? ` (${lojas.find(l => l.id === parseInt(lojaAtiva))?.nome})` : ' (Total)'}
                    </th>
                  )}
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">{p.codigo || '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{p.nome}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${p.tipo === 'Produto' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{p.tipo || 'Produto'}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">{formatMoney(p.preco_venda || 0)}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">{formatMoney(p.preco_custo || 0)}</td>
                    {p.tipo === 'Produto' && (
                      <td className={`py-3 px-4 text-sm text-center font-medium ${(p.estoque_atual || 0) <= (p.estoque_minimo_atual || 0) ? 'text-red-600 bg-red-50' : 'text-gray-600'}`}>
                        {p.estoque_atual || 0} {p.unidade}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditing(p); setShowForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => excluir(p.id, p.nome)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum item</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <FormProduto isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => carregar(lojaAtiva || undefined)} produto={editing} />
      </main>
    </div>
  );
}