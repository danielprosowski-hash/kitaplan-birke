import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Dienst, Dienstart, Gruppe, Mitarbeiter } from '../types'
import { addTage, formatZeit, isoHeute, parseZeit, stundenText, wocheninfo } from '../lib/calendar'
import { dienstNetto, istAktiv } from '../lib/dienst'
import { baueUebernahme, vorlageDatumFuerWochentag } from '../lib/wochenvorlage'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

const WOCHENTAGE: { wd: number; label: string }[] = [
  { wd: 2, label: 'Montag' },
  { wd: 3, label: 'Dienstag' },
  { wd: 4, label: 'Mittwoch' },
  { wd: 5, label: 'Donnerstag' },
  { wd: 6, label: 'Freitag' },
]

/**
 * Rahmenplan für ALLE Mitarbeitenden auf einer Seite – nicht nur für eine
 * einzelne, per Dropdown ausgewählte Person. Es soll immer für so viele
 * Kollegen gleichzeitig vorgeplant werden können, wie es Personal gibt;
 * dafür ist hier pro aktiver Person eine eigene, auf- und zuklappbare Karte
 * vorhanden. Aufklappen merkt sich, welche Karten gerade in Bearbeitung sind.
 */
export default function RahmenplanView() {
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [] as Mitarbeiter[])
  const alleGruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [] as Gruppe[])
  const alleDienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const alleDienstarten = useLiveQuery(() => db.dienstarten.orderBy('reihenfolge').toArray(), [], [] as Dienstart[])
  const { sichtbar, ausloesen } = useSpeicherFeedback()

  const [suche, setSuche] = useState('')
  const [ausgeklappt, setAusgeklappt] = useState<Set<number>>(new Set())
  const [ansicht, setAnsicht] = useState<'uebersicht' | 'bearbeiten'>('uebersicht')
  const [anzahlWochen, setAnzahlWochen] = useState(9)
  const [wirdVorausgeplant, setWirdVorausgeplant] = useState(false)
  const [vorausplanenMeldung, setVorausplanenMeldung] = useState<string | null>(null)

  const aktiveMitarbeiter = useMemo(() => (alleMitarbeiter ?? []).filter((m) => istAktiv(m)), [alleMitarbeiter])
  const aktiveGruppen = (alleGruppen ?? []).filter((g) => g.aktiv)
  const gruppeNachSlot = useMemo(() => new Map((alleGruppen ?? []).map((g) => [g.slot, g])), [alleGruppen])

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase()
    if (!s) return aktiveMitarbeiter
    return aktiveMitarbeiter.filter(
      (m) => m.name.toLowerCase().includes(s) || m.kuerzel.toLowerCase().includes(s),
    )
  }, [aktiveMitarbeiter, suche])

  function vorlageVon(personId: number): Dienst[] {
    return (alleDienste ?? []).filter((d) => d.istVorlage && d.mitarbeiterId === personId)
  }

  function toggle(personId: number) {
    setAusgeklappt((vorher) => {
      const neu = new Set(vorher)
      if (neu.has(personId)) neu.delete(personId)
      else neu.add(personId)
      return neu
    })
  }

  function alleAufklappen() {
    setAusgeklappt(new Set(gefiltert.map((m) => m.id!).filter((id) => id != null)))
  }
  function alleZuklappen() {
    setAusgeklappt(new Set())
  }

  function zuPersonSpringen(personId: number) {
    setAnsicht('bearbeiten')
    setAusgeklappt((vorher) => new Set(vorher).add(personId))
    // Nach dem Umschalten ist die Karte erst nach dem nächsten Render im DOM.
    setTimeout(() => {
      document.getElementById(`rahmenplan-person-${personId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  async function zeileAendern(
    personId: number,
    wd: number,
    feld: 'gruppenSlot' | 'beginn1Minuten' | 'ende1Minuten' | 'pauseStunden',
    wert: number | null,
  ) {
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageVon(personId).find((d) => d.datum === datum)
    if (bestehend?.id != null) {
      await db.dienste.update(bestehend.id, { [feld]: wert })
    } else {
      // Neue Rahmenplan-Zeile: Gruppe ist Pflicht, Zeiten bekommen sinnvolle Standardwerte.
      await db.dienste.add({
        istVorlage: true,
        datum,
        beginn1Minuten: feld === 'beginn1Minuten' ? (wert ?? 8 * 60) : 8 * 60,
        ende1Minuten: feld === 'ende1Minuten' ? (wert ?? 15 * 60) : 15 * 60,
        beginn2Minuten: null,
        ende2Minuten: null,
        pauseStunden: feld === 'pauseStunden' ? (wert ?? 0.5) : 0.5,
        mitarbeiterId: personId,
        gruppenSlot: feld === 'gruppenSlot' ? wert : null,
      })
    }
    ausloesen()
  }

  async function dienstartAnwenden(personId: number, wd: number, da: Dienstart) {
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageVon(personId).find((d) => d.datum === datum)
    const felder = {
      beginn1Minuten: da.beginn1Minuten,
      ende1Minuten: da.ende1Minuten,
      beginn2Minuten: da.beginn2Minuten,
      ende2Minuten: da.ende2Minuten,
      pauseStunden: da.pauseStunden,
    }
    if (bestehend?.id != null) {
      await db.dienste.update(bestehend.id, felder)
    } else {
      await db.dienste.add({
        istVorlage: true,
        datum,
        ...felder,
        mitarbeiterId: personId,
        gruppenSlot: aktiveGruppen[0]?.slot ?? null,
      })
    }
    ausloesen()
  }

  async function freiSetzen(personId: number, wd: number) {
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageVon(personId).find((d) => d.datum === datum)
    if (bestehend?.id != null) {
      await db.dienste.delete(bestehend.id)
      ausloesen()
    }
  }

  /**
   * Schreibt den Rahmenplan (für ALLE Personen, nicht nur eine) im Voraus in
   * so viele kommende Wochen, wie eingestellt – bisher wurde der Rahmenplan
   * nur automatisch übernommen, sobald man einzeln auf eine leere Woche im
   * Wochenplan navigierte. Das reichte nicht, um z.B. neun Wochen am Stück
   * vorzuschreiben. Wochen, die schon echte Dienste enthalten, werden nicht
   * angetastet, um nichts versehentlich zu überschreiben.
   */
  async function vorausplanen() {
    const vorlage = (alleDienste ?? []).filter((d) => d.istVorlage)
    if (vorlage.length === 0) {
      setVorausplanenMeldung('Noch kein Rahmenplan angelegt – bitte zuerst mindestens eine Person einrichten.')
      return
    }
    setWirdVorausgeplant(true)
    setVorausplanenMeldung(null)
    try {
      const startMontag = wocheninfo(isoHeute()).montag
      let angelegt = 0
      let uebersprungen = 0
      for (let i = 0; i < anzahlWochen; i++) {
        const zielWoche = wocheninfo(addTage(startMontag, i * 7))
        const aktuelleDienste = await db.dienste.toArray()
        const vorhandene = aktuelleDienste.filter((d) => !d.istVorlage && zielWoche.alleTage.includes(d.datum))
        if (vorhandene.length > 0) {
          uebersprungen++
          continue
        }
        const { neueDienste } = baueUebernahme(zielWoche, vorlage, false, aktuelleDienste)
        if (neueDienste.length > 0) {
          await db.dienste.bulkAdd(neueDienste)
          angelegt++
        }
      }
      ausloesen()
      const teile = [`${angelegt} von ${anzahlWochen} Woche(n) für alle Personen angelegt`]
      if (uebersprungen > 0) teile.push(`${uebersprungen} bereits belegte Woche(n) übersprungen`)
      setVorausplanenMeldung(teile.join(' · ') + '.')
    } finally {
      setWirdVorausgeplant(false)
    }
  }

  return (
    <div className="view">
      <div className="formular-kopf">
        <h1 style={{ margin: 0 }}>Rahmenplan</h1>
        <SpeicherAnzeige sichtbar={sichtbar} />
      </div>
      <p className="view-untertitel">
        Der feste Wochenplan pro Person – Montag bis Freitag, jeweils Gruppe und Uhrzeit. Das ist die Basis für jede
        neue Woche: sobald eine Woche im Wochenplan noch leer ist, wird der Rahmenplan automatisch übernommen.
        Urlaub, Krankheit oder ein Tausch werden weiterhin nur für die jeweilige Woche im Wochenplan selbst
        eingetragen – der Rahmenplan hier bleibt davon unberührt. Für jede Person im Team steht eine eigene,
        aufklappbare Karte bereit.
      </p>

      <div className="vorlagen-leiste" style={{ flexWrap: 'wrap' }}>
        <strong>Im Voraus anlegen:</strong>
        <span>Rahmenplan für die nächsten</span>
        <input
          type="number"
          min={1}
          max={52}
          value={anzahlWochen}
          onChange={(e) => setAnzahlWochen(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
          style={{ width: 64 }}
        />
        <span>Wochen für alle Personen in den Wochenplan schreiben</span>
        <button className="primaer" disabled={wirdVorausgeplant} onClick={vorausplanen}>
          {wirdVorausgeplant ? 'Wird angelegt …' : 'Jetzt anlegen'}
        </button>
      </div>
      {vorausplanenMeldung && (
        <p className="hinweis-klein" style={{ marginTop: -8, marginBottom: 16 }}>
          {vorausplanenMeldung}
        </p>
      )}

      <div className="kopfleiste">
        <button
          type="button"
          className={ansicht === 'uebersicht' ? 'primaer' : ''}
          onClick={() => setAnsicht('uebersicht')}
        >
          Gesamtübersicht
        </button>
        <button
          type="button"
          className={ansicht === 'bearbeiten' ? 'primaer' : ''}
          onClick={() => setAnsicht('bearbeiten')}
        >
          Einzeln bearbeiten
        </button>
        <div className="spacer" />
        {ansicht === 'bearbeiten' && (
          <>
            <label style={{ maxWidth: 280, marginBottom: 0 }}>
              Suche
              <input
                type="text"
                placeholder="Name oder Kürzel …"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
              />
            </label>
            <button type="button" onClick={alleAufklappen}>
              Alle aufklappen
            </button>
            <button type="button" onClick={alleZuklappen}>
              Alle zuklappen
            </button>
          </>
        )}
      </div>

      {ansicht === 'uebersicht' && (
        <div className="uebersicht-scroll">
          {aktiveMitarbeiter.length === 0 ? (
            <div className="leerhinweis">Noch keine aktiven Mitarbeitenden angelegt.</div>
          ) : (
            <table className="uebersicht-tabelle">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Person</th>
                  {WOCHENTAGE.map(({ wd, label }) => (
                    <th key={wd}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktiveMitarbeiter.map((m) => {
                  const vorlage = vorlageVon(m.id!)
                  return (
                    <tr key={m.id}>
                      <td>
                        <button type="button" className="linkbutton" onClick={() => zuPersonSpringen(m.id!)}>
                          <strong>{m.name}</strong>
                        </button>
                        <div className="hinweis-klein">{m.kuerzel}</div>
                      </td>
                      {WOCHENTAGE.map(({ wd }) => {
                        const datum = vorlageDatumFuerWochentag(wd)
                        const zeile = vorlage.find((d) => d.datum === datum)
                        const gruppe = zeile?.gruppenSlot != null ? gruppeNachSlot.get(zeile.gruppenSlot) : undefined
                        return (
                          <td key={wd}>
                            {!zeile ? (
                              <span className="hinweis-klein">frei</span>
                            ) : (
                              <div className="uebersicht-eintrag">
                                <span className="mono">{gruppe?.name ?? '?'}</span>
                                <div className="hinweis-klein">
                                  {formatZeit(zeile.beginn1Minuten)}–{formatZeit(zeile.ende1Minuten)}
                                </div>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {ansicht === 'bearbeiten' && gefiltert.length === 0 && (
        <div className="leerhinweis">Keine passende Person gefunden.</div>
      )}

      {ansicht === 'bearbeiten' &&
        gefiltert.map((m) => {
        const vorlage = vorlageVon(m.id!)
        const offen = ausgeklappt.has(m.id!)
        const geplanteTage = vorlage.length
        return (
          <div key={m.id} id={`rahmenplan-person-${m.id}`} className="karte">
            <button
              type="button"
              className="rahmenplan-personkopf"
              onClick={() => toggle(m.id!)}
              aria-expanded={offen}
            >
              <span className="rahmenplan-personkopf-titel">
                <strong>{m.name}</strong>
                <span className="hinweis-klein"> ({m.kuerzel})</span>
              </span>
              <span className="badge">
                {geplanteTage === 0 ? 'noch kein Rahmenplan' : `${geplanteTage} von 5 Tagen geplant`}
              </span>
              <span className="rahmenplan-klapppfeil">{offen ? '▾' : '▸'}</span>
            </button>

            {offen && (
              <table className="tabelle" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Wochentag</th>
                    <th style={{ width: 200 }}>Gruppe</th>
                    <th style={{ width: 110 }}>Beginn</th>
                    <th style={{ width: 110 }}>Ende</th>
                    <th style={{ width: 90 }}>Pause</th>
                    <th style={{ width: 80 }}>Netto</th>
                    <th>Schnellauswahl</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {WOCHENTAGE.map(({ wd, label }) => {
                    const datum = vorlageDatumFuerWochentag(wd)
                    const zeile = vorlage.find((d) => d.datum === datum)
                    const frei = !zeile
                    return (
                      <tr key={wd}>
                        <td>
                          <strong>{label}</strong>
                        </td>
                        <td>
                          <select
                            value={zeile?.gruppenSlot ?? ''}
                            onChange={(e) =>
                              e.target.value === ''
                                ? freiSetzen(m.id!, wd)
                                : zeileAendern(m.id!, wd, 'gruppenSlot', Number(e.target.value))
                            }
                          >
                            <option value="">– frei –</option>
                            {aktiveGruppen.map((g) => (
                              <option key={g.slot} value={g.slot}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            disabled={frei}
                            value={formatZeit(zeile?.beginn1Minuten)}
                            onChange={(e) => zeileAendern(m.id!, wd, 'beginn1Minuten', parseZeit(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            disabled={frei}
                            value={formatZeit(zeile?.ende1Minuten)}
                            onChange={(e) => zeileAendern(m.id!, wd, 'ende1Minuten', parseZeit(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step={0.25}
                            min={0}
                            disabled={frei}
                            value={zeile?.pauseStunden ?? 0}
                            onChange={(e) => zeileAendern(m.id!, wd, 'pauseStunden', Number(e.target.value))}
                            style={{ width: 70 }}
                          />
                        </td>
                        <td className="zahl">{zeile ? stundenText(dienstNetto(zeile)) : ''}</td>
                        <td>
                          <div className="dienstarten-knopfreihe">
                            {(alleDienstarten ?? []).map((da) => (
                              <button key={da.id} type="button" onClick={() => dienstartAnwenden(m.id!, wd, da)}>
                                {da.bezeichnung}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          {!frei && (
                            <button
                              className="iconbutton"
                              title="Auf frei setzen"
                              onClick={() => freiSetzen(m.id!, wd)}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}
