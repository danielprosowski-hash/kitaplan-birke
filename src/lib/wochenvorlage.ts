import type { Dienst } from '../types'
import { gregWochentag, type Wocheninfo } from './calendar'

/** Reservierte Vorlage-Daten (Jahr 1900) – dienen nur als Marker, damit
 * Vorlagen-Dienste nicht in echten Wochen auftauchen. Wochentag -> Datum.
 * Die Zuordnung ist willkürlich (kein Bezug zum echten Kalender 1900) –
 * wichtig ist nur, dass sie eindeutig hin- und zurück auflösbar ist. */
const VORLAGE_DATUM: Record<number, string> = {
  1: '1900-01-07', // So
  2: '1900-01-01', // Mo
  3: '1900-01-02', // Di
  4: '1900-01-03', // Mi
  5: '1900-01-04', // Do
  6: '1900-01-05', // Fr
  7: '1900-01-06', // Sa
}

const WOCHENTAG_VON_VORLAGE_DATUM: Record<string, number> = Object.fromEntries(
  Object.entries(VORLAGE_DATUM).map(([wd, datum]) => [datum, Number(wd)]),
)

export function vorlageDatumFuerWochentag(wd: number): string {
  return VORLAGE_DATUM[wd] ?? VORLAGE_DATUM[1]
}

export function wochentagVonVorlageDatum(iso: string): number {
  return WOCHENTAG_VON_VORLAGE_DATUM[iso] ?? 1
}

export function istVorlageDatum(iso: string): boolean {
  return iso.startsWith('1900-')
}

export type NeuerDienst = Omit<Dienst, 'id'>

/** Baut aus den echten Diensten der Quellwoche die neuen Vorlagen-Dienste. */
export function baueVorlage(quellWoche: Wocheninfo, alleDienste: Dienst[]): NeuerDienst[] {
  const quellTage = new Set(quellWoche.alleTage)
  const quellDienste = alleDienste.filter((d) => !d.istVorlage && quellTage.has(d.datum))
  return quellDienste.map((d) => ({
    istVorlage: true,
    datum: vorlageDatumFuerWochentag(gregWochentag(d.datum)),
    beginn1Minuten: d.beginn1Minuten,
    ende1Minuten: d.ende1Minuten,
    beginn2Minuten: d.beginn2Minuten,
    ende2Minuten: d.ende2Minuten,
    pauseStunden: d.pauseStunden,
    mitarbeiterId: d.mitarbeiterId,
    gruppenSlot: d.gruppenSlot,
  }))
}

function datumFuerWochentagInWoche(weekday: number, woche: Wocheninfo): string {
  const offset: Record<number, number> = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 1: 6 }
  const idx = offset[weekday] ?? 0
  return woche.alleTage[idx]
}

/** Baut die neuen Dienste, die beim Übernehmen der Vorlage auf die Zielwoche entstehen,
 * plus – falls gewünscht – die IDs der zu löschenden bestehenden Dienste der Zielwoche. */
export function baueUebernahme(
  zielWoche: Wocheninfo,
  vorlage: Dienst[],
  vorhandeneErsetzen: boolean,
  alleDienste: Dienst[],
): { neueDienste: NeuerDienst[]; zuLoeschenIds: number[] } {
  const zielTage = new Set(zielWoche.alleTage)
  const zuLoeschenIds = vorhandeneErsetzen
    ? alleDienste.filter((d) => !d.istVorlage && zielTage.has(d.datum) && d.id != null).map((d) => d.id!)
    : []

  const neueDienste: NeuerDienst[] = vorlage.map((v) => ({
    istVorlage: false,
    datum: datumFuerWochentagInWoche(wochentagVonVorlageDatum(v.datum), zielWoche),
    beginn1Minuten: v.beginn1Minuten,
    ende1Minuten: v.ende1Minuten,
    beginn2Minuten: v.beginn2Minuten,
    ende2Minuten: v.ende2Minuten,
    pauseStunden: v.pauseStunden,
    mitarbeiterId: v.mitarbeiterId,
    gruppenSlot: v.gruppenSlot,
  }))
  return { neueDienste, zuLoeschenIds }
}
