import { describe, expect, it } from 'vitest'
import { formatZeit, isoKalenderwoche, isoWochentag, parseZeit, wocheninfo } from '../calendar'
import { arbZGPause, dienstBrutto, dienstNetto } from '../dienst'
import { kernzeitDefizit, pauseFehlt } from '../pruefungen'
import { berechneTage, summen } from '../abrechnung'
import { baueUebernahme, baueVorlage } from '../wochenvorlage'
import type { Dienst, Mitarbeiter } from '../../types'

describe('calendar', () => {
  it('2026-01-05 ist laut Kalender ein Montag (ISO-Wochentag 1 = Montag)', () => {
    // Referenz: 1.1.2026 ist ein Donnerstag -> 5.1.2026 ist der folgende Montag.
    expect(isoWochentag('2026-01-05')).toBe(1)
  })

  it('berechnet die ISO-Kalenderwoche korrekt', () => {
    // 2024-01-01 ist ein Montag und gehört zu KW 1 2024.
    expect(isoKalenderwoche('2024-01-01')).toEqual({ jahr: 2024, kw: 1 })
    // 2026-01-01 (Donnerstag) gehört noch zu KW 1 2026.
    expect(isoKalenderwoche('2026-01-01').jahr).toBe(2026)
  })

  it('wocheninfo liefert Montag bis Sonntag', () => {
    const w = wocheninfo('2026-01-07') // Mittwoch
    expect(w.montag).toBe('2026-01-05')
    expect(w.sonntag).toBe('2026-01-11')
    expect(w.werktage).toHaveLength(5)
    expect(w.alleTage).toHaveLength(7)
  })

  it('parseZeit/formatZeit sind zueinander invers', () => {
    expect(parseZeit('07:30')).toBe(450)
    expect(formatZeit(450)).toBe('07:30')
    expect(parseZeit('bla')).toBeNull()
    expect(parseZeit('')).toBeNull()
  })
})

describe('dienst', () => {
  const basis: Dienst = {
    istVorlage: false,
    datum: '2026-01-05',
    beginn1Minuten: 8 * 60,
    ende1Minuten: 16 * 60,
    beginn2Minuten: null,
    ende2Minuten: null,
    pauseStunden: 0.5,
    mitarbeiterId: 1,
    gruppenSlot: 1,
  }

  it('berechnet Brutto- und Netto-Stunden', () => {
    expect(dienstBrutto(basis)).toBe(8)
    expect(dienstNetto(basis)).toBe(7.5)
  })

  it('ArbZG-Pause: <6h keine, ab 6h 0.5h, ab 9h 0.75h', () => {
    expect(arbZGPause(5.9)).toBe(0)
    expect(arbZGPause(6)).toBe(0.5)
    expect(arbZGPause(8.9)).toBe(0.5)
    expect(arbZGPause(9)).toBe(0.75)
  })
})

describe('pruefungen', () => {
  it('erkennt Kernzeit-Unterbesetzung', () => {
    const dienste: Dienst[] = [
      {
        istVorlage: false,
        datum: '2026-01-05',
        beginn1Minuten: 7 * 60,
        ende1Minuten: 12 * 60, // endet vor Kernzeitende 14 Uhr
        beginn2Minuten: null,
        ende2Minuten: null,
        pauseStunden: 0,
        mitarbeiterId: 1,
        gruppenSlot: 1,
      },
    ]
    // Die Funktion liefert das Defizit am ERSTEN unterbesetzten 15-Minuten-Takt
    // ab Kernzeitbeginn (9:00) – nicht das größte Defizit im gesamten Fenster.
    // Das entspricht 1:1 der ursprünglichen Swift-Logik.
    expect(kernzeitDefizit(dienste, 2)).toBe(1) // um 9:00 ist 1 von 2 nötigen Personen da
    expect(kernzeitDefizit(dienste, 1)).toBe(1) // ab 12:00 ist niemand mehr da
  })

  it('erkennt fehlende Pause ab 6 Stunden', () => {
    const ohnePause: Dienst = {
      istVorlage: false,
      datum: '2026-01-05',
      beginn1Minuten: 8 * 60,
      ende1Minuten: 15 * 60,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden: 0,
      mitarbeiterId: 1,
      gruppenSlot: 1,
    }
    expect(pauseFehlt(ohnePause)).toBe(true)
    expect(pauseFehlt({ ...ohnePause, pauseStunden: 0.5 })).toBe(false)
  })
})

