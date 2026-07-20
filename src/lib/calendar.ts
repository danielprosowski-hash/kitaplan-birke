// Datums- und Zeit-Hilfsfunktionen für die gesamte App.
// Datumswerte werden überall als ISO-String "yyyy-MM-dd" gespeichert und
// als UTC-Mitternacht interpretiert, damit es keine Zeitzonen-/DST-Sprünge
// gibt (entspricht der Rolle von Calendar.kita in der Mac-App).

export function isoHeute(): string {
  return dateToIso(new Date())
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function utcDateToIso(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addTage(iso: string, tage: number): string {
  const d = isoToUtcDate(iso)
  d.setUTCDate(d.getUTCDate() + tage)
  return utcDateToIso(d)
}

export function addMonate(iso: string, monate: number): string {
  const d = isoToUtcDate(iso)
  d.setUTCMonth(d.getUTCMonth() + monate)
  return utcDateToIso(d)
}

/** ISO-Wochentag: 1 = Montag ... 7 = Sonntag. */
export function isoWochentag(iso: string): number {
  const jsDay = isoToUtcDate(iso).getUTCDay() // 0 = Sonntag ... 6 = Samstag
  return jsDay === 0 ? 7 : jsDay
}

/** Wochentag im Gregorianischen Schema (wie Foundations `Calendar.weekday`
 * aus der ursprünglichen Mac-App): 1 = Sonntag ... 7 = Samstag, 2 = Montag. */
export function gregWochentag(iso: string): number {
  return isoToUtcDate(iso).getUTCDay() + 1
}

export function istWochenende(iso: string): boolean {
  const wd = isoWochentag(iso)
  return wd === 6 || wd === 7
}

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function wochentagKurz(iso: string): string {
  return WOCHENTAGE_KURZ[isoToUtcDate(iso).getUTCDay()]
}

export function formatDatum(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function formatDatumKurz(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export function formatMonatJahr(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return `${MONATE[m - 1]} ${y}`
}

/** ISO-8601-Kalenderwoche (Montag als erster Tag, Woche 1 enthält den ersten Donnerstag). */
export function isoKalenderwoche(iso: string): { jahr: number; kw: number } {
  const d = isoToUtcDate(iso)
  const day = (d.getUTCDay() + 6) % 7 // 0 = Montag
  d.setUTCDate(d.getUTCDate() - day + 3) // auf Donnerstag der gleichen Woche
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3)
  const kw = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return { jahr: d.getUTCFullYear(), kw }
}

export function montagDerWoche(iso: string): string {
  const wd = isoWochentag(iso)
  return addTage(iso, -(wd - 1))
}

export interface Wocheninfo {
  jahr: number
  kw: number
  montag: string
  sonntag: string
  werktage: string[] // Mo-Fr
  alleTage: string[] // Mo-So
  bezeichnung: string
}

export function wocheninfo(datumIso: string): Wocheninfo {
  const montag = montagDerWoche(datumIso)
  const sonntag = addTage(montag, 6)
  const { jahr, kw } = isoKalenderwoche(montag)
  const werktage = [0, 1, 2, 3, 4].map((n) => addTage(montag, n))
  const alleTage = [0, 1, 2, 3, 4, 5, 6].map((n) => addTage(montag, n))
  return {
    jahr,
    kw,
    montag,
    sonntag,
    werktage,
    alleTage,
    bezeichnung: `KW ${kw} · ${formatDatum(montag)} – ${formatDatum(sonntag)}`,
  }
}

/** Alle Tage eines Monats als ISO-Strings. */
export function monatsTage(monatIso: string): string[] {
  const [y, m] = monatIso.split('-').map(Number)
  const letzterTag = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const erster = `${y}-${String(m).padStart(2, '0')}-01`
  return Array.from({ length: letzterTag }, (_, i) => addTage(erster, i))
}

// --- Zeit (Minuten seit 0:00) ---

export function formatZeit(minuten: number | null | undefined): string {
  if (minuten == null || minuten < 0) return ''
  const h = Math.floor(minuten / 60)
  const r = minuten % 60
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function parseZeit(text: string): number | null {
  const bereinigt = text.replace('.', ':').trim()
  if (!bereinigt) return null
  const teile = bereinigt.split(':')
  const h = Number(teile[0])
  if (Number.isNaN(h)) return null
  const m = teile.length > 1 ? Number(teile[1]) || 0 : 0
  const summe = h * 60 + m
  if (summe < 0 || summe > 24 * 60) return null
  return summe
}

const STUNDEN_FORMAT = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function stundenText(wert: number): string {
  return `${STUNDEN_FORMAT.format(wert)} h`
}

export function stundenZahl(wert: number): string {
  return STUNDEN_FORMAT.format(wert)
}

export function heuteDatumUhrzeit(): string {
  return new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}
