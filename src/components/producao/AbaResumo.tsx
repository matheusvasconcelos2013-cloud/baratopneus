'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/components/FormElements';
import { ResumoProducaoMensal } from '@/types';
import toast from 'react-hot-toast';

function formatMes(mes: string): string {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

export default function AbaResumo() {
  const [meses, setMeses] = useState<ResumoProducaoMensal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('resumo_producao_mensal').select('*').limit(12);
      if (error) toast.error(error.message);
      setMeses(data || []);
      setLoading(false);
    };
    carregar();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  }

  const mesAtual = meses[0];
  const totalProduzidoHistorico = meses.reduce((acc, m) => acc + Number(m.total_produzido), 0);
  const totalInvestidoHistorico = meses.reduce((acc, m) => acc + Number(m.total_investido), 0);
  const totalRefugoHistorico = meses.reduce((acc, m) => acc + Number(m.total_refugo), 0);

  return (
    <div className="space-y-6">
      {meses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          Nenhum lote de produção registrado ainda. Lance o primeiro na aba "Produção" para ver o custo real do seu pneu aqui.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Custo médio/pneu (mês atual)</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{formatMoney(mesAtual?.custo_medio_por_pneu || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Produzidos no mês atual</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{mesAtual?.total_produzido || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Investido no mês atual</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{formatMoney(mesAtual?.total_investido || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Refugo no mês atual</p>
              <p className="text-3xl font-bold text-red-500 mt-1">{mesAtual?.total_refugo || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <h3 className="font-semibold text-gray-800 px-6 pt-5 pb-2">Histórico mensal</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="text-left py-2.5 px-6 font-medium text-gray-500">Mês</th>
                    <th className="text-right py-2.5 px-6 font-medium text-gray-500">Produzidos</th>
                    <th className="text-right py-2.5 px-6 font-medium text-gray-500">Refugo</th>
                    <th className="text-right py-2.5 px-6 font-medium text-gray-500">Custo carcaças</th>
                    <th className="text-right py-2.5 px-6 font-medium text-gray-500">Custo insumos</th>
                    <th className="text-right py-2.5 px-6 font-medium text-gray-500">Custo médio/pneu</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 px-6 font-medium text-gray-700">{formatMes(m.mes)}</td>
                      <td className="py-2.5 px-6 text-right text-gray-600">{m.total_produzido}</td>
                      <td className={`py-2.5 px-6 text-right ${Number(m.total_refugo) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{m.total_refugo}</td>
                      <td className="py-2.5 px-6 text-right text-gray-600">{formatMoney(m.total_custo_carcacas)}</td>
                      <td className="py-2.5 px-6 text-right text-gray-600">{formatMoney(m.total_custo_materiais)}</td>
                      <td className="py-2.5 px-6 text-right font-semibold text-gray-800">{formatMoney(m.custo_medio_por_pneu)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="py-2.5 px-6 font-semibold text-gray-800">Total no período</td>
                    <td className="py-2.5 px-6 text-right font-semibold text-gray-800">{totalProduzidoHistorico}</td>
                    <td className="py-2.5 px-6 text-right font-semibold text-red-500">{totalRefugoHistorico}</td>
                    <td colSpan={2} className="py-2.5 px-6 text-right text-gray-500">Investido: {formatMoney(totalInvestidoHistorico)}</td>
                    <td className="py-2.5 px-6 text-right font-semibold text-gray-800">
                      {formatMoney(totalProduzidoHistorico ? totalInvestidoHistorico / totalProduzidoHistorico : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
