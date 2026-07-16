import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

type Listener = (lista: Notificacao[]) => void;

let notificacoes: Notificacao[] = [];
let listeners: Listener[] = [];
let iniciado = false;

function emitir() {
  listeners.forEach((l) => l(notificacoes));
}

async function carregarInicial() {
  const { data } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (data) {
    notificacoes = data;
    emitir();
  }
}

// Garante um único canal Realtime e um único listener de toast,
// mesmo que NotificationBell esteja montado mais de uma vez ao mesmo tempo
// (ex: barra mobile + sidebar desktop).
function iniciar() {
  if (iniciado) return;
  iniciado = true;
  carregarInicial();

  supabase
    .channel('notificacoes-vendas-global')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificacoes' },
      (payload) => {
        const nova = payload.new as Notificacao;
        notificacoes = [nova, ...notificacoes].slice(0, 30);
        emitir();
        toast.success(`🔔 ${nova.titulo}: ${nova.mensagem}`, { duration: 6000 });
      }
    )
    .subscribe();
}

export function subscribeNotificacoes(listener: Listener) {
  iniciar();
  listeners.push(listener);
  listener(notificacoes);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export async function marcarComoLida(id: number) {
  notificacoes = notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n));
  emitir();
  await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
}

export async function marcarTodasComoLidas() {
  const ids = notificacoes.filter((n) => !n.lida).map((n) => n.id);
  if (ids.length === 0) return;
  notificacoes = notificacoes.map((n) => ({ ...n, lida: true }));
  emitir();
  await supabase.from('notificacoes').update({ lida: true }).in('id', ids);
}

export async function excluirNotificacao(id: number) {
  notificacoes = notificacoes.filter((n) => n.id !== id);
  emitir();
  await supabase.from('notificacoes').delete().eq('id', id);
}

export async function limparNotificacoes() {
  const ids = notificacoes.map((n) => n.id);
  if (ids.length === 0) return;
  notificacoes = [];
  emitir();
  await supabase.from('notificacoes').delete().in('id', ids);
}
