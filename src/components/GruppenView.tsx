import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { GRUPPEN_TYPEN, type GruppenTyp } from '../types'

export default function GruppenView() {
  const gruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [])

  async function aendern(id: number, feld: 'name' | 'typ' | 'mindestbesetzung' | 'aktiv', wert: string | number | boolean) {
    await db.gruppen.update(id, { [feld]: wert })
  }

  return (
    <div className="view">
      <h1>Gruppen</h1>
      <p className="view-untertitel">Acht feste Slots. Nur aktive Gruppen erscheinen im Wochenplan.</p>
      <table className="tabelle">
        <thead>
          <tr>
            <th style={{ width: 60 }}>Slot</th>
            <th>Name</th>
            <th style={{ width: 140 }}>Typ</th>
            <th style={{ width: 170 }}>Mindestbesetzung</th>
            <th style={{ width: 70 }}>Aktiv</th>
          </tr>
        </thead>
        <tbody>
          {gruppen?.map((g) => (
            <tr key={g.id}>
              <td className="mono">G{g.slot}</td>
              <td>
                <input
                  type="text"
                  value={g.name}
                  onChange={(e) => aendern(g.id!, 'name', e.target.value)}
                />
              </td>
              <td>
                <select value={g.typ} onChange={(e) => aendern(g.id!, 'typ', e.target.value as GruppenTyp)}>
                  {GRUPPEN_TYPEN.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={g.mindestbesetzung}
                  onChange={(e) => aendern(g.id!, 'mindestbesetzung', Number(e.target.value))}
                  style={{ width: 60 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={g.aktiv}
                  onChange={(e) => aendern(g.id!, 'aktiv', e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
