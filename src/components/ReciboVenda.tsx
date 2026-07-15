'use client';

import { formatMoney, formatDate } from './FormElements';

interface ReciboVendaProps {
  venda: any;
  itens: any[];
  cliente: any;
  vendedor: any;
  loja: any;
  onClose: () => void;
}

export default function ReciboVenda({ venda, itens, cliente, vendedor, loja, onClose }: ReciboVendaProps) {
  const handlePrint = () => {
    window.print();
  };

  const garantia = venda?.observacao?.toLowerCase().includes('garantia')
    ? venda.observacao
    : 'Garantia de 3 meses contra defeitos de fabricação.';

  const data = new Date().toLocaleDateString('pt-BR');
  const hora = new Date().toLocaleTimeString('pt-BR');

  const enderecoLoja = loja?.endereco
    ? `${loja.endereco}${loja.cidade ? ' | ' + loja.cidade : ''}${loja.estado ? ' - ' + loja.estado : ''}`
    : 'Avenida Major Pinheiro Froes 1890 | Vila Maria de Maggi | Suzano - SP';

  return (
    <>
      {/* Botão de impressão (fora do print) */}
      <div className="no-print fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl hover:bg-blue-700 transition font-bold text-lg flex items-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          🖨️ Imprimir Recibo
        </button>
        <button
          onClick={onClose}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl hover:bg-gray-300 transition font-semibold"
        >
          Fechar
        </button>
      </div>

      {/* Conteúdo do recibo para impressão */}
      <div id="recibo-venda" className="print-area max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl">
        {/* Estilos de impressão embutidos */}
        <style>{`
          @media print {
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-area { box-shadow: none !important; border-radius: 0 !important; padding: 20px !important; max-width: 100% !important; }
            @page { margin: 15mm; size: A4 portrait; }
            .print-break-inside { break-inside: avoid; page-break-inside: avoid; }
          }
        `}</style>

        {/* Cabeçalho */}
        <div className="border-b-4 border-blue-600 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🚗 {loja?.nome || 'Barato Pneus'}
              </h1>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <p className="flex items-center gap-2">
                  <span>📍</span> {enderecoLoja}
                </p>
                <p className="flex items-center gap-2">
                  <span>📞</span> {loja?.telefone || '(11) 9.7625-1152'}
                </p>
                <p className="flex items-center gap-2">
                  <span>🔖</span> CNPJ: 54.426.524/0001-78
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-xl">
                <p className="text-xs uppercase tracking-wider opacity-80">Venda</p>
                <p className="text-2xl font-bold">#{venda.codigo || venda.id}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Emissão: {data} às {hora}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex gap-4 mb-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            venda.situacao === 'Finalizada' ? 'bg-green-100 text-green-700' :
            venda.situacao === 'Cancelada' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {venda.situacao || 'Em Aberto'}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
            {venda.tipo_pagamento || 'À Vista'}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-purple-100 text-purple-700">
            Data: {formatDate(venda.data_venda)}
          </span>
        </div>

        {/* Dados do Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 print-break-inside">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">👤 Cliente</h3>
            <p className="text-lg font-bold text-gray-800">{cliente?.nome || 'Consumidor'}</p>
            {cliente?.cpf_cnpj && cliente.cpf_cnpj.trim() && cliente.cpf_cnpj !== '.   .   .' && (
              <p className="text-sm text-gray-600">CPF/CNPJ: {cliente.cpf_cnpj}</p>
            )}
            {cliente?.celular && cliente.celular.trim() !== '(  )     -' && (
              <p className="text-sm text-gray-600">📱 {cliente.celular}</p>
            )}
            {cliente?.telefone && cliente.telefone.trim() !== '(  )     -' && (
              <p className="text-sm text-gray-600">📞 {cliente.telefone}</p>
            )}
            {cliente?.endereco && (
              <p className="text-sm text-gray-600 mt-1">{cliente.endereco}, {cliente.numero} {cliente.bairro ? '- ' + cliente.bairro : ''}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 print-break-inside">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">👩‍💼 Vendedor</h3>
            <p className="text-lg font-bold text-gray-800">{vendedor?.nome || 'Isabela'}</p>
            <p className="text-sm text-gray-500 mt-1">Obrigado pela preferência!</p>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-6 print-break-inside">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📦 Itens da Venda</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-3 px-4 text-sm font-semibold rounded-tl-xl">Código</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Descrição</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Valor Unit.</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Qtd</th>
                <th className="text-right py-3 px-4 text-sm font-semibold rounded-tr-xl">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.length > 0 ? itens.map((item: any, idx: number) => (
                <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="py-3 px-4 text-sm text-gray-600 font-mono">{item.produto_id || '-'}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.produto_nome || item.produtos?.nome || `Produto #${item.produto_id}`}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700">{formatMoney(item.preco_unitario)}</td>
                  <td className="py-3 px-4 text-sm text-center text-gray-700">{item.quantidade} Un</td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-gray-800">{formatMoney(item.subtotal)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">Nenhum item cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Garantia */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5 print-break-inside">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h3 className="font-bold text-yellow-800 text-lg">GARANTIA</h3>
                <p className="text-sm text-yellow-700 mt-1 font-medium">{garantia}</p>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-yellow-600">
                    Data da venda: {formatDate(venda.data_venda)}<br />
                    Validade da garantia: {(() => {
                      const [ano, mes, dia] = venda.data_venda.split('T')[0].split('-').map(Number);
                      const d = new Date(ano, mes - 1, dia);
                      d.setMonth(d.getMonth() + 3);
                      return d.toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-yellow-600 font-medium">Assinatura do cliente: ________________________________________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Totais */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 print-break-inside">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>{formatMoney(venda.valor_total || 0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Desconto:</span>
                <span className="text-red-500">- {formatMoney(0)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Qtd. de Itens:</span>
                <span>{itens.reduce((a: number, i: any) => a + (i.quantidade || 0), 0)} un</span>
              </div>
              {venda.tipo_pagamento !== 'À Vista' && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Valor Recebido:</span>
                  <span>{formatMoney(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t-2 border-gray-300 mt-3">
                <span>Valor Total:</span>
                <span className="text-green-600">{formatMoney(venda.valor_total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Observação */}
        {venda.observacao && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-6 print-break-inside">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">📝 Observações</h3>
            <p className="text-sm text-blue-800">{venda.observacao}</p>
          </div>
        )}

        {/* Informações de Pagamento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-500 uppercase">Pagamento</p>
            <p className="font-bold text-gray-800">{venda.tipo_pagamento || 'À Vista'}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p className="font-bold text-gray-800">{venda.situacao || 'Aberta'}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-500 uppercase">Data</p>
            <p className="font-bold text-gray-800">{formatDate(venda.data_venda)}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-500 uppercase">Vendedor(a)</p>
            <p className="font-bold text-gray-800">{vendedor?.nome || 'Isabela'}</p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t-2 border-gray-300 pt-4 text-center">
          <p className="text-gray-500 text-sm">📧 baratopneus@email.com | 📞 (11) 9.7625-1152</p>
          <p className="text-gray-400 text-xs mt-1">
            Documento emitido em {data} às {hora} - Barato Pneus
          </p>
          <div className="flex justify-center gap-8 mt-4 text-xs text-gray-400">
            <span>📄 Venda #{venda.codigo || venda.id}</span>
            <span>👤 {cliente?.nome || 'Consumidor'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
