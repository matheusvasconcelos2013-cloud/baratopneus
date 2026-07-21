'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

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
            O Yoosee não tem um site que abra pelo navegador — as câmeras são visualizadas pelo próprio aplicativo, instalado no celular ou computador. Abra o app pelo atalho abaixo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://play.google.com/store/apps/details?id=com.yoosee"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
            >
              Abrir no Android (Play Store)
            </a>
            <a
              href="https://apps.apple.com/us/app/yoosee/id981863450"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
            >
              Abrir no iPhone (App Store)
            </a>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            No celular, se o app Yoosee já estiver instalado, o link pode abrir direto o aplicativo em vez da loja.
          </p>
        </div>
      </main>
    </div>
  );
}
