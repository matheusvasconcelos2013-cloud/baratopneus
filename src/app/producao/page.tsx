'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import AbaResumo from '@/components/producao/AbaResumo';
import AbaCarcacas from '@/components/producao/AbaCarcacas';
import AbaMateriaPrima from '@/components/producao/AbaMateriaPrima';
import AbaLotes from '@/components/producao/AbaLotes';

type Aba = 'resumo' | 'carcacas' | 'materia-prima' | 'lotes';

const abas: { id: Aba; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'carcacas', label: 'Carcaças' },
  { id: 'materia-prima', label: 'Matéria-Prima' },
  { id: 'lotes', label: 'Produção' },
];

export default function ProducaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checandoAcesso, setChecandoAcesso] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<Aba>('resumo');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);

      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('is_admin')
        .ilike('email', session.user.email ?? '')
        .single();

      if (!colaborador?.is_admin) { router.push('/vendas'); return; }
      setChecandoAcesso(false);
    });
  }, [router]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  if (checandoAcesso) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 p-4 pt-20 md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🏭 Produção</h1>
          <p className="text-gray-500 mt-1">Custo real de carcaça e insumos por pneu produzido</p>
        </header>

        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {abas.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  abaAtiva === aba.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {aba.label}
              </button>
            ))}
          </nav>
        </div>

        {abaAtiva === 'resumo' && <AbaResumo />}
        {abaAtiva === 'carcacas' && <AbaCarcacas />}
        {abaAtiva === 'materia-prima' && <AbaMateriaPrima />}
        {abaAtiva === 'lotes' && <AbaLotes />}
      </main>
    </div>
  );
}
