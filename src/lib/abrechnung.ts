import type { Abwesenheit, Dienst, Feiertag, IstZeit, Mitarbeiter } from '../types'
import { abwesenheitsartInfo } from '../types'
import { addTage, istWochenende, wochentagKurz } from './calendar'
import { dienstNetto, istZeitNetto, tagesSoll } from './dienst'

export interface AbrechnungsTag {
  datum: string
  wochentagKurz: string
  soll: number
  ist: number
  bemerkung: string
  saldo: number
  istWochenende: boolean
  istFeiertag: boolean
}

/**
 * Berechnet für eine Person das taggenaue Konto vom Start- bis zum Endtag.
 * Regelreihenfolge (entspricht der Anleitung):
 * 1. Wochenende -> Soll 0, Ist 0.
 * 2. Feiertag -> Soll 0, Ist 0, Bemerkung = Name des Feiertags.
 * 3. Abwesenheit mit Lohnausfallprinzip (U, RT, UWT, K, FB) -> Ist = Tages-Soll, Saldo 0.
 * 4. Abwesenheit ohne Gutschrift (F, Ue, MZ, EZ) -> Ist 0, Saldo negativ (Konto ruht bewusst).
 * 5. Normaler Werktag -> Ist-Zeit hat Vorrang, sonst Summe der geplanten Dienste.
 */
export function berechneTage(
  person: Mitarbeiter,
  von: string,
  bis: string,
  feiertage: Feiertag[],
  dienste: Dienst[],
  abwesenheiten: Abwesenheit[],
  istZeiten: IstZeit[],
): AbrechnungsTag[] {
  const ergebnis: AbrechnungsTag[] = []
  const feiertagsIndex = new Map(feiertage.map((f) => [f.datum, f]))
  const eigeneDienste = dienste.filter((d) => !d.istVorlage && d.mitarbeiterId === person.id)
  const eigeneAbwesenheiten = abwesenheiten.filter((a) => a.mitarbeiterId === person.id)
  const eigeneIstZeiten = istZeiten.filter((iz) => iz.mitarbeiterId === person.id)
  const soll = tagesSoll(person)

  let aktuell = von
  while (aktuell <= bis) {
    const weekendeHeute = istWochenende(aktuell)
    const feiertag = feiertagsIndex.get(aktuell)
    const abwesenheitHeute = eigeneAbwesenheiten.find((a) => a.datum === aktuell)
    const diensteHeute = eigeneDienste.filter((d) => d.datum === aktuell)
    const istZeitenHeute = eigeneIstZeiten.filter((iz) => iz.datum === aktuell)

    if (weekendeHeute) {
      ergebnis.push({
        datum: aktuell,
        wochentagKurz: wochentagKurz(aktuell),
        soll: 0,
        ist: 0,
        bemerkung: 'Wochenende',
        saldo: 0,
        istWochenende: true,
        istFeiertag: false,
      })
    } else if (feiertag) {
      ergebnis.push({
        datum: aktuell,
        wochentagKurz: wochentagKurz(aktuell),
        soll: 0,
        ist: 0,
        bemerkung: feiertag.name,
        saldo: 0,
        istWochenende: false,
        istFeiertag: true,
      })
    } else if (abwesenheitHeute) {
      const info = abwesenheitsartInfo(abwesenheitHeute.art)
      const ist = info.schreibtSollAlsIstGut ? soll : 0
      ergebnis.push({
        datum: aktuell,
        wochentagKurz: wochentagKurz(aktuell),
        soll,
        ist,
        bemerkung: `${info.code} (${info.grundlage})`,
        saldo: ist - soll,
        istWochenende: false,
        istFeiertag: false,
      })
    } else {
      const istSumme =
        istZeitenHeute.length > 0
          ? istZeitenHeute.reduce((sum, iz) => sum + istZeitNetto(iz), 0)
          : diensteHeute.reduce((sum, d) => sum + dienstNetto(d), 0)
      ergebnis.push({
        datum: aktuell,
        wochentagKurz: wochentagKurz(aktuell),
        soll,
        ist: istSumme,
        bemerkung: '',
        saldo: istSumme - soll,
        istWochenende: false,
        istFeiertag: false,
      })
    }
    aktuell = addTage(aktuell, 1)
  }
  return ergebnis
}

export function summen(tage: AbrechnungsTag[]): { soll: number; ist: number; saldo: number } {
  const soll = tage.reduce((s, t) => s + t.soll, 0)
  const ist = tage.reduce((s, t) => s + t.ist, 0)
  return { soll, ist, saldo: ist - soll }
}
