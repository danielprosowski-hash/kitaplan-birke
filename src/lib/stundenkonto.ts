import type { Abwesenheit, Dienst, Feiertag, Mitarbeiter } from '../types'
import { abwesenheitsartInfo } from '../types'
import { dienstNetto, istAktiv, tagesSoll } from './dienst'

export interface WochenkontoZeile {
  mitarbeiterId: number
  kuerzel: string
  name: string
  soll: number
  ist: number
  diff: number
}

/**
 * Soll/Ist je Person für eine Woche (Mo–Fr), gruppenübergreifend – damit
 * beim Planen sofort sichtbar ist, wer noch zu wenig oder schon zu viel
 * eingeplant ist, ohne dass man es selbst zusammenrechnen muss.
 * Berücksichtigt Feiertage (kein Soll) und Abwesenheiten mit Lohnausfall-
 * prinzip (Soll wird als Ist gutgeschrieben) – analog zur Abrechnung.
 */
export function berechneWochenkonto(
  mitarbeitende: Mitarbeiter[],
  werktage: string[],
  feiertage: Feiertag[],
  dienste: Dienst[],
  abwesenheiten: Abwesenheit[],
): WochenkontoZeile[] {
  const feiertagsDaten = new Set(feiertage.map((f) => f.datum))
  return mitarbeitende
    .filter((m) => istAktiv(m) && m.wochenstunden > 0)
    .map((m) => {
      const tagesSollWert = tagesSoll(m)
      let soll = 0
      let ist = 0
      for (const tag of werktage) {
        if (feiertagsDaten.has(tag)) continue
        soll += tagesSollWert
        const abw = abwesenheiten.find((a) => a.mitarbeiterId === m.id && a.datum === tag)
        if (abw) {
          if (abwesenheitsartInfo(abw.art).schreibtSollAlsIstGut) ist += tagesSollWert
        } else {
          const tagesDienste = dienste.filter((d) => d.mitarbeiterId === m.id && d.datum === tag)
          ist += tagesDienste.reduce((sum, d) => sum + dienstNetto(d), 0)
        }
      }
      return { mitarbeiterId: m.id!, kuerzel: m.kuerzel, name: m.name, soll, ist, diff: ist - soll }
    })
    .sort((a, b) => a.diff - b.diff)
}
