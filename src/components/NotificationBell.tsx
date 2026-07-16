'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    carregar();

    const channel = supabase
      .channel('notificacoes-vendas')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const nova = payload.new as Notificacao;
          setNotificacoes((prev) => [nova, ...prev].slice(0, 30));
          toast.success(`🔔 ${nova.titulo}: ${nova.mensagem}`, { duration: 6000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const carregar = async () => {
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setNotificacoes(data);
  };

  const marcarComoLida = async (id: number) => {
    setNotificacoes((prev) => prev.map(n => (n.id === id ? { ...n, lida: true } : n)));
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  };

  const marcarTodasComoLidas = async () => {
    const idsNaoLidos = notificacoes.filter(n => !n.lida).map(n => n.id);
    if (idsNaoLidos.length === 0) return;
    setNotificacoes((prev) => prev.map(n => ({ ...n, lida: true })));
    await supabase.from('notificacoes').update({ lida: true }).in('id', idsNaoLidos);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        title="Notificações"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodasComoLidas} className="text-xs text-blue-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notificacoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma notificação</p>
          ) : (
            notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => marcarComoLida(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${
                  !n.lida ? 'bg-blue-50/60' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.titulo}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{n.mensagem}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
