import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatZeit, parseZeit } from '../lib/calendar'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

export default function DienstartenView() {
  const dienstarten = useLiveQuery(() => db.dienstarten.orderBy('reihenfolge').toArray(), [], [])
  const { sichtbar, ausloesen } = useSpeicherFeedback()
  const [neueBezeichnung, setNeueBezeichnung] = useState('')
  const [neuBeginn, setNeuBeginn] = useState('08:00')
  const [neuEnde, setNeuEnde] = useState('15:00')
  const [neuPause, setNeuPause] = useState(0.5)

  async function feldAendern(id: number, feld: 'bezeichnung' | 'pauseStunden', wert: string | number) {
    await db.dienstarten.update(id, { [feld]: wert })
    ausloesen()
  }

  async function zeitAendern(id: number, feld: 'beginn1Minuten' | 'ende1Minuten', zeit: string) {
    const minuten = parseZeit(zeit)
    if (minuten == null) return
    await db.dienstarten.update(id, { [feld]: minuten })
    ausloesen()
  }

  async function loeschen(id: number) {
    if (!confirm('Diese Dienstart löschen? Bereits angelegte Dienste bleiben unverändert.')) return
    await db.dienstarten.delete(id)
  }

  async function hinzufuegen() {
    const beginn = parseZeit(neuBeginn)
    const ende = parseZeit(neuEnde)
    if (!neueBezeichnung.trim() || beginn == null || ende == null || ende <= beginn) return
    const reihenfolge = (dienstarten ?? []).length
    await db.dienstarten.add({
      bezeichnung: neueBezeichnung.trim(),
      beginn1Minuten: beginn,
      ende1Minuten: ende,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden: neuPause,
      reihenfolge,
    })
    setNeueBezeichnung('')
    ausloesen()
  }

  return (
    <div className="view">
      <div className="formular-kopf">
        <h1 style={{ margin: 0 }}>Dienstarten</h1>
        <SpeicherAnzeige sichtbar={sichtbar} />
      </div>
      <p className="view-untertitel">
        Wiederkehrende Schichtmuster – erscheinen im Wochenplan als Schnellauswahl-Knöpfe beim Anlegen eines
        Dienstes, damit nicht jedes Mal Uhrzeiten getippt werden müssen. Geteilte Dienste (zwei Zeitblöcke) lassen
        sich weiterhin frei im Wochenplan anlegen.
      </p>
      <table className="tabelle">
        <thead>
          <tr>
            <th>Bezeichnung</th>
            <th style={{ width: 120 }}>Beginn</th>
            <th style={{ width: 120 }}>Ende</th>
            <th style={{ width: 100 }}>Pause (Std.)</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {dienstarten?.map((d) => (
            <tr key={d.id}>
              <td>
                <input
                  type="text"
                  value={d.bezeichnung}
                  onChange={(e) => feldAendern(d.id!, 'bezeichnung', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={formatZeit(d.beginn1Minuten)}
                  onChange={(e) => zeitAendern(d.id!, 'beginn1Minuten', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={formatZeit(d.ende1Minuten)}
                  onChange={(e) => zeitAendern(d.id!, 'ende1Minuten', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  step={0.25}
                  min={0}
                  value={d.pauseStunden}
                  onChange={(e) => feldAendern(d.id!, 'pauseStunden', Number(e.target.value))}
                />
              </td>
              <td>
                <button className="iconbutton" onClick={() => loeschen(d.id!)} title="Löschen">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="einfuegezeile">
        <input
          type="text"
          placeholder="Bezeichnung (z. B. Kurzdienst)"
          value={neueBezeichnung}
          onChange={(e) => setNeueBezeichnung(e.target.value)}
        />
        <input type="time" value={neuBeginn} onChange={(e) => setNeuBeginn(e.target.value)} />
        <input type="time" value={neuEnde} onChange={(e) => setNeuEnde(e.target.value)} />
        <input
          type="number"
          step={0.25}
          min={0}
          value={neuPause}
          onChange={(e) => setNeuPause(Number(e.target.value))}
          style={{ maxWidth: 90 }}
        />
        <button onClick={hinzufuegen} disabled={!neueBezeichnung.trim()}>
          Hinzufügen
        </button>
      </div>
    </div>
  )
}
