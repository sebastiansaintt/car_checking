export function formatFechaColombia(dateStr?: string | Date | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (e) {
    return String(dateStr);
  }
}

export function getHoraColombiaIso(): string {
  const now = new Date();
  // Formato ISO local Colombia
  const bogotaOffset = -5 * 60; // UTC-5 en minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bogotaDate = new Date(utc + (bogotaOffset * 60000));
  return bogotaDate.toISOString();
}
