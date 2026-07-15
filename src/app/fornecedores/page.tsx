'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { Input, TextArea, Button } from '@/components/FormElements';
import toast from 'react-hot-toast';

export default function FornecedoresPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', contato: '', telefone: '', celular: '', email: '', endereco: '', cnpj: '', observacao: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user); carregar();
    });
  }, [router]);

  const carregar = async () => {
    const { data: d } = await supabase.from('fornecedores').select('*').order('nome');
    if (d) setData(d); setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const openNew = () => { setEditing(null); setForm({ nome: '', contato: '', telefone: '', celular: '', email: '', endereco: '', cnpj: '', observacao: '' }); setShowForm(true); };
  const openEdit = (item: any) => { setEditing(item); setForm(item); setShowForm(true); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      if (editing) { await supabase.from('fornecedores').update(form).eq('id', editing.id); toast.success('Atualizado!'); }
      else { await supabase.from('fornecedores').insert([form]); toast.success('Cadastrado!'); }
      setShowForm(false); carregar();
    } catch (err: any) { toast.error(err.message); }
  };

  const excluir = async (id: number, nome: string) => {
    if (!confirm(`Excluir fornecedor "${nome}"?`)) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
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
            <h1 className="text-3xl font-bold text-gray-800">🏭 Fornecedores</h1>
            <p className="text-gray-500 mt-1">{data.length} fornecedores</p>
          </div>
          <Button onClick={openNew}>+ Novo Fornecedor</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
              <h3 className="font-semibold text-gray-800">{item.nome}</h3>
              {item.contato && <p className="text-sm text-gray-500 mt-1">Contato: {item.contato}</p>}
              <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                {item.telefone && <p>📞 {item.telefone}</p>}
                {item.celular && <p>📱 {item.celular}</p>}
                {item.email && <p>✉️ {item.email}</p>}
                {item.cnpj && <p>📄 {item.cnpj}</p>}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(item)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Editar</button>
                <button onClick={() => excluir(item.id, item.nome)} className="text-sm text-red-600 hover:text-red-700 font-medium">Excluir</button>
              </div>
            </div>
          ))}
          {data.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">Nenhum fornecedor</div>}
        </div>

        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="lg">
          <form onSubmit={salvar} className="space-y-4">
            <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <Input label="Contato" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} placeholder="Nome do contato" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              <Input label="Celular" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              <Input label="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <TextArea label="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
