import { describe, expect, it } from 'vitest'
import { formatZeit, isoKalenderwoche, isoWochentag, parseZeit, wocheninfo } from '../calendar'
import { arbZGPause, dienstBrutto, dienstNetto } from '../dienst'
import { kernzeitDefizit, pauseFehlt, findeUeberschneidungen, dienstUeberlappt } from '../pruefungen'
import { berechneTage, summen } from '../abrechnung'
import { berechneWochenkonto } from '../stundenkonto'
import { baueUebernahme, baueVorlage } from '../wochenvorlage'
import { berechneFeiertage } from '../feiertage'
import type { Dienst, Mitarbeiter } from '../../types'

describe('feiertage', () => {
  it('berechnet die beweglichen Feiertage 2026 korrekt (Ostersonntag: 5. April 2026)', () => {
    const liste = berechneFeiertage(2026, 'ST')
    const nach = (name: string) => liste.find((f) => f.name === name)?.datum
    expect(nach('Karfreitag')).toBe('2026-04-03')
    expect(nach('Ostermontag')).toBe('2026-04-06')
    expect(nach('Christi Himmelfahrt')).toBe('2026-05-14')
    expect(nach('Pfingstmontag')).toBe('2026-05-25')
  })

  it('berücksichtigt den Reformationstag für Sachsen-Anhalt, aber nicht für Bayern', () => {
    expect(berechneFeiertage(2026, 'ST').some((f) => f.name === 'Reformationstag')).toBe(true)
    expect(berechneFeiertage(2026, 'BY').some((f) => f.name === 'Reformationstag')).toBe(false)
  })

  it('berücksichtigt Fronleichnam nur in den betreffenden Bundesländern', () => {
    expect(berechneFeiertage(2026, 'BY').some((f) => f.name === 'Fronleichnam')).toBe(true)
    expect(berechneFeiertage(2026, 'ST').some((f) => f.name === 'Fronleichnam')).toBe(false)
  })

  it('liefert für jedes Jahr die neun bundesweiten Feiertage, unabhängig vom Bundesland', () => {
    const liste2030 = berechneFeiertage(2030, 'HH')
    expect(liste2030.length).toBeGreaterThanOrEqual(9)
    expect(liste2030.some((f) => f.name === 'Neujahr')).toBe(true)
  })
})

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

function dienst(overrides: Partial<Dienst>): Dienst {
  return {
    istVorlage: false,
    datum: '2026-03-02',
    beginn1Minuten: 8 * 60,
    ende1Minuten: 14 * 60,
    beginn2Minuten: null,
    ende2Minuten: null,
    pauseStunden: 0.5,
    mitarbeiterId: 1,
    gruppenSlot: 1,
    ...overrides,
  }
}

describe('Überschneidungen (gruppenübergreifende Doppelverplanung)', () => {
  it('erkennt, wenn dieselbe Person zeitgleich in zwei Gruppen eingeplant ist', () => {
    const a = dienst({ id: 1, gruppenSlot: 1, beginn1Minuten: 8 * 60, ende1Minuten: 14 * 60 })
    const b = dienst({ id: 2, gruppenSlot: 2, beginn1Minuten: 9 * 60, ende1Minuten: 15 * 60 })
    expect(dienstUeberlappt(a, b)).toBe(true)
    const treffer = findeUeberschneidungen([a, b])
    expect(treffer).toHaveLength(1)
    expect(treffer[0].mitarbeiterId).toBe(1)
  })

  it('meldet keine Überschneidung bei direkt aneinander anschließenden Diensten', () => {
    const a = dienst({ id: 1, gruppenSlot: 1, beginn1Minuten: 6 * 60, ende1Minuten: 12 * 60 })
    const b = dienst({ id: 2, gruppenSlot: 2, beginn1Minuten: 12 * 60, ende1Minuten: 18 * 60 })
    expect(dienstUeberlappt(a, b)).toBe(false)
    expect(findeUeberschneidungen([a, b])).toHaveLength(0)
  })

  it('ignoriert unterschiedliche Personen und unterschiedliche Tage', () => {
    const a = dienst({ id: 1, mitarbeiterId: 1, datum: '2026-03-02' })
    const b = dienst({ id: 2, mitarbeiterId: 2, datum: '2026-03-02' })
    const c = dienst({ id: 3, mitarbeiterId: 1, datum: '2026-03-03' })
    expect(findeUeberschneidungen([a, b, c])).toHaveLength(0)
  })
})

describe('Wochenkonto', () => {
  const person: Mitarbeiter = {
    id: 1,
    kuerzel: 'AB',
    name: 'Anna Beispiel',
    funktion: 'Erzieher',
    wochenstunden: 30, // 6 Std./Tag bei 5-Tage-Woche
    beschaeftigtSeit: '2020-01-01',
    stammgruppeSlot: 1,
    hinweise: '',
    austrittsdatum: null,
    reihenfolge: 0,
  }
  const werktage = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'] // Mo–Fr

  it('summiert Ist aus Diensten über alle Gruppen und vergleicht mit dem Wochensoll', () => {
    const dienste = [
      dienst({ id: 1, datum: '2026-03-02', gruppenSlot: 1, beginn1Minuten: 8 * 60, ende1Minuten: 14 * 60, pauseStunden: 0.5 }),
      dienst({ id: 2, datum: '2026-03-03', gruppenSlot: 2, beginn1Minuten: 8 * 60, ende1Minuten: 14 * 60, pauseStunden: 0.5 }),
    ]
    const zeilen = berechneWochenkonto([person], werktage, [], dienste, [])
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0].soll).toBe(30) // 6 Std. x 5 Werktage
    expect(zeilen[0].ist).toBe(11) // 2 x 5,5 Std. netto
    expect(zeilen[0].diff).toBeLessThan(0)
  })

  it('schreibt Urlaub als Soll=Ist gut, reduziert das Wochensoll an Feiertagen', () => {
    const abwesenheiten = [{ id: 1, datum: '2026-03-02', art: 'U' as const, bemerkung: '', mitarbeiterId: 1 }]
    const feiertage = [{ id: 1, datum: '2026-03-03', name: 'Testfeiertag', bundesland: 'bundesweit' }]
    const zeilen = berechneWochenkonto([person], werktage, feiertage, [], abwesenheiten)
    // 5 Werktage - 1 Feiertag = 4 Tage Soll, davon 1 Tag Urlaub voll gutgeschrieben.
    expect(zeilen[0].soll).toBe(24)
    expect(zeilen[0].ist).toBe(6)
  })

  it('lässt inaktive (ausgeschiedene) Personen weg', () => {
    const ausgeschieden: Mitarbeiter = { ...person, id: 2, austrittsdatum: '2020-06-01' }
    const zeilen = berechneWochenkonto([person, ausgeschieden], werktage, [], [], [])
    expect(zeilen.map((z) => z.mitarbeiterId)).toEqual([1])
  })
})
