'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { Input, Select, Button, formatMoney } from '@/components/FormElements';
import toast from 'react-hot-toast';

export default function ColaboradoresPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ nome: '', funcao: '', telefone: '', comissao_percentual: 0, ativo: true, email: '', is_admin: false });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('is_admin')
        .ilike('email', session.user.email ?? '')
        .maybeSingle();
      setIsAdmin(!!colaborador?.is_admin);

      carregar();
    });
  }, [router]);

  const carregar = async () => {
    const { data: d } = await supabase.from('colaboradores').select('*').order('nome');
    if (d) setData(d);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const openNew = () => { setEditing(null); setForm({ nome: '', funcao: '', telefone: '', comissao_percentual: 0, ativo: true, email: '', is_admin: false }); setShowForm(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ nome: item.nome, funcao: item.funcao || '', telefone: item.telefone || '', comissao_percentual: item.comissao_percentual || 0, ativo: item.ativo !== false, email: item.email || '', is_admin: item.is_admin || false }); setShowForm(true); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      // Email e is_admin só podem ser alterados por administradores
      const { email, is_admin, ...payload } = form;
      const dados: any = payload;
      if (isAdmin) { dados.email = email.trim().toLowerCase(); dados.is_admin = is_admin; }

      if (editing) {
        await supabase.from('colaboradores').update(dados).eq('id', editing.id);
        toast.success('Colaborador atualizado!');
      } else {
        await supabase.from('colaboradores').insert([dados]);
        toast.success('Colaborador cadastrado!');
      }
      setShowForm(false); carregar();
    } catch (err: any) { toast.error(err.message); }
  };

  const excluir = async (id: number, nome: string) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Excluído'); carregar();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">👷 Colaboradores</h1>
            <p className="text-gray-500 mt-1">{data.length} colaboradores</p>
          </div>
          <Button onClick={openNew}>+ Novo Colaborador</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{item.nome}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.funcao || 'Sem função'}</p>
                  {item.telefone && <p className="text-sm text-gray-500">{item.telefone}</p>}
                  {item.comissao_percentual > 0 && <p className="text-sm text-blue-600 font-medium mt-1">Comissão: {item.comissao_percentual}%</p>}
                </div>
                <div className="flex items-center gap-2">
                  {item.is_admin && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">👑 Admin</span>}
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(item)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Editar</button>
                <button onClick={() => excluir(item.id, item.nome)} className="text-sm text-red-600 hover:text-red-700 font-medium">Excluir</button>
              </div>
            </div>
          ))}
          {data.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Nenhum colaborador cadastrado</div>}
        </div>

        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Colaborador' : 'Novo Colaborador'}>
          <form onSubmit={salvar} className="space-y-4">
            <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Função" value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Vendedor, Técnico..." />
              <Input label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 90000-0000" />
            </div>
            <Input label="Comissão (%)" type="number" value={form.comissao_percentual} onChange={(e) => setForm({ ...form, comissao_percentual: parseFloat(e.target.value) || 0 })} step="0.1" min={0} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
            </div>

            {isAdmin && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase">Acesso ao sistema (somente administradores)</p>
                <Input label="Email de login" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="colaborador@email.com" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_admin" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="is_admin" className="text-sm text-gray-700">É administrador (acessa o Dashboard Admin)</label>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
