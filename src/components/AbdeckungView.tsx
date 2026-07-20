import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Dienst, Mitarbeiter, Randdienst } from '../types'
import { addTage, formatDatum, isoHeute, wochentagKurz, wocheninfo } from '../lib/calendar'
import { pruefeAbdeckung } from '../lib/abdeckung'

export default function AbdeckungView() {
  const randdienste = useLiveQuery(() => db.randdienste.orderBy('reihenfolge').toArray(), [], [] as Randdienst[])
  const dienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const mitarbeitende = useLiveQuery(() => db.mitarbeiter.toArray(), [], [] as Mitarbeiter[])
  const [referenzdatum, setReferenzdatum] = useState(isoHeute())

  const woche = useMemo(() => wocheninfo(referenzdatum), [referenzdatum])
  const aktiv = (randdienste ?? []).filter((r) => r.aktiv)
  const echteDienste = (dienste ?? []).filter((d) => !d.istVorlage)
  const mitarbeiterNachId = new Map((mitarbeitende ?? []).map((m) => [m.id!, m]))

  const belegung = useMemo(
    () => pruefeAbdeckung(aktiv, echteDienste, woche.werktage, mitarbeiterNachId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [randdienste, dienste, woche, mitarbeitende],
  )

  const alleZellen = Array.from(belegung.values()).flat()
  const unbesetzte = alleZellen.filter((z) => z.besetztVon.length === 0)

  return (
    <div className="view">
      <div className="kopfleiste">
        <h1 style={{ margin: 0 }}>Abdeckung Randdienste</h1>
        <span className="spacer" />
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, -7))}>‹</button>
        <span className="wochen-label">{woche.bezeichnung}</span>
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, 7))}>›</button>
        <button onClick={() => setReferenzdatum(isoHeute())}>Heute</button>
      </div>

      {aktiv.length === 0 ? (
        <div className="leerhinweis">Keine Randdienste definiert.</div>
      ) : (
        <>
          <table className="abdeckung-tabelle">
            <thead>
              <tr>
                <th>Tag</th>
                {aktiv.map((rd) => (
                  <th key={rd.id}>
                    <div>{formatZeitKurz(rd.beginnMinuten)}</div>
                    <div className="hinweis-klein">{rd.bezeichnung}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {woche.werktage.map((tag) => {
                const zellen = belegung.get(tag) ?? []
                const alleBesetzt = zellen.every((z) => z.besetztVon.length > 0)
                return (
                  <tr key={tag} className={alleBesetzt ? 'zeile-ok' : 'zeile-fehlt'}>
                    <td>
                      <strong>{wochentagKurz(tag)}</strong>
                      <div className="hinweis-klein">{formatDatum(tag)}</div>
                    </td>
                    {aktiv.map((rd) => {
                      const zelle = zellen.find((z) => z.randdienst.beginnMinuten === rd.beginnMinuten)
                      const besetzt = zelle && zelle.besetztVon.length > 0
                      return (
                        <td key={rd.id}>
                          {besetzt ? (
                            zelle!.besetztVon.map((k) => (
                              <span className="badge-ok" key={k}>
                                {k}
                              </span>
                            ))
                          ) : (
                            <span className="badge-fehlt">frei</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {unbesetzte.length === 0 ? (
            <p className="erfolg-text" style={{ marginTop: 16 }}>
              ✓ Alle Randdienste in dieser Woche besetzt.
            </p>
          ) : (
            <div className="hinweisliste" style={{ marginTop: 16 }}>
              <strong>{unbesetzte.length} unbesetzte Randdienst-Slot(s):</strong>
              {unbesetzte.map((z, i) => (
                <div key={i} className="hinweiszeile warnung">
                  {wochentagKurz(z.datum)} {formatDatum(z.datum)} – {formatZeitKurz(z.randdienst.beginnMinuten)}{' '}
                  {z.randdienst.bezeichnung}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatZeitKurz(minuten: number): string {
  const h = Math.floor(minuten / 60)
  const m = minuten % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
