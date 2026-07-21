import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Dienst, Gruppe, Mitarbeiter } from '../types'
import { addTage, formatDatum, formatZeit, isoHeute, wochentagKurz, wocheninfo } from '../lib/calendar'
import { useDruck } from './DruckContext'
import GesamtplanDruck from './print/GesamtplanDruck'

export default function WochenuebersichtView() {
  const { oeffneDruck } = useDruck()
  const alleGruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [] as Gruppe[])
  const alleDienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const alleFeiertage = useLiveQuery(() => db.feiertage.toArray(), [], [])
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.toArray(), [], [] as Mitarbeiter[])

  const [referenzdatum, setReferenzdatum] = useState(isoHeute())
  const [zeigeWochenende, setZeigeWochenende] = useState(false)

  const woche = useMemo(() => wocheninfo(referenzdatum), [referenzdatum])
  const aktiveGruppen = (alleGruppen ?? []).filter((g) => g.aktiv)
  const tage = zeigeWochenende ? woche.alleTage : woche.werktage
  const feiertagNachDatum = new Map((alleFeiertage ?? []).map((f) => [f.datum, f]))
  const mitarbeiterNachId = new Map((alleMitarbeiter ?? []).map((m) => [m.id!, m]))

  function drucken() {
    const dienste = (alleDienste ?? []).filter((d) => !d.istVorlage && woche.alleTage.includes(d.datum))
    oeffneDruck(
      <GesamtplanDruck woche={woche} gruppen={aktiveGruppen} dienste={dienste} mitarbeiterNachId={mitarbeiterNachId} />,
      `Wochenübersicht – ${woche.bezeichnung}`,
    )
  }

  return (
    <div className="view">
      <div className="kopfleiste">
        <h1 style={{ margin: 0 }}>Wochenübersicht</h1>
        <span className="spacer" />
        <label className="checkbox-inline">
          <input type="checkbox" checked={zeigeWochenende} onChange={(e) => setZeigeWochenende(e.target.checked)} />
          Wochenende
        </label>
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, -7))}>‹</button>
        <span className="wochen-label">{woche.bezeichnung}</span>
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, 7))}>›</button>
        <button onClick={() => setReferenzdatum(isoHeute())}>Heute</button>
        <button disabled={aktiveGruppen.length === 0} onClick={drucken}>
          PDF Wochenübersicht
        </button>
      </div>

      {aktiveGruppen.length === 0 ? (
        <div className="leerhinweis">Aktiviere unter „Gruppen" mindestens eine Gruppe.</div>
      ) : (
        <div className="uebersicht-scroll">
          <table className="uebersicht-tabelle">
            <thead>
              <tr>
                <th>Gruppe</th>
                {tage.map((tag) => (
                  <th key={tag} className={feiertagNachDatum.get(tag) ? 'feiertag-spalte' : ''}>
                    {wochentagKurz(tag)} {formatDatum(tag).slice(0, 5)}
                    {feiertagNachDatum.get(tag) && <div className="hinweis-klein">{feiertagNachDatum.get(tag)!.name}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aktiveGruppen.map((g) => (
                <tr key={g.slot}>
                  <td className={g.typ === 'Krippe' ? 'gruppen-label krippe' : 'gruppen-label kita'}>
                    <strong>{g.name}</strong>
                    <div className="hinweis-klein">
                      {g.typ} · min. {g.mindestbesetzung}
                    </div>
                  </td>
                  {tage.map((tag) => {
                    const feiertag = feiertagNachDatum.get(tag)
                    const tagesDienste = (alleDienste ?? [])
                      .filter((d) => !d.istVorlage && d.gruppenSlot === g.slot && d.datum === tag)
                      .sort((a, b) => a.beginn1Minuten - b.beginn1Minuten)
                    return (
                      <td key={tag} className={g.typ === 'Krippe' ? 'zelle krippe' : 'zelle kita'}>
                        {feiertag ? (
                          <span className="hinweis-klein feiertag-text">{feiertag.name}</span>
                        ) : tagesDienste.length === 0 ? (
                          <span className="hinweis-klein">frei</span>
                        ) : (
                          tagesDienste.map((d) => (
                            <div key={d.id} className="uebersicht-eintrag">
                              <span className="mono">{d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId)?.kuerzel ?? '?' : '?'}</span>{' '}
                              <span className="hinweis-klein">
                                {formatZeit(d.beginn1Minuten)}–{formatZeit(d.ende1Minuten)}
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
