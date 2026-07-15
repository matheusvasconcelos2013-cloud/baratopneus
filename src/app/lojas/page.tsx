'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { Loja } from '@/types';

export default function LojasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Loja | null>(null);
  const [novaLoja, setNovaLoja] = useState({ nome: '', cidade: '', estado: '', telefone: '' });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      carregarLojas();
    };
    checkUser();
  }, [router]);

  const carregarLojas = async () => {
    const { data } = await supabase
      .from('lojas')
      .select('*')
      .order('nome');
    if (data) setLojas(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const abrirNova = () => {
    setEditando(null);
    setNovaLoja({ nome: '', cidade: '', estado: '', telefone: '' });
    setShowModal(true);
  };

  const abrirEdicao = (loja: Loja) => {
    setEditando(loja);
    setNovaLoja({ nome: loja.nome, cidade: loja.cidade || '', estado: loja.estado || '', telefone: loja.telefone || '' });
    setShowModal(true);
  };

  const salvarLoja = async () => {
    if (!novaLoja.nome) return;
    const { error } = editando
      ? await supabase.from('lojas').update(novaLoja).eq('id', editando.id)
      : await supabase.from('lojas').insert([novaLoja]);
    if (!error) {
      setShowModal(false);
      setEditando(null);
      setNovaLoja({ nome: '', cidade: '', estado: '', telefone: '' });
      carregarLojas();
    }
  };

  const excluirLoja = async (loja: Loja) => {
    if (!confirm(`Excluir "${loja.nome}"? Vendas e produtos ja vinculados a essa loja nao serao apagados.`)) return;
    const { error } = await supabase.from('lojas').delete().eq('id', loja.id);
    if (error) { alert(error.message); return; }
    carregarLojas();
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Lojas</h1>
            <p className="text-gray-500 mt-1">{lojas.length} lojas cadastradas</p>
          </div>
          <button
            onClick={abrirNova}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Loja
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lojas.map((loja) => (
            <div key={loja.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{loja.nome}</h3>
              {loja.cidade && (
                <p className="text-sm text-gray-500 mt-1">{loja.cidade}{loja.estado ? ` - ${loja.estado}` : ''}</p>
              )}
              {loja.telefone && (
                <p className="text-sm text-gray-500 mt-1">{loja.telefone}</p>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => abrirEdicao(loja)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Editar</button>
                <button onClick={() => excluirLoja(loja)} className="text-sm text-red-600 hover:text-red-700 font-medium">Excluir</button>
              </div>
            </div>
          ))}
          {lojas.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Nenhuma loja cadastrada. Crie a primeira!
            </div>
          )}
        </div>

        {/* Modal Nova Loja */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-800 mb-6">{editando ? 'Editar Loja' : 'Nova Loja'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={novaLoja.nome}
                    onChange={(e) => setNovaLoja({ ...novaLoja, nome: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Loja Centro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={novaLoja.cidade}
                    onChange={(e) => setNovaLoja({ ...novaLoja, cidade: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Suzano"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={novaLoja.estado}
                      onChange={(e) => setNovaLoja({ ...novaLoja, estado: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={novaLoja.telefone}
                      onChange={(e) => setNovaLoja({ ...novaLoja, telefone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowModal(false); setEditando(null); }}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarLoja}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editando ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
