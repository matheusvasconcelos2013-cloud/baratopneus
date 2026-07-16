// Utilitários para datas em fuso horário Brasil (UTC-3)
// Sempre use estas funções em vez de new Date().toISOString()

export function getLocalDateString(date?: Date): string {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalDateTimeString(date?: Date): string {
  const d = date || new Date();
  const dateStr = getLocalDateString(d);
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return `${dateStr}T${timeStr}`;
}

export function formatDateForDB(date?: Date): string {
  return getLocalDateString(date);
}

export function formatDateTimeForDB(date?: Date): string {
  return getLocalDateTimeString(date);
}
