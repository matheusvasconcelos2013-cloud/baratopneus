'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import FormCliente from '@/components/FormCliente';
import { Button, formatMoney } from '@/components/FormElements';
import { Cliente } from '@/types';
import toast from 'react-hot-toast';

export default function ClientesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [pagina, setPagina] = useState(1);
  const porPagina = 14;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      carregarClientes();
    });
  }, [router]);

  const carregarClientes = async () => {
    let todos: Cliente[] = [];
    let pagina = 0;
    const tamanhoPagina = 1000;
    let temMais = true;

    while (temMais) {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')
        .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);

      if (error || !data || data.length === 0) { temMais = false; break; }
      todos = [...todos, ...data];
      temMais = data.length === tamanhoPagina;
      pagina++;
    }

    setClientes(todos);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const excluir = async (id: number, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        toast.error(`"${nome}" tem vendas registradas e não pode ser excluído. Marque como "Inativo" em vez de excluir.`);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('Cliente excluído');
    carregarClientes();
  };

  const statusColor: Record<string, string> = {
    'Ativo': 'bg-green-100 text-green-700', 'Bloqueado': 'bg-red-100 text-red-700',
    'Atenção': 'bg-yellow-100 text-yellow-700', 'Inativo': 'bg-gray-100 text-gray-700'
  };

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf_cnpj?.includes(search) || c.telefone?.includes(search) || c.celular?.includes(search)
  );

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtered.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👥 Clientes</h1>
            <p className="text-gray-500 mt-1">{filtered.length} de {clientes.length} clientes</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => { setEditingCliente(null); setShowForm(true); }}>
              + Novo Cliente
            </Button>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <input type="text" placeholder="🔍 Buscar por nome, CPF ou telefone..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CPF/CNPJ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Celular</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cidade</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{c.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{c.cpf_cnpj || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{c.celular || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{c.cidade || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status || 'Ativo']}`}>{c.status || 'Ativo'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingCliente(c); setShowForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => excluir(c.id, c.nome)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum cliente encontrado</td></tr>}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Página {paginaAtual} de {totalPaginas}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                  Anterior
                </button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        <FormCliente isOpen={showForm} onClose={() => { setShowForm(false); setEditingCliente(null); }}
          onSaved={carregarClientes} cliente={editingCliente} />
      </main>
    </div>
  );
}
