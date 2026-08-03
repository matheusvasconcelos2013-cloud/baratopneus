// Helper para montar o link do WhatsApp a partir de vendas e orçamentos.

// Aceita telefone em qualquer formatação (com máscara, com ou sem DDI) e
// devolve o link do wa.me. Retorna null quando não há número válido pra usar.
// Sem mensagem, abre a conversa do número direto, sem texto pré-preenchido —
// o recibo/orçamento em PDF já vai anexado por fora.
export function linkWhatsapp(telefone: string | null | undefined, mensagem?: string): string | null {
  let digitos = (telefone || '').replace(/\D/g, '');
  if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2);
  if (digitos.length < 10 || digitos.length > 11) return null;
  const base = `https://wa.me/55${digitos}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
