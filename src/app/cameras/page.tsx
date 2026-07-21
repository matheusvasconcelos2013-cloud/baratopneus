'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

const YOOSEE_SCHEME = 'yoosee://';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.yoosee';
const APP_STORE_URL = 'https://apps.apple.com/us/app/yoosee/id981863450';

function abrirAppYoosee() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (!isIOS && !isAndroid) {
    window.open(PLAY_STORE_URL, '_blank');
    return;
  }

  const storeUrl = isIOS ? APP_STORE_URL : PLAY_STORE_URL;
  let saiuDaAba = false;
  const marcarSaida = () => { if (document.hidden) saiuDaAba = true; };
  document.addEventListener('visibilitychange', marcarSaida);

  window.location.href = YOOSEE_SCHEME;

  setTimeout(() => {
    document.removeEventListener('visibilitychange', marcarSaida);
    if (!saiuDaAba) window.location.href = storeUrl;
  }, 1500);
}

export default function CamerasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">📹 Câmeras</h1>
          <p className="text-gray-500 mt-1">Acesse as câmeras de segurança pelo app Yoosee</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-xl">
          <p className="text-sm text-gray-600 mb-6">
            Clique para abrir o app Yoosee direto no celular. Se ele já estiver instalado, abre na hora; se não estiver, você é levado para a loja de aplicativos.
          </p>

          <button
            onClick={abrirAppYoosee}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            Abrir Yoosee
          </button>

          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
              Instalar no Android
            </a>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
              Instalar no iPhone
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
