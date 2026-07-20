import type { Dienst } from '../types'
import { dienstBrutto } from './dienst'

/** Kernzeit nach Anleitung: 9:00 bis 14:00 Uhr. */
export const KERNZEIT_BEGINN = 9 * 60
export const KERNZEIT_ENDE = 14 * 60

export function istAnwesend(dienst: Dienst, minute: number): boolean {
  if (minute >= dienst.beginn1Minuten && minute < dienst.ende1Minuten) return true
  if (
    dienst.beginn2Minuten != null &&
    dienst.ende2Minuten != null &&
    minute >= dienst.beginn2Minuten &&
    minute < dienst.ende2Minuten
  ) {
    return true
  }
  return false
}

/** Prüft, ob während der Kernzeit genug Personal in einer Gruppe anwesend ist.
 * Liefert die fehlende Anzahl am schlechtesten Zeitpunkt (0 = kein Defizit). */
export function kernzeitDefizit(dienste: Dienst[], mindest: number): number {
  if (mindest <= 0) return 0
  for (let minute = KERNZEIT_BEGINN; minute < KERNZEIT_ENDE; minute += 15) {
    const anwesend = dienste.filter((d) => istAnwesend(d, minute)).length
    if (anwesend < mindest) return mindest - anwesend
  }
  return 0
}

/** Pausenpflicht nach ArbZG: ab 6 h muss mindestens 0,5 h Pause vorliegen (ab 9 h 0,75 h).
 * Bei Teildienst zählt die Lücke zwischen den Blöcken als Pause. */
export function pauseFehlt(dienst: Dienst): boolean {
  const brutto = dienstBrutto(dienst)
  if (brutto < 6) return false
  let pauseEffektiv = dienst.pauseStunden
  if (dienst.beginn2Minuten != null && dienst.ende1Minuten <= dienst.beginn2Minuten) {
    pauseEffektiv += (dienst.beginn2Minuten - dienst.ende1Minuten) / 60
  }
  const pflicht = brutto >= 9 ? 0.75 : 0.5
  return pauseEffektiv < pflicht
}