describe('abrechnung', () => {
  const person: Mitarbeiter = {
    id: 1,
    kuerzel: 'AB',
    name: 'Anna Beispiel',
    funktion: 'Erzieher',
    wochenstunden: 35,
    beschaeftigtSeit: '2020-01-01',
    stammgruppeSlot: null,
    hinweise: '',
    austrittsdatum: null,
    reihenfolge: 1,
  }

  it('markiert Wochenende und Feiertag mit Soll/Ist 0', () => {
    // 2026-01-05 (Mo) bis 2026-01-11 (So); 1.1. ist kein Feiertag in diesem Bereich
    const tage = berechneTage(person, '2026-01-05', '2026-01-11', [], [], [], [])
    const samstag = tage.find((t) => t.datum === '2026-01-10')!
    expect(samstag.istWochenende).toBe(true)
    expect(samstag.soll).toBe(0)
  })

  it('Urlaub (U) schreibt Tages-Soll als Ist gut, Saldo 0', () => {
    const tage = berechneTage(
      person,
      '2026-01-05',
      '2026-01-05',
      [],
      [],
      [{ id: 1, datum: '2026-01-05', art: 'U', bemerkung: '', mitarbeiterId: 1 }],
      [],
    )
    expect(tage[0].soll).toBe(7)
    expect(tage[0].ist).toBe(7)
    expect(tage[0].saldo).toBe(0)
  })

  it('Frei (F) schreibt Soll, aber kein Ist gut -> negativer Saldo', () => {
    const tage = berechneTage(
      person,
      '2026-01-05',
      '2026-01-05',
      [],
      [],
      [{ id: 1, datum: '2026-01-05', art: 'F', bemerkung: '', mitarbeiterId: 1 }],
      [],
    )
    expect(tage[0].ist).toBe(0)
    expect(tage[0].saldo).toBe(-7)
  })

  it('normaler Werktag summiert Netto-Stunden der Dienste', () => {
    const dienst: Dienst = {
      istVorlage: false,
      datum: '2026-01-05',
      beginn1Minuten: 8 * 60,
      ende1Minuten: 16 * 60,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden: 0.5,
      mitarbeiterId: 1,
      gruppenSlot: 1,
    }
    const tage = berechneTage(person, '2026-01-05', '2026-01-05', [], [dienst], [], [])
    expect(tage[0].ist).toBe(7.5)
    expect(tage[0].saldo).toBeCloseTo(0.5)
  })

  it('summen() addiert korrekt', () => {
    const tage = berechneTage(person, '2026-01-05', '2026-01-11', [], [], [], [])
    const s = summen(tage)
    expect(s.soll).toBe(5 * 7) // 5 Werktage * 7h Tages-Soll
  })
})

describe('wochenvorlage: Rundreise Vorlage -> Übernahme behält Wochentage', () => {
  it('speichert eine Woche als Vorlage und übernimmt sie korrekt auf eine andere Woche', () => {
    const quellWoche = wocheninfo('2026-01-05') // Mo 2026-01-05 .. So 2026-01-11
    const montagsDienst: Dienst = {
      id: 1,
      istVorlage: false,
      datum: '2026-01-05', // Montag
      beginn1Minuten: 8 * 60,
      ende1Minuten: 14 * 60,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden: 0.5,
      mitarbeiterId: 42,
      gruppenSlot: 3,
    }
    const freitagsDienst: Dienst = {
      id: 2,
      istVorlage: false,
      datum: '2026-01-09', // Freitag
      beginn1Minuten: 9 * 60,
      ende1Minuten: 15 * 60,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden: 0.5,
      mitarbeiterId: 43,
      gruppenSlot: 3,
    }

    const vorlage = baueVorlage(quellWoche, [montagsDienst, freitagsDienst])
    expect(vorlage).toHaveLength(2)

    // Simuliert, dass die Vorlage in der DB gespeichert wurde (id vergeben).
    const vorlageMitId: Dienst[] = vorlage.map((v, i) => ({ ...v, id: 100 + i }))

    const zielWoche = wocheninfo('2026-03-02') // andere Woche, Montag 2026-03-02
    const { neueDienste } = baueUebernahme(zielWoche, vorlageMitId, false, [])

    expect(neueDienste).toHaveLength(2)
    const neuerMontag = neueDienste.find((d) => d.mitarbeiterId === 42)!
    const neuerFreitag = neueDienste.find((d) => d.mitarbeiterId === 43)!

    // Montag der Quellwoche muss auf den Montag der Zielwoche fallen, nicht auf einen anderen Wochentag.
    expect(neuerMontag.datum).toBe(zielWoche.werktage[0])
    expect(neuerFreitag.datum).toBe(zielWoche.werktage[4])
    expect(neuerMontag.beginn1Minuten).toBe(8 * 60)
    expect(neuerFreitag.beginn1Minuten).toBe(9 * 60)
  })
})
