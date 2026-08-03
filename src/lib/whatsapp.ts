// Helpers para montar links do WhatsApp a partir de vendas e orçamentos.
//
// Mensagens sem emoji: no WhatsApp de alguns aparelhos os emojis chegam
// como quadradinho (mesmo problema documentado em fidelizacao/page.tsx).
// Asteriscos (negrito do WhatsApp) passam intactos pelo encodeURIComponent
// e funcionam em qualquer aparelho.

function formatMoneyMsg(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aceita telefone em qualquer formatação (com máscara, com ou sem DDI) e
// devolve o link do wa.me. Retorna null quando não há número válido pra usar.
export function linkWhatsapp(telefone: string | null | undefined, mensagem: string): string | null {
  let digitos = (telefone || '').replace(/\D/g, '');
  if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2);
  if (digitos.length < 10 || digitos.length > 11) return null;
  return `https://wa.me/55${digitos}?text=${encodeURIComponent(mensagem)}`;
}

interface ItemVendaMsg {
  produto_nome?: string;
  produtos?: { nome?: string } | null;
  produto?: { nome?: string } | null;
  quantidade: number;
  subtotal: number;
  garantia?: boolean;
  lado?: string;
}

export function montarMensagemVenda(opts: {
  codigo?: string | number;
  clienteNome?: string;
  itens: ItemVendaMsg[];
  total: number;
  orcamento: boolean;
}): string {
  const { codigo, clienteNome, itens, total, orcamento } = opts;
  const primeiroNome = (clienteNome || '').trim().split(' ')[0];
  const saudacao = primeiroNome ? `Oi ${primeiroNome}, aqui é da *Barato Pneus*` : `Olá, aqui é da *Barato Pneus*`;

  const linhas = itens.map((i) => {
    const nome = i.produtos?.nome || i.produto?.nome || i.produto_nome || 'Produto';
    const lado = i.lado ? ` (${i.lado})` : '';
    if (i.garantia) return `- ${nome}${lado} — Garantia`;
    return `- ${i.quantidade}x ${nome}${lado} — ${formatMoneyMsg(i.subtotal)}`;
  }).join('\n');

  const intro = orcamento
    ? 'Segue o orçamento que você pediu:'
    : `Segue o resumo da sua compra${codigo ? ` #${codigo}` : ''}:`;

  const rodape = orcamento
    ? 'Esse valor é uma simulação e pode mudar conforme a disponibilidade em estoque. Qualquer dúvida, é só chamar!'
    : 'Obrigado pela preferência!';

  return `${saudacao}\n\n${intro}\n\n${linhas}\n\n*Total: ${formatMoneyMsg(total)}*\n\n${rodape}`;
}
