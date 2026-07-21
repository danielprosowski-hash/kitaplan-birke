import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Dienst, Dienstart, Gruppe, Mitarbeiter } from '../types'
import { formatZeit, parseZeit, stundenText } from '../lib/calendar'
import { dienstNetto, istAktiv } from '../lib/dienst'
import { vorlageDatumFuerWochentag } from '../lib/wochenvorlage'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

const WOCHENTAGE: { wd: number; label: string }[] = [
  { wd: 2, label: 'Montag' },
  { wd: 3, label: 'Dienstag' },
  { wd: 4, label: 'Mittwoch' },
  { wd: 5, label: 'Donnerstag' },
  { wd: 6, label: 'Freitag' },
]

export default function RahmenplanView() {
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [] as Mitarbeiter[])
  const alleGruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [] as Gruppe[])
  const alleDienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const alleDienstarten = useLiveQuery(() => db.dienstarten.orderBy('reihenfolge').toArray(), [], [] as Dienstart[])
  const { sichtbar, ausloesen } = useSpeicherFeedback()

  const [personId, setPersonId] = useState<number | ''>('')

  const aktiveMitarbeiter = (alleMitarbeiter ?? []).filter((m) => istAktiv(m))
  const aktiveGruppen = (alleGruppen ?? []).filter((g) => g.aktiv)
  const person = aktiveMitarbeiter.find((m) => m.id === personId)
  const vorlageDesPersons = (alleDienste ?? []).filter((d) => d.istVorlage && d.mitarbeiterId === personId)

  async function zeileAendern(
    wd: number,
    feld: 'gruppenSlot' | 'beginn1Minuten' | 'ende1Minuten' | 'pauseStunden',
    wert: number | null,
  ) {
    if (personId === '') return
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageDesPersons.find((d) => d.datum === datum)
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

  async function dienstartAnwenden(wd: number, da: Dienstart) {
    if (personId === '') return
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageDesPersons.find((d) => d.datum === datum)
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

  async function freiSetzen(wd: number) {
    const datum = vorlageDatumFuerWochentag(wd)
    const bestehend = vorlageDesPersons.find((d) => d.datum === datum)
    if (bestehend?.id != null) {
      await db.dienste.delete(bestehend.id)
      ausloesen()
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
        eingetragen – der Rahmenplan hier bleibt davon unberührt.
      </p>

      <div className="karte">
        <label style={{ maxWidth: 320, marginBottom: 0 }}>
          Person
          <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">– wählen –</option>
            {aktiveMitarbeiter.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kuerzel} – {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!person ? (
        <div className="leerhinweis">Bitte eine Person wählen, um ihren Rahmenplan zu pflegen.</div>
      ) : (
        <table className="tabelle">
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
              const zeile = vorlageDesPersons.find((d) => d.datum === datum)
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
                        e.target.value === '' ? freiSetzen(wd) : zeileAendern(wd, 'gruppenSlot', Number(e.target.value))
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
                      onChange={(e) => zeileAendern(wd, 'beginn1Minuten', parseZeit(e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      disabled={frei}
                      value={formatZeit(zeile?.ende1Minuten)}
                      onChange={(e) => zeileAendern(wd, 'ende1Minuten', parseZeit(e.target.value))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step={0.25}
                      min={0}
                      disabled={frei}
                      value={zeile?.pauseStunden ?? 0}
                      onChange={(e) => zeileAendern(wd, 'pauseStunden', Number(e.target.value))}
                      style={{ width: 70 }}
                    />
                  </td>
                  <td className="zahl">{zeile ? stundenText(dienstNetto(zeile)) : ''}</td>
                  <td>
                    <div className="dienstarten-knopfreihe">
                      {(alleDienstarten ?? []).map((da) => (
                        <button key={da.id} type="button" onClick={() => dienstartAnwenden(wd, da)}>
                          {da.bezeichnung}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    {!frei && (
                      <button className="iconbutton" title="Auf frei setzen" onClick={() => freiSetzen(wd)}>
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
}
