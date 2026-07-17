'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Notificacao,
  subscribeNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  excluirNotificacao,
  limparNotificacoes,
} from '@/lib/notificacoesStore';
import { pushSuportado, pushJaAtivo, ativarPushNotifications } from '@/lib/push';

interface NotificationBellProps {
  userEmail?: string;
  align?: 'left' | 'right';
}

export default function NotificationBell({ userEmail, align = 'right' }: NotificationBellProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [pushAtivo, setPushAtivo] = useState(false);
  const [ativandoPush, setAtivandoPush] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    return subscribeNotificacoes(setNotificacoes);
  }, []);

  useEffect(() => {
    pushJaAtivo().then(setPushAtivo);
  }, []);

  const handleAtivarPush = async () => {
    if (!userEmail) return;
    setAtivandoPush(true);
    try {
      await ativarPushNotifications(userEmail);
      setPushAtivo(true);
      toast.success('Notificações no celular ativadas!');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível ativar as notificações.');
    } finally {
      setAtivandoPush(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notificações"
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
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-72 sm:w-80 max-w-[90vw] max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-[60]`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">Notificações</span>
            <div className="flex items-center gap-3">
              {naoLidas > 0 && (
                <button onClick={marcarTodasComoLidas} className="text-xs text-blue-600 hover:underline">
                  Marcar todas como lidas
                </button>
              )}
              {notificacoes.length > 0 && (
                <button onClick={limparNotificacoes} className="text-xs text-gray-400 hover:text-red-600 hover:underline">
                  Limpar tudo
                </button>
              )}
            </div>
          </div>

          {pushSuportado() && !pushAtivo && (
            <button
              onClick={handleAtivarPush}
              disabled={ativandoPush}
              className="w-full text-left px-4 py-2.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border-b border-gray-100 disabled:opacity-50"
            >
              📲 {ativandoPush ? 'Ativando...' : 'Ativar notificações no celular'}
            </button>
          )}

          {notificacoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma notificação</p>
          ) : (
            notificacoes.map((n) => (
              <div
                key={n.id}
                onClick={() => marcarComoLida(n.id)}
                className={`group flex items-start gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${
                  !n.lida ? 'bg-blue-50/60' : ''
                }`}
              >
                {!n.lida && <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{n.titulo}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{n.mensagem}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); excluirNotificacao(n.id); }}
                  className="shrink-0 p-1 text-gray-300 hover:text-red-600 transition"
                  aria-label="Excluir notificação"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
