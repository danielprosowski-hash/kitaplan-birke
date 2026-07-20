import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ABWESENHEITSARTEN, abwesenheitsartInfo, type Abwesenheitsart } from '../types'
import { addTage, formatDatum, isoHeute, istWochenende } from '../lib/calendar'

export default function AbwesenheitenView() {
  const abwesenheiten = useLiveQuery(
    () => db.abwesenheiten.orderBy('datum').reverse().toArray(),
    [],
    [],
  )
  const mitarbeitende = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [])

  const [von, setVon] = useState(isoHeute())
  const [bis, setBis] = useState(isoHeute())
  const [personId, setPersonId] = useState<number | ''>('')
  const [art, setArt] = useState<Abwesenheitsart>('U')
  const [bemerkung, setBemerkung] = useState('')
  const [filterPerson, setFilterPerson] = useState<number | ''>('')
  const [filterArt, setFilterArt] = useState<Abwesenheitsart | ''>('')

  const gefiltert = (abwesenheiten ?? []).filter(
    (a) => (filterPerson === '' || a.mitarbeiterId === filterPerson) && (filterArt === '' || a.art === filterArt),
  )
  const nameVon = (id: number) => mitarbeitende?.find((m) => m.id === id)

  async function hinzufuegen() {
    if (personId === '' || bis < von) return
    let tag = von
    const eintraege: { datum: string; art: Abwesenheitsart; bemerkung: string; mitarbeiterId: number }[] = []
    while (tag <= bis) {
      if (!istWochenende(tag)) {
        eintraege.push({ datum: tag, art, bemerkung, mitarbeiterId: personId })
      }
      tag = addTage(tag, 1)
    }
    await db.abwesenheiten.bulkAdd(eintraege)
    setBemerkung('')
  }

  return (
    <div className="view">
      <h1>Abwesenheiten</h1>

      <div className="karte">
        <h3>Neue Abwesenheit</h3>
        <div className="formular-zeile">
          <label>
            Person
            <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">– wählen –</option>
              {mitarbeitende?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.kuerzel} – {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Art
            <select value={art} onChange={(e) => setArt(e.target.value as Abwesenheitsart)}>
              {ABWESENHEITSARTEN.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} – {a.bezeichnung}
                </option>
              ))}
            </select>
          </label>
          <label>
            Von
            <input type="date" value={von} onChange={(e) => setVon(e.target.value)} />
          </label>
          <label>
            Bis
            <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} />
          </label>
          <label>
            Bemerkung
            <input type="text" placeholder="optional" value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} />
          </label>
          <button className="primaer" disabled={personId === '' || bis < von} onClick={hinzufuegen}>
            Hinzufügen
          </button>
        </div>
        <p className="hinweis-klein">Wochenenden werden beim Anlegen automatisch übersprungen.</p>
      </div>

      <div className="formular-zeile" style={{ margin: '12px 0' }}>
        <label>
          Filter Person
          <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Alle Personen</option>
            {mitarbeitende?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kuerzel} – {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter Art
          <select value={filterArt} onChange={(e) => setFilterArt(e.target.value as Abwesenheitsart | '')}>
            <option value="">Alle Arten</option>
            {ABWESENHEITSARTEN.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} – {a.bezeichnung}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <span className="hinweis-klein">{gefiltert.length} Einträge</span>
      </div>

      <table className="tabelle">
        <thead>
          <tr>
            <th style={{ width: 110 }}>Datum</th>
            <th style={{ width: 80 }}>Kürzel</th>
            <th>Person</th>
            <th style={{ width: 200 }}>Art</th>
            <th style={{ width: 110 }}>Grundlage</th>
            <th>Bemerkung</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {gefiltert.map((a) => {
            const info = abwesenheitsartInfo(a.art)
            const person = nameVon(a.mitarbeiterId)
            return (
              <tr key={a.id}>
                <td className="mono">{formatDatum(a.datum)}</td>
                <td className="mono">{person?.kuerzel ?? '–'}</td>
                <td>{person?.name ?? '–'}</td>
                <td>
                  {info.code} – {info.bezeichnung}
                </td>
                <td className="hinweis-klein">{info.grundlage}</td>
                <td>{a.bemerkung}</td>
                <td>
                  <button className="iconbutton" onClick={() => db.abwesenheiten.delete(a.id!)}>
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
