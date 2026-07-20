import type { Dienst, Mitarbeiter, Randdienst } from '../types'

export interface AbdeckungsZelle {
  datum: string
  randdienst: Randdienst
  besetztVon: string[] // Kürzel
}

export const TOLERANZ_MINUTEN = 15

/** Prüft für jeden Werktag einer Woche, ob alle Pflicht-Randdienste besetzt sind.
 * Ein Randdienst gilt als besetzt, wenn irgendein Dienst zur Anfangszeit ±15 Min. beginnt. */
export function pruefeAbdeckung(
  randdienste: Randdienst[],
  dienste: Dienst[],
  werktage: string[],
  mitarbeiterNachId: Map<number, Mitarbeiter>,
): Map<string, AbdeckungsZelle[]> {
  const ergebnis = new Map<string, AbdeckungsZelle[]>()
  for (const tag of werktage) {
    const tagesDienste = dienste.filter((d) => d.datum === tag)
    const zellen: AbdeckungsZelle[] = []
    for (const rd of randdienste.filter((r) => r.aktiv)) {
      const passend = tagesDienste.filter((d) => Math.abs(d.beginn1Minuten - rd.beginnMinuten) <= TOLERANZ_MINUTEN)
      const kuerzel = passend
        .map((d) => (d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId)?.kuerzel : undefined))
        .filter((k): k is string => !!k)
      zellen.push({ datum: tag, randdienst: rd, besetztVon: kuerzel })
    }
    ergebnis.set(tag, zellen)
  }
  return ergebnis
}
