'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from './Modal';
import { formatMoney, formatDate } from './FormElements';
import { Cliente } from '@/types';

interface ClienteHistoricoProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

interface VendaHistorico {
  id: number;
  codigo?: string;
  valor_total?: number;
  data_venda?: string;
  situacao?: string;
  orcamento?: boolean;
  loja?: { nome: string } | null;
  itens?: { quantidade: number; produto?: { nome: string } | null }[];
}

export default function ClienteHistorico({ isOpen, onClose, cliente }: ClienteHistoricoProps) {
  const [vendas, setVendas] = useState<VendaHistorico[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !cliente) return;
    carregar(cliente.id);
  }, [isOpen, cliente]);

  const carregar = async (clienteId: number) => {
    setLoading(true);
    // Vendedor não-admin só enxerga aqui as vendas do próprio cliente que
    // ele mesmo lançou — mesma regra de RLS já aplicada em /vendas.
    const { data, error } = await supabase
      .from('vendas')
      .select('id, codigo, valor_total, data_venda, situacao, orcamento, loja:lojas(nome), itens:vendas_itens(quantidade, produto:produtos(nome))')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false });
    if (error) console.error('Erro ao carregar histórico do cliente:', error);
    setVendas((data as any) || []);
    setLoading(false);
  };

  const compras = vendas.filter(v => !v.orcamento && v.situacao !== 'Cancelada');
  const orcamentos = vendas.filter(v => v.orcamento);
  const totalGasto = compras.reduce((a, v) => a + (v.valor_total || 0), 0);
  const ultimaCompra = compras[0]?.data_venda;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cliente ? `Histórico de ${cliente.nome}` : 'Histórico'} size="xl">
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Total gasto</p>
              <p className="text-lg font-bold text-green-600">{formatMoney(totalGasto)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Compras</p>
              <p className="text-lg font-bold text-gray-800">{compras.length}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500">Última compra</p>
              <p className="text-lg font-bold text-gray-800">{ultimaCompra ? formatDate(ultimaCompra) : '-'}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700">Orçamentos</p>
              <p className="text-lg font-bold text-amber-700">{orcamentos.length}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Data</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Itens</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Loja</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(v.data_venda || '')}</td>
                      <td className="py-2 px-3 text-sm text-gray-700">
                        {(v.itens || []).map(i => `${i.quantidade}x ${i.produto?.nome || 'Produto'}`).join(', ') || '-'}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600 whitespace-nowrap">{v.loja?.nome || '-'}</td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {v.orcamento ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">ORÇAMENTO</span>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            v.situacao === 'Finalizada' ? 'bg-green-100 text-green-700' :
                            v.situacao === 'Cancelada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{v.situacao || '-'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm text-right font-medium text-gray-800 whitespace-nowrap">{formatMoney(v.valor_total || 0)}</td>
                    </tr>
                  ))}
                  {vendas.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma compra registrada ainda</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
