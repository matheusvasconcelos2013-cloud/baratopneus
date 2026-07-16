'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { Input, Select, TextArea, Button, formatMoney, formatDate } from '@/components/FormElements';
import toast from 'react-hot-toast';
import { getLocalDateString } from '@/lib/dateUtils';

export default function FinanceiroPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ tipo: 'Receber', descricao: '', valor: 0, data_vencimento: '', data_pagamento: '', pago: false, categoria: 'Conta Avulsa', observacao: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user); carregar();
    });
  }, [router]);

  const carregar = async () => {
    const { data } = await supabase.from('contas_financeiro').select('*').order('data_vencimento', { ascending: true });
    if (data) setContas(data);
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const openNew = () => { setEditing(null); setForm({ tipo: 'Receber', descricao: '', valor: 0, data_vencimento: '', data_pagamento: '', pago: false, categoria: 'Conta Avulsa', observacao: '' }); setShowForm(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ tipo: item.tipo, descricao: item.descricao || '', valor: item.valor, data_vencimento: item.data_vencimento?.split('T')[0] || '', data_pagamento: item.data_pagamento?.split('T')[0] || '', pago: item.pago, categoria: item.categoria || 'Conta Avulsa', observacao: item.observacao || '' }); setShowForm(true); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao.trim()) { toast.error('Descrição é obrigatória'); return; }
    try {
      if (editing) { await supabase.from('contas_financeiro').update(form).eq('id', editing.id); toast.success('Atualizado!'); }
      else { await supabase.from('contas_financeiro').insert([form]); toast.success('Conta registrada!'); }
      setShowForm(false); carregar();
    } catch (err: any) { toast.error(err.message); }
  };

  const togglePago = async (id: number, pago: boolean) => {
    const { error } = await supabase.from('contas_financeiro').update({ pago: !pago, data_pagamento: !pago ? getLocalDateString() : null }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    carregar();
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta conta?')) return;
    await supabase.from('contas_financeiro').delete().eq('id', id);
    toast.success('Excluída'); carregar();
  };

  const filtered = contas.filter(c => {
    if (filtro === 'receber') return c.tipo === 'Receber';
    if (filtro === 'pagar') return c.tipo === 'Pagar';
    if (filtro === 'pendentes') return !c.pago;
    return true;
  });

  const totalReceber = filtered.filter(c => c.tipo === 'Receber' && !c.pago).reduce((a, c) => a + (c.valor || 0), 0);
  const totalPagar = filtered.filter(c => c.tipo === 'Pagar' && !c.pago).reduce((a, c) => a + (c.valor || 0), 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💰 Financeiro</h1>
            <p className="text-gray-500 mt-1">{filtered.length} contas</p>
          </div>
          <Button onClick={openNew}>+ Nova Conta</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-green-200">
            <p className="text-sm text-gray-500">A Receber (pendente)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(totalReceber)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
            <p className="text-sm text-gray-500">A Pagar (pendente)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatMoney(totalPagar)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-2">
          {[{ k: 'todas', l: 'Todas' }, { k: 'receber', l: 'A Receber' }, { k: 'pagar', l: 'A Pagar' }, { k: 'pendentes', l: 'Pendentes' }].map(i => (
            <button key={i.k} onClick={() => setFiltro(i.k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filtro === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i.l}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Descrição</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Categoria</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Vencimento</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Pago</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${c.tipo === 'Receber' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.tipo}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-800">{c.descricao || '-'}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{c.categoria || '-'}</td>
                    <td className={`py-3 px-4 text-sm text-right font-medium ${c.tipo === 'Receber' ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(c.valor || 0)}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{c.data_vencimento ? formatDate(c.data_vencimento) : '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => togglePago(c.id, c.pago)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${c.pago ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                        {c.pago && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => excluir(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhuma conta</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Conta' : 'Nova Conta'}>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                options={[{ value: 'Receber', label: 'A Receber' }, { value: 'Pagar', label: 'A Pagar' }]} />
              <Select label="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                options={[{ value: 'Venda', label: 'Venda' }, { value: 'Ordem de Serviço', label: 'Ordem de Serviço' }, { value: 'Orçamento', label: 'Orçamento' }, { value: 'Conta Avulsa', label: 'Conta Avulsa' }]} />
            </div>
            <Input label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            <Input label="Valor" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })} step="0.01" min={0} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data Vencimento" type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
              <Input label="Data Pagamento" type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
            </div>
            <TextArea label="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit">{editing ? 'Salvar' : 'Registrar'}</Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
