// Utilitários para datas em fuso horário Brasil (UTC-3)
// Sempre use estas funções em vez de new Date().toISOString()
//
// Ancoradas explicitamente em America/Sao_Paulo via Intl — não usar
// new Date().getFullYear()/getHours() etc, pois isso reflete o fuso
// horário do dispositivo do usuário, não o do Brasil. Um admin acessando
// de um aparelho configurado em outro fuso veria "hoje" calculado errado
// e sumindo vendas que na verdade existem para o dia correto no Brasil.
const BRAZIL_TZ = 'America/Sao_Paulo';

export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function getLocalDateTimeString(date?: Date): string {
  const d = date || new Date();
  const dateStr = getLocalDateString(d);
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  return `${dateStr}T${timeStr}`;
}

export function formatDateForDB(date?: Date): string {
  return getLocalDateString(date);
}

export function formatDateTimeForDB(date?: Date): string {
  return getLocalDateTimeString(date);
}
