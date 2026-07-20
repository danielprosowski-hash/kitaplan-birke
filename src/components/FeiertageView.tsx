import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatDatum, isoHeute } from '../lib/calendar'
import { BUNDESLAENDER } from '../lib/feiertage'
import { feiertageFuerJahreSicherstellen } from '../db/seed'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

export default function FeiertageView() {
  const feiertage = useLiveQuery(() => db.feiertage.orderBy('datum').toArray(), [], [])
  const einstellung = useLiveQuery(() => db.einstellungen.toCollection().first(), [], undefined)
  const [neuesDatum, setNeuesDatum] = useState(isoHeute())
  const [neuerName, setNeuerName] = useState('')
  const [ergaenzeJahr, setErgaenzeJahr] = useState(new Date().getFullYear() + 1)
  const [ergaenzenMeldung, setErgaenzenMeldung] = useState<string | null>(null)
  const { sichtbar, ausloesen } = useSpeicherFeedback()

  async function hinzufuegen() {
    if (!neuerName.trim()) return
    await db.feiertage.add({ datum: neuesDatum, name: neuerName.trim(), bundesland: 'bundesweit' })
    setNeuerName('')
    ausloesen()
  }

  async function loeschen(id: number) {
    if (!confirm('Diesen Feiertag löschen?')) return
    await db.feiertage.delete(id)
  }

  async function aendern(id: number, feld: 'name' | 'bundesland', wert: string) {
    await db.feiertage.update(id, { [feld]: wert })
    ausloesen()
  }

  async function bundeslandAendern(code: string) {
    if (einstellung?.id) {
      await db.einstellungen.update(einstellung.id, { bundesland: code })
    } else {
      await db.einstellungen.add({ bundesland: code })
    }
    ausloesen()
  }

  async function jahrErgaenzen() {
    const anzahl = await feiertageFuerJahreSicherstellen([ergaenzeJahr])
    setErgaenzenMeldung(
      anzahl > 0 ? `${anzahl} Feiertag(e) für ${ergaenzeJahr} ergänzt.` : `Für ${ergaenzeJahr} war schon alles vorhanden.`,
    )
  }

  return (
    <div className="view">
      <div className="formular-kopf">
        <h1 style={{ margin: 0 }}>Feiertage</h1>
        <SpeicherAnzeige sichtbar={sichtbar} />
      </div>
      <p className="view-untertitel">
        Feiertage werden automatisch für das laufende und das kommende Jahr berechnet (Ostern-Formel + Bundesland) –
        sie „laufen" also nicht mehr aus. Ergänze bei Bedarf weitere Jahre oder trage individuelle Tage nach.
      </p>

      <div className="karte">
        <h3>Bundesland</h3>
        <p className="hinweis-klein" style={{ marginBottom: 10 }}>
          Steuert, welche zusätzlichen Feiertage (z. B. Reformationstag, Fronleichnam) automatisch berücksichtigt
          werden.
        </p>
        <select
          value={einstellung?.bundesland ?? 'ST'}
          onChange={(e) => bundeslandAendern(e.target.value)}
          style={{ maxWidth: 280 }}
        >
          {BUNDESLAENDER.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="karte">
        <h3>Weiteres Jahr ergänzen</h3>
        <div className="einfuegezeile" style={{ marginTop: 0 }}>
          <input
            type="number"
            value={ergaenzeJahr}
            onChange={(e) => setErgaenzeJahr(Number(e.target.value))}
            style={{ maxWidth: 120 }}
          />
          <button onClick={jahrErgaenzen}>Feiertage für dieses Jahr berechnen</button>
        </div>
        {ergaenzenMeldung && <p className="erfolg-text" style={{ marginTop: 8 }}>{ergaenzenMeldung}</p>}
      </div>

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
          placeholder="Name (z. B. Betriebsausflug)"
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
