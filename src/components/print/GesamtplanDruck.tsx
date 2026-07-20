import type { Dienst, Gruppe, Mitarbeiter } from '../../types'
import { formatDatum, formatZeit, wochentagKurz } from '../../lib/calendar'
import type { Wocheninfo } from '../../lib/calendar'

export default function GesamtplanDruck({
  woche,
  gruppen,
  dienste,
  mitarbeiterNachId,
}: {
  woche: Wocheninfo
  gruppen: Gruppe[]
  dienste: Dienst[]
  mitarbeiterNachId: Map<number, Mitarbeiter>
}) {
  return (
    <div className="druck-seite">
      <h1>Gesamtplan · {woche.bezeichnung}</h1>
      <table className="druck-tabelle">
        <thead>
          <tr>
            <th>Gruppe</th>
            {woche.werktage.map((tag) => (
              <th key={tag}>
                {wochentagKurz(tag)} {formatDatum(tag).slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gruppen.map((g) => (
            <tr key={g.slot} className={g.typ === 'Krippe' ? 'druck-krippe' : 'druck-kita'}>
              <td>
                <strong>{g.name}</strong>
                <div className="hinweis-klein">{g.typ}</div>
              </td>
              {woche.werktage.map((tag) => {
                const tagesDienste = dienste
                  .filter((d) => d.gruppenSlot === g.slot && d.datum === tag)
                  .sort((a, b) => a.beginn1Minuten - b.beginn1Minuten)
                return (
                  <td key={tag}>
                    {tagesDienste.map((d) => {
                      const person = d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId) : undefined
                      return (
                        <div key={d.id}>
                          {person?.kuerzel ?? '?'} {formatZeit(d.beginn1Minuten)}–{formatZeit(d.ende1Minuten)}
                        </div>
                      )
                    })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
