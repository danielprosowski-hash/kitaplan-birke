import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatDatum, isoHeute } from '../lib/calendar'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

export default function FeiertageView() {
  const feiertage = useLiveQuery(() => db.feiertage.orderBy('datum').toArray(), [], [])
  const [neuesDatum, setNeuesDatum] = useState(isoHeute())
  const [neuerName, setNeuerName] = useState('')
  const { sichtbar, ausloesen } = useSpeicherFeedback()

  async function hinzufuegen() {
    if (!neuerName.trim()) return
    await db.feiertage.add({ datum: neuesDatum, name: neuerName.trim(), bundesland: 'bundesweit' })
    setNeuerName('')
    ausloesen()
  }

  async function loeschen(id: number) {
    await db.feiertage.delete(id)
  }

  async function aendern(id: number, feld: 'name' | 'bundesland', wert: string) {
    await db.feiertage.update(id, { [feld]: wert })
    ausloesen()
  }

  return (
    <div className="view">
      <div className="formular-kopf">
        <h1 style={{ margin: 0 }}>Feiertage</h1>
        <SpeicherAnzeige sichtbar={sichtbar} />
      </div>
      <p className="view-untertitel">
        Bundesweite Feiertage 2026 sind vorbefüllt. Ergänze bei Bedarf bundeslandspezifische Tage.
      </p>
      <table className="tabelle">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Datum</th>
            <th>Name</th>
            <th style={{ width: 180 }}>Bundesland</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {feiertage?.map((f) => (
            <tr key={f.id}>
              <td className="mono">{formatDatum(f.datum)}</td>
              <td>
                <input type="text" value={f.name} onChange={(e) => aendern(f.id!, 'name', e.target.value)} />
              </td>
              <td>
                <input
                  type="text"
                  value={f.bundesland}
                  onChange={(e) => aendern(f.id!, 'bundesland', e.target.value)}
                />
              </td>
              <td>
                <button className="iconbutton" onClick={() => loeschen(f.id!)} title="Löschen">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="einfuegezeile">
        <input type="date" value={neuesDatum} onChange={(e) => setNeuesDatum(e.target.value)} />
        <input
          type="text"
          placeholder="Name (z. B. Reformationstag)"
          value={neuerName}
          onChange={(e) => setNeuerName(e.target.value)}
        />
        <button onClick={hinzufuegen} disabled={!neuerName.trim()}>
          Hinzufügen
        </button>
      </div>
    </div>
  )
}
