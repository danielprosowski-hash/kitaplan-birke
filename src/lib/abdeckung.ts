import type { Dienst, Mitarbeiter, Randdienst } from '../types'

export interface AbdeckungsZelle {
  datum: string
  randdienst: Randdienst
  besetztVon: string[] // Kürzel
}

export const TOLERANZ_MINUTEN = 15

/**
 * true, wenn die Person zum Zeitpunkt `minute` laut Dienst tatsächlich
 * anwesend ist (inklusive der genauen Schichtend-Minute – wessen Dienst
 * z.B. exakt um 17:00 endet, gilt für den Randdienst "17:00" noch als
 * anwesend, nicht schon als gegangen).
 */
function istZumZeitpunktAnwesend(d: Dienst, minute: number): boolean {
  if (minute >= d.beginn1Minuten && minute <= d.ende1Minuten) return true
  if (d.beginn2Minuten != null && d.ende2Minuten != null && minute >= d.beginn2Minuten && minute <= d.ende2Minuten) {
    return true
  }
  return false
}

/**
 * Prüft für jeden Werktag einer Woche, ob alle Pflicht-Randdienste besetzt sind.
 *
 * Ein Randdienst gilt als besetzt, wenn irgendeine Person zum Randdienst-
 * Zeitpunkt tatsächlich im Dienst ist – NICHT nur, wenn ein Dienst nahe
 * diesem Zeitpunkt beginnt. Die frühere Prüfung verglich ausschließlich den
 * Dienst-Beginn mit der Randdienst-Zeit; ein Spätdienst, der z.B. schon um
 * 12:00 begann und bis 17:00 durchgeht, deckt damit den Randdienst "17:00"
 * (und auch "15:30"/"16:00"/"16:15") tatsächlich ab, wurde vorher aber als
 * "unbesetzt" gemeldet, weil der Dienst-Beginn weit vor der Randdienst-Zeit
 * lag. Für knapp abweichende Anfangszeiten (z.B. 15:45 statt 16:00) bleibt
 * zusätzlich eine kleine Toleranz auf den jeweiligen Block-Beginn bestehen.
 */
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
      const passend = tagesDienste.filter((d) => {
        if (istZumZeitpunktAnwesend(d, rd.beginnMinuten)) return true
        const naheBlock1 = Math.abs(d.beginn1Minuten - rd.beginnMinuten) <= TOLERANZ_MINUTEN
        const naheBlock2 = d.beginn2Minuten != null && Math.abs(d.beginn2Minuten - rd.beginnMinuten) <= TOLERANZ_MINUTEN
        return naheBlock1 || naheBlock2
      })
      const kuerzel = passend
        .map((d) => (d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId)?.kuerzel : undefined))
        .filter((k): k is string => !!k)
      zellen.push({ datum: tag, randdienst: rd, besetztVon: kuerzel })
    }
    ergebnis.set(tag, zellen)
  }
  return ergebnis
}
