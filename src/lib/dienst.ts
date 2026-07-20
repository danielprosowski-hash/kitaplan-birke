import type { Dienst, IstZeit, Mitarbeiter } from '../types'

/** Tages-Soll nach Anleitung: Wochenstunden / 5 (5-Tage-Woche). */
export function tagesSoll(m: Mitarbeiter): number {
  return m.wochenstunden / 5
}

export function istAktiv(m: Mitarbeiter, heute: string = new Date().toISOString().slice(0, 10)): boolean {
  if (!m.austrittsdatum) return true
  return m.austrittsdatum > heute
}

/** Brutto-Dauer eines Dienstes in Stunden (Block 1 + ggf. Block 2), ohne Pausenabzug. */
export function dienstBrutto(d: Dienst): number {
  const block1 = Math.max(0, d.ende1Minuten - d.beginn1Minuten)
  let minuten = block1
  if (d.beginn2Minuten != null && d.ende2Minuten != null && d.ende2Minuten > d.beginn2Minuten) {
    minuten += d.ende2Minuten - d.beginn2Minuten
  }
  return minuten / 60
}

/** Netto-Stunden eines Dienstes = Brutto minus eingetragene Pause. */
export function dienstNetto(d: Dienst): number {
  return Math.max(0, dienstBrutto(d) - d.pauseStunden)
}

export function istZeitBrutto(iz: IstZeit): number {
  return Math.max(0, iz.bisMinuten - iz.vonMinuten) / 60
}

/** Pflichtpause nach ArbZG: unter 6 h keine Pause, ab 6 h 0,5 h, ab 9 h 0,75 h. */
export function arbZGPause(bruttoStunden: number): number {
  if (bruttoStunden >= 9) return 0.75
  if (bruttoStunden >= 6) return 0.5
  return 0
}

export function istZeitNetto(iz: IstZeit): number {
  const brutto = istZeitBrutto(iz)
  return Math.max(0, brutto - arbZGPause(brutto))
}
