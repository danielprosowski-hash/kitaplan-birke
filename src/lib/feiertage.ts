// Berechnet gesetzliche Feiertage für ein beliebiges Jahr, abhängig vom
// Bundesland. Damit funktioniert die App nicht nur für 2026 (das war zuvor
// hart einprogrammiert), sondern für jedes Jahr, das im Wochenplan, der
// Abrechnung oder den Ist-Zeiten aufgerufen wird.

export const BUNDESLAENDER: { code: string; name: string }[] = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function toIso(datum: Date): string {
  return `${datum.getUTCFullYear()}-${pad(datum.getUTCMonth() + 1)}-${pad(datum.getUTCDate())}`
}
function addTageUtc(datum: Date, tage: number): Date {
  const kopie = new Date(datum)
  kopie.setUTCDate(kopie.getUTCDate() + tage)
  return kopie
}

/** Ostersonntag nach der Gaußschen Osterformel. */
function ostersonntag(jahr: number): Date {
  const a = jahr % 19
  const b = Math.floor(jahr / 100)
  const c = jahr % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const monat = Math.floor((h + l - 7 * m + 114) / 31)
  const tag = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(jahr, monat - 1, tag))
}

/** Mittwoch vor dem 23. November – Buß- und Bettag (nur Sachsen). */
function bussUndBettag(jahr: number): Date {
  const stichtag = new Date(Date.UTC(jahr, 10, 23)) // 23. November
  const wochentag = stichtag.getUTCDay() // 0=So..6=Sa
  const diffZumMittwoch = wochentag >= 3 ? wochentag - 3 : wochentag + 4
  return addTageUtc(stichtag, -diffZumMittwoch)
}

/**
 * Liefert alle gesetzlichen Feiertage eines Jahres für das angegebene
 * Bundesland (ISO-Datum + Name). Nur bundesweite Tage, wenn kein
 * Bundesland-Code erkannt wird.
 */
export function berechneFeiertage(jahr: number, bundesland: string): { datum: string; name: string }[] {
  const ostern = ostersonntag(jahr)
  const liste: { datum: string; name: string; laender?: string[] }[] = [
    { datum: `${jahr}-01-01`, name: 'Neujahr' },
    { datum: toIso(addTageUtc(ostern, -2)), name: 'Karfreitag' },
    { datum: toIso(addTageUtc(ostern, 1)), name: 'Ostermontag' },
    { datum: `${jahr}-05-01`, name: 'Tag der Arbeit' },
    { datum: toIso(addTageUtc(ostern, 39)), name: 'Christi Himmelfahrt' },
    { datum: toIso(addTageUtc(ostern, 50)), name: 'Pfingstmontag' },
    { datum: `${jahr}-10-03`, name: 'Tag der Deutschen Einheit' },
    { datum: `${jahr}-12-25`, name: '1. Weihnachtstag' },
    { datum: `${jahr}-12-26`, name: '2. Weihnachtstag' },
    { datum: `${jahr}-01-06`, name: 'Heilige Drei Könige', laender: ['BW', 'BY', 'ST'] },
    { datum: `${jahr}-03-08`, name: 'Internationaler Frauentag', laender: ['BE', 'MV'] },
    {
      datum: toIso(addTageUtc(ostern, 60)),
      name: 'Fronleichnam',
      laender: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'],
    },
    { datum: `${jahr}-08-15`, name: 'Mariä Himmelfahrt', laender: ['SL'] },
    { datum: `${jahr}-09-20`, name: 'Weltkindertag', laender: ['TH'] },
    {
      datum: `${jahr}-10-31`,
      name: 'Reformationstag',
      laender: ['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH'],
    },
    { datum: `${jahr}-11-01`, name: 'Allerheiligen', laender: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { datum: toIso(bussUndBettag(jahr)), name: 'Buß- und Bettag', laender: ['SN'] },
  ]
  return liste
    .filter((f) => !f.laender || f.laender.includes(bundesland))
    .map((f) => ({ datum: f.datum, name: f.name }))
    .sort((a, b) => a.datum.localeCompare(b.datum))
}
