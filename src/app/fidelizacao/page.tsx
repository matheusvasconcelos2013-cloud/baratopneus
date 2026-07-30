'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import { Button, Input, Select, TextArea, formatMoney, formatDate } from '@/components/FormElements';
import { getLocalDateString, getLocalDateTimeString } from '@/lib/dateUtils';
import { ClienteRodizio, StatusFidelizacao, Loja } from '@/types';
import toast from 'react-hot-toast';

type Filtro = 'a_contatar' | 'contatado' | 'agendado' | 'compareceu' | 'sem_retorno' | 'todos';

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'a_contatar', label: 'A contatar' },
  { valor: 'contatado', label: 'Contatados' },
  { valor: 'agendado', label: 'Agendados' },
  { valor: 'compareceu', label: 'Compareceram' },
  { valor: 'sem_retorno', label: 'Sem retorno' },
  { valor: 'todos', label: 'Todos' },
];

const statusColor: Record<string, string> = {
  'Contatado': 'bg-blue-100 text-blue-700',
  'Agendado': 'bg-yellow-100 text-yellow-700',
  'Compareceu': 'bg-green-100 text-green-700',
  'Nao respondeu': 'bg-gray-100 text-gray-600',
  'Recusou': 'bg-red-100 text-red-700',
};

const statusLabel: Record<string, string> = {
  'Contatado': 'Contatado',
  'Agendado': 'Agendado',
  'Compareceu': 'Compareceu',
  'Nao respondeu': 'Não respondeu',
  'Recusou': 'Recusou',
};

// O texto não diz "faz 6 meses" de propósito: a janela é de 5 a 8 meses e
// o cliente não precisa saber a conta — só que já está na hora do rodízio.
//
// Sem emoji: tanto 🚗 quanto 🛞 chegaram como quadradinho no WhatsApp de
// quem recebe. Os acentos chegam certos, então é a fonte de emoji dos
// aparelhos, não o encoding — não adianta trocar por outro. Os asteriscos
// são o negrito do WhatsApp e passam intactos pelo encodeURIComponent.
function montarMensagem(nome: string) {
  const primeiroNome = nome.trim().split(' ')[0];
  return (
    `Oi ${primeiroNome}, aqui é da *Barato Pneus*\n\n` +
    `Faz um tempo que você trocou os pneus com a gente. Nesse período o rodízio já é recomendado — ele faz os pneus *durarem até 20% mais.*\n\n` +
    `Pra você é *cortesia*, é rapidinho e não precisa agendar. Quer passar essa semana?`
  );
}

// A view já devolve só dígitos (10 ou 11). Falta o código do país pro wa.me.
function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
}

function formatarTelefone(numero: string) {
  if (numero.length === 11) return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  if (numero.length === 10) return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  return numero;
}

