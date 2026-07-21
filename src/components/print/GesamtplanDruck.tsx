import type { Dienst, Gruppe, Mitarbeiter } from '../../types'
import { formatDatum, formatZeit, stundenText, wochentagKurz } from '../../lib/calendar'
import { dienstNetto } from '../../lib/dienst'
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
                <div className="hinweis-klein">
                  {g.typ} · min. {g.mindestbesetzung}
                </div>
              </td>
              {woche.werktage.map((tag) => {
                const tagesDienste = dienste
                  .filter((d) => d.gruppenSlot === g.slot && d.datum === tag)
                  .sort((a, b) => a.beginn1Minuten - b.beginn1Minuten)
                return (
                  <td key={tag}>
                    {tagesDienste.length === 0 && <span className="hinweis-klein">–</span>}
                    {tagesDienste.map((d) => {
                      const person = d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId) : undefined
                      return (
                        <div key={d.id} style={{ marginBottom: 6 }}>
                          <strong>{person?.name ?? 'Unbesetzt'}</strong>
                          <div className="hinweis-klein">
                            {formatZeit(d.beginn1Minuten)}–{formatZeit(d.ende1Minuten)}
                            {d.beginn2Minuten != null && d.ende2Minuten != null && (
                              <> · {formatZeit(d.beginn2Minuten)}–{formatZeit(d.ende2Minuten)}</>
                            )}
                            {' · '}
                            {stundenText(dienstNetto(d))}
                          </div>
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
      <p className="druck-fusszeile">Erstellt am {new Date().toLocaleDateString('de-DE')} mit Kitaplan Birke.</p>
    </div>
  )
}
