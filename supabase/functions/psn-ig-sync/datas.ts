// Datas locais (America/Sao_Paulo). Porte de ig-analytics/server/lib/dates.js.
export const TIMEZONE = "America/Sao_Paulo";

const fmtDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Normaliza timestamps da Graph ("+0000") para ISO válido. */
export function paraDate(d: Date | string | number): Date {
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    return new Date(d.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  }
  return new Date(d);
}

/** Data (YYYY-MM-DD) no fuso local para um instante. */
export function dataLocal(d: Date | string | number = new Date()): string {
  return fmtDia.format(paraDate(d));
}

/** Offset (ms) do fuso local em um instante. */
function offsetMs(utc: Date): number {
  const p: Record<string, string> = {};
  for (
    const parte of new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(utc)
  ) p[parte.type] = parte.value;
  const comoUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? 0 : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return comoUtc - utc.getTime();
}

/** Epoch (segundos) da meia-noite local de uma data YYYY-MM-DD. */
export function meiaNoiteLocalEpoch(dia: string): number {
  const base = new Date(`${dia}T00:00:00Z`);
  return Math.round((base.getTime() - offsetMs(base)) / 1000);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Datas de `de` a `ate`, inclusive. */
export function intervaloDatas(de: string, ate: string): string[] {
  const out: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) out.push(d);
  return out;
}

/** end_time marca o fim do bucket diário; o dia correspondente é o anterior (local). */
export function diaDoBucket(endTime: string): string {
  return somarDias(dataLocal(endTime), -1);
}
