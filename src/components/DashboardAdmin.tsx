'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface RelatorioDiario {
  data_venda: string;
  loja_nome: string;
  total_vendas: number;
  faturamento: number;
  lucro: number;
  ticket_medio: number;
}

interface EstoqueAtual {
  produto_id: number;
  produto_nome: string;
  loja_id: number;
  loja_nome: string;
  quantidade: number;
  estoque_minimo: number;
  estoque_baixo: boolean;
}

interface VendasPorLoja {
  loja_nome: string;
  total_vendas: number;
  faturamento: number;
  lucro: number;
  ticket_medio: number;
}

export default function DashboardAdmin() {
  const [relatorios, setRelatorios] = useState<RelatorioDiario[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<EstoqueAtual[]>([]);
  const [vendasPorLoja, setVendasPorLoja] = useState<VendasPorLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarDados();
  }, [filtroData]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // 1. Carregar relatório diário
      const { data: relData } = await supabase
        .from('relatorio_diario')
        .select('*')
        .eq('data_venda', filtroData)
        .order('loja_nome');

      if (relData) setRelatorios(relData);

      // 2. Carregar estoque baixo
      const { data: estoqueData } = await supabase
        .from('estoque_atual')
        .select('*')
        .eq('estoque_baixo', true)
        .order('loja_nome, produto_nome');

      if (estoqueData) setEstoqueBaixo(estoqueData);

      // 3. Calcular vendas por loja (últimos 30 dias)
      const { data: vendasData } = await supabase
        .from('relatorio_diario')
        .select('loja_nome, total_vendas, faturamento, lucro, ticket_medio')
        .gte('data_venda', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (vendasData) {
        // Agrupar por loja
        const grouped = vendasData.reduce((acc: any, item: any) => {
          const existing = acc.find((a: any) => a.loja_nome === item.loja_nome);
          if (existing) {
            existing.total_vendas += item.total_vendas;
            existing.faturamento += item.faturamento;
            existing.lucro += item.lucro;
            existing.ticket_medio = existing.faturamento / existing.total_vendas;
          } else {
            acc.push(item);
          }
          return acc;
        }, []);
        setVendasPorLoja(grouped);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const totalFaturamento = relatorios.reduce((sum, r) => sum + (r.faturamento || 0), 0);
  const totalLucro = relatorios.reduce((sum, r) => sum + (r.lucro || 0), 0);
  const totalVendas = relatorios.reduce((sum, r) => sum + (r.total_vendas || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">📊 Dashboard Administrativo</h1>
        <input
          type="date"
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* KPIs - Resumo do Dia */}
          {relatorios.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-medium">Total de Vendas</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{totalVendas}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm font-medium">Faturamento</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{formatMoney(totalFaturamento)}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                <p className="text-gray-600 text-sm font-medium">Lucro Total</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{formatMoney(totalLucro)}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
                <p className="text-gray-600 text-sm font-medium">Ticket Médio</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {formatMoney(totalVendas > 0 ? totalFaturamento / totalVendas : 0)}
                </p>
              </div>
            </div>
          )}

          {/* Vendas por Loja Hoje */}
          {relatorios.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Vendas por Loja - {filtroData}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Loja</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Vendas</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Faturamento</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Lucro</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorios.map((rel, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 font-medium">{rel.loja_nome}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{rel.total_vendas}</td>
                        <td className="text-right py-3 px-4 text-green-600 font-semibold">{formatMoney(rel.faturamento)}</td>
                        <td className="text-right py-3 px-4 text-purple-600 font-semibold">{formatMoney(rel.lucro)}</td>
                        <td className="text-right py-3 px-4 text-orange-600">{formatMoney(rel.ticket_medio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparativo Últimos 30 Dias */}
          {vendasPorLoja.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Comparativo Lojas (Últimos 30 dias)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Loja</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Vendas</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Faturamento</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Lucro</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasPorLoja.map((loja, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 font-medium">{loja.loja_nome}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{loja.total_vendas}</td>
                        <td className="text-right py-3 px-4 text-green-600 font-semibold">{formatMoney(loja.faturamento)}</td>
                        <td className="text-right py-3 px-4 text-purple-600 font-semibold">{formatMoney(loja.lucro)}</td>
                        <td className="text-right py-3 px-4 text-orange-600">{formatMoney(loja.ticket_medio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerta: Estoque Baixo */}
          {estoqueBaixo.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-red-800 mb-4">⚠️ Produtos com Estoque Baixo</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-3 px-4 font-semibold text-red-700">Produto</th>
                      <th className="text-left py-3 px-4 font-semibold text-red-700">Loja</th>
                      <th className="text-right py-3 px-4 font-semibold text-red-700">Quantidade</th>
                      <th className="text-right py-3 px-4 font-semibold text-red-700">Mínimo</th>
                      <th className="text-right py-3 px-4 font-semibold text-red-700">Falta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoqueBaixo.map((item, idx) => (
                      <tr key={idx} className="border-b border-red-100 hover:bg-red-100">
                        <td className="py-3 px-4 text-red-900 font-medium">{item.produto_nome}</td>
                        <td className="py-3 px-4 text-red-900">{item.loja_nome}</td>
                        <td className="text-right py-3 px-4 text-red-900 font-semibold">{item.quantidade}</td>
                        <td className="text-right py-3 px-4 text-red-900">{item.estoque_minimo}</td>
                        <td className="text-right py-3 px-4 text-red-600 font-bold">
                          {Math.max(0, item.estoque_minimo - item.quantidade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensagem quando não há dados */}
          {relatorios.length === 0 && estoqueBaixo.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
              <p className="text-blue-800">Nenhum dado disponível para este período</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}