export default function FidelizacaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [lista, setLista] = useState<ClienteRodizio[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [resultado, setResultado] = useState({ compareceram: 0, valor: 0, contatos: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('a_contatar');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const porPagina = 15;

  const [editando, setEditando] = useState<ClienteRodizio | null>(null);
  const [form, setForm] = useState({ status: 'Contatado' as StatusFidelizacao, data_agendada: '', valor_gerado: '', observacao: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      carregar();
    });
  }, [router]);

  const carregar = async () => {
    setLoading(true);

    const [fila, lojasRes, contatos] = await Promise.all([
      supabase.from('clientes_rodizio_pendente').select('*'),
      supabase.from('lojas').select('*').order('nome'),
      supabase.from('fidelizacao_contatos').select('status, valor_gerado'),
    ]);

    if (fila.error) {
      toast.error(fila.error.message);
      setLoading(false);
      return;
    }

    setLista((fila.data as ClienteRodizio[]) || []);
    setLojas((lojasRes.data as Loja[]) || []);

    // O resultado do programa vem da tabela de contatos, não da fila: quem
    // compareceu e comprou pneu de novo sai da janela de 5-8 meses e some
    // da fila — mas o faturamento que ele gerou continua valendo.
    const todos = contatos.data || [];
    setResultado({
      contatos: todos.length,
      compareceram: todos.filter((c: any) => c.status === 'Compareceu').length,
      valor: todos.reduce((soma: number, c: any) => soma + Number(c.valor_gerado || 0), 0),
    });

    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  // Grava (ou atualiza) o contato daquela compra de origem.
  const registrar = async (item: ClienteRodizio, dados: Partial<{
    status: StatusFidelizacao; data_agendada: string | null; valor_gerado: number; observacao: string;
  }>) => {
    const payload = {
      cliente_id: item.cliente_id,
      venda_origem_id: item.venda_id,
      data_contato: getLocalDateString(),
      ...dados,
    };

    const { error } = item.contato_id
      ? await supabase.from('fidelizacao_contatos')
          .update({ ...dados, updated_at: getLocalDateTimeString() })
          .eq('id', item.contato_id)
      : await supabase.from('fidelizacao_contatos').insert(payload);

    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const abrirWhatsapp = async (item: ClienteRodizio) => {
    // window.open tem que ser síncrono no clique, senão o navegador bloqueia.
    window.open(linkWhatsapp(item.whatsapp, montarMensagem(item.nome)), '_blank');
    if (item.contato_status) return; // já tem status registrado, não sobrescreve
    if (await registrar(item, { status: 'Contatado' })) {
      toast.success('Contato registrado');
      carregar();
    }
  };

  const abrirModal = (item: ClienteRodizio) => {
    setEditando(item);
    setForm({
      status: item.contato_status || 'Contatado',
      data_agendada: item.contato_agendada || '',
      valor_gerado: item.contato_valor_gerado ? String(item.contato_valor_gerado) : '',
      observacao: '',
    });
  };

  const salvarModal = async () => {
    if (!editando) return;
    setSalvando(true);
    const ok = await registrar(editando, {
      status: form.status,
      data_agendada: form.data_agendada || null,
      valor_gerado: Number(form.valor_gerado || 0),
      observacao: form.observacao,
    });
    setSalvando(false);
    if (!ok) return;
    toast.success('Atualizado');
    setEditando(null);
    carregar();
  };

  const filtrada = lista.filter(item => {
    if (lojaFiltro && String(item.loja_id) !== lojaFiltro) return false;
    if (search) {
      const busca = search.toLowerCase();
      const casa = item.nome.toLowerCase().includes(busca)
        || item.whatsapp.includes(search.replace(/\D/g, ''))
        || (item.placa || '').toLowerCase().includes(busca);
      if (!casa) return false;
    }
    switch (filtro) {
      case 'a_contatar': return !item.contato_status;
      case 'contatado': return item.contato_status === 'Contatado';
      case 'agendado': return item.contato_status === 'Agendado';
      case 'compareceu': return item.contato_status === 'Compareceu';
      case 'sem_retorno': return item.contato_status === 'Nao respondeu' || item.contato_status === 'Recusou';
      default: return true;
    }
  });

  const contagem = (f: Filtro) => {
    switch (f) {
      case 'a_contatar': return lista.filter(i => !i.contato_status).length;
      case 'contatado': return lista.filter(i => i.contato_status === 'Contatado').length;
      case 'agendado': return lista.filter(i => i.contato_status === 'Agendado').length;
      case 'compareceu': return lista.filter(i => i.contato_status === 'Compareceu').length;
      case 'sem_retorno': return lista.filter(i => i.contato_status === 'Nao respondeu' || i.contato_status === 'Recusou').length;
      default: return lista.length;
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrada.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🎯 Fidelização</h1>
          <p className="text-gray-500 mt-1">
            Clientes que compraram entre 5 e 8 meses atrás — hora de oferecer o rodízio de cortesia
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Na fila</p>
            <p className="text-2xl font-bold text-gray-800">{lista.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">A contatar</p>
            <p className="text-2xl font-bold text-orange-500">{contagem('a_contatar')}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Compareceram (total)</p>
            <p className="text-2xl font-bold text-green-600">{resultado.compareceram}</p>
            <p className="text-xs text-gray-400 mt-0.5">de {resultado.contatos} contatos</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Faturamento gerado</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(resultado.valor)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="🔍 Buscar por nome, telefone ou placa..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <select value={lojaFiltro} onChange={(e) => { setLojaFiltro(e.target.value); setPagina(1); }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Todas as lojas</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTROS.map(f => (
              <button key={f.valor} onClick={() => { setFiltro(f.valor); setPagina(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filtro === f.valor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f.label} ({contagem(f.valor)})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">WhatsApp</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Veículo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Última compra</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Itens</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Loja</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Situação</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((item) => (
                  <tr key={item.venda_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatarTelefone(item.whatsapp)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.veiculo || '-'}
                      {item.placa && <span className="block text-xs text-gray-400">{item.placa}</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(item.data_venda)}
                      <span className="block text-xs text-gray-400">{item.meses_desde_compra} meses</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{item.qtd_itens ?? '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.loja_nome || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      {item.contato_status ? (
                        <>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[item.contato_status]}`}>
                            {statusLabel[item.contato_status]}
                          </span>
                          {item.contato_status === 'Agendado' && item.contato_agendada && (
                            <span className="block text-xs text-gray-400 mt-0.5">{formatDate(item.contato_agendada)}</span>
                          )}
                          {item.contato_status === 'Compareceu' && !!item.contato_valor_gerado && (
                            <span className="block text-xs text-green-600 mt-0.5">{formatMoney(Number(item.contato_valor_gerado))}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">A contatar</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirWhatsapp(item)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="Chamar no WhatsApp">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.99 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488" />
                          </svg>
                        </button>
                        <button onClick={() => abrirModal(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Registrar retorno">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrada.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum cliente nesta situação</td></tr>
                )}
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

        <Modal isOpen={!!editando} onClose={() => setEditando(null)} title={`Retorno — ${editando?.nome || ''}`}>
          <div className="space-y-4">
            <Select label="Situação" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StatusFidelizacao })}
              options={[
                { value: 'Contatado', label: 'Contatado' },
                { value: 'Agendado', label: 'Agendado' },
                { value: 'Compareceu', label: 'Compareceu' },
                { value: 'Nao respondeu', label: 'Não respondeu' },
                { value: 'Recusou', label: 'Recusou' },
              ]} />

            {form.status === 'Agendado' && (
              <Input label="Data agendada" type="date" value={form.data_agendada}
                onChange={(e) => setForm({ ...form, data_agendada: e.target.value })} />
            )}

            {form.status === 'Compareceu' && (
              <Input label="Faturamento gerado na visita (R$)" type="number" step="0.01" min={0}
                value={form.valor_gerado} placeholder="Balanceamento, alinhamento, pneus..."
                onChange={(e) => setForm({ ...form, valor_gerado: e.target.value })} />
            )}

            <TextArea label="Observação" value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Ex: pediu pra ligar depois das 18h" />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button onClick={salvarModal} loading={salvando}>Salvar</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
