'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import FormVenda from '@/components/FormVenda';
import ReciboVenda from '@/components/ReciboVenda';
import { Button, formatMoney, formatDate } from '@/components/FormElements';
import toast from 'react-hot-toast';

interface VendaRow {
  id: number; codigo: string; valor_total: number; lucro_final: number;
  data_venda: string; situacao: string; tipo_pagamento: string; observacao?: string;
  cliente: { nome: string; cpf_cnpj?: string; celular?: string; telefone?: string; endereco?: string; numero?: string; bairro?: string } | null;
  vendedor: { nome: string } | null;
  loja: { nome: string; telefone?: string; endereco?: string; cidade?: string; estado?: string } | null;
}

export default function VendasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vendas_periodo') || 'hoje';
    }
    return 'hoje';
  });
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState<any>(null);
  const [showRecibo, setShowRecibo] = useState(false);
  const [reciboData, setReciboData] = useState<any>(null);
  const [reciboItens, setReciboItens] = useState<any[]>([]);

  // Salvar período quando mudar
  useEffect(() => {
    localStorage.setItem('vendas_periodo', periodo);
  }, [periodo]);

  useEffect(() => {
    const inicializar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setUser(session.user);

        let isUserAdmin = false;
        if (session.user?.email) {
          const { data: colaborador } = await supabase
            .from('colaboradores')
            .select('is_admin')
            .eq('email', session.user.email)
            .maybeSingle();

          if (colaborador?.is_admin) {
            isUserAdmin = true;
          }
        }

        setIsAdmin(isUserAdmin);

        await carregarVendas();
      } catch (err) {
        console.error('Erro na inicialização:', err);
        setLoading(false);
      }
    };

    inicializar();
  }, [router]);

  const carregarVendas = async () => {
  let todasVendas: any[] = [];
  let pagina = 0;
  const tamanhoPagina = 1000;
  let temMais = true;

  while (temMais) {
    const { data, error } = await supabase
      .from('vendas')
      .select('*, cliente:clientes(nome), vendedor:colaboradores(nome), loja:lojas(nome, endereco, cidade, estado, telefone)')
      .order('data_venda', { ascending: false })
      .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);

    if (error) {
      console.error('Erro ao carregar vendas:', error);
      break;
    }

    if (data && data.length > 0) {
      todasVendas = [...todasVendas, ...data];
      pagina++;
      temMais = data.length === tamanhoPagina; // Se retornou menos que o tamanho da página, acabou
    } else {
      temMais = false;
    }
  }

  setVendas(todasVendas as any);
  setLoading(false);
};

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const excluir = async (id: number) => {
    if (!confirm('Excluir esta venda permanentemente?')) return;
    await supabase.from('vendas_itens').delete().eq('venda_id', id);
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Venda excluída'); carregarVendas();
  };

  const imprimirRecibo = async (venda: VendaRow) => {
    try {
      const [itensRes, clienteRes] = await Promise.all([
        supabase.from('vendas_itens').select('*, produtos(nome)').eq('venda_id', venda.id),
        supabase.from('clientes').select('*').eq('nome', venda.cliente?.nome || '').maybeSingle(),
      ]);
      
      setReciboData({
        ...venda,
        cliente: clienteRes.data || { nome: venda.cliente?.nome || 'Consumidor' },
        vendedor: { nome: venda.vendedor?.nome || 'Vendedor não informado' },
        loja: venda.loja || { nome: 'Barato Pneus' },
        observacao: venda.observacao || 'Garantia de 3 meses contra defeitos de fabricação.'
      });
      setReciboItens(itensRes.data || []);
      setShowRecibo(true);
    } catch (err) {
      setReciboData({
        ...venda,
        cliente: { nome: venda.cliente?.nome || 'Consumidor' },
        vendedor: { nome: venda.vendedor?.nome || 'Vendedor não informado' },
        loja: { nome: 'Barato Pneus' },
        observacao: 'Garantia de 3 meses contra defeitos de fabricação.'
      });
      setReciboItens([]);
      setShowRecibo(true);
    }
  };

  const hojeLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const vendasFiltradas = vendas.filter(v => {
    if (periodo === 'hoje') return v.data_venda === hojeLocal;
    const [ano, mes, dia] = v.data_venda.split('T')[0].split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (periodo === 'semana') return data >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (periodo === 'mes') return data >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return true;
  });

  const total = vendasFiltradas.reduce((a, v) => a + (v.valor_total || 0), 0);
  const lucro = vendasFiltradas.reduce((a, v) => a + (v.lucro_final || 0), 0);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💰 Vendas</h1>
            <p className="text-gray-500 mt-1">{vendasFiltradas.length} vendas</p>
          </div>
          <Button onClick={() => { setEditingVenda(null); setShowForm(true); }}>+ Nova Venda</Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Faturamento</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatMoney(total)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Lucro</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatMoney(lucro)}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Margem</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{total > 0 ? ((lucro / total) * 100).toFixed(1) + '%' : '0%'}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Ticket Médio</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{vendasFiltradas.length > 0 ? formatMoney(total / vendasFiltradas.length) : 'R$ 0'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-2">
          {[
            { k: 'hoje', l: 'Hoje' },
            { k: 'semana', l: '7 dias' },
            { k: 'mes', l: '30 dias' },
            ...(isAdmin ? [{ k: 'todos', l: 'Todas' }] : [])
          ].map(i => (
            <button key={i.k} onClick={() => setPeriodo(i.k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${periodo === i.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{i.l}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Código</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendedor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Loja</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Lucro</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Data</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Pagto</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendasFiltradas.map(v => (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">#{v.codigo || v.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{v.cliente?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{v.vendedor?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{v.loja?.nome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">{formatMoney(v.valor_total || 0)}</td>
                    <td className="py-3 px-4 text-sm text-right text-blue-600 font-medium">{formatMoney(v.lucro_final || 0)}</td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{formatDate(v.data_venda)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${v.tipo_pagamento === 'À Vista' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v.tipo_pagamento || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => imprimirRecibo(v)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Imprimir Recibo">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button onClick={() => { setEditingVenda(v); setShowForm(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => excluir(v.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendasFiltradas.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhuma venda</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <FormVenda isOpen={showForm} onClose={() => { setShowForm(false); setEditingVenda(null); }}
          onSaved={carregarVendas} venda={editingVenda} />

        {/* Modal do Recibo */}
        {showRecibo && reciboData && (
          <div className="fixed inset-0 bg-black/60 z-40 overflow-y-auto py-10">
            <ReciboVenda
              venda={reciboData}
              itens={reciboItens}
              cliente={reciboData.cliente || {}}
              vendedor={reciboData.vendedor || {}}
              loja={reciboData.loja || { nome: 'Barato Pneus' }}
              onClose={() => setShowRecibo(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
