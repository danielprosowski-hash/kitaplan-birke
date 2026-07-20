import type { Mitarbeiter } from '../../types'
import { formatDatum, stundenText } from '../../lib/calendar'
import type { AbrechnungsTag } from '../../lib/abrechnung'

export default function AbrechnungDruck({
  person,
  tage,
  von,
  bis,
  summen,
}: {
  person: Mitarbeiter
  tage: AbrechnungsTag[]
  von: string
  bis: string
  summen: { soll: number; ist: number; saldo: number }
}) {
  return (
    <div className="druck-seite">
      <h1>
        Monatsabrechnung – {person.name} ({person.kuerzel})
      </h1>
      <p className="hinweis-klein">
        Zeitraum {formatDatum(von)} – {formatDatum(bis)} · Wochenstunden {person.wochenstunden}
      </p>
      <table className="druck-tabelle">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Tag</th>
            <th>Soll</th>
            <th>Ist</th>
            <th>Saldo</th>
            <th>Bemerkung</th>
          </tr>
        </thead>
        <tbody>
          {tage.map((t) => (
            <tr key={t.datum}>
              <td>{formatDatum(t.datum)}</td>
              <td>{t.wochentagKurz}</td>
              <td>{t.soll > 0 ? stundenText(t.soll) : ''}</td>
              <td>{t.ist > 0 ? stundenText(t.ist) : ''}</td>
              <td>
                {t.soll > 0 || t.ist > 0 ? `${t.saldo >= 0 ? '+' : ''}${stundenText(t.saldo)}` : ''}
              </td>
              <td>{t.bemerkung}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <strong>Summe</strong>
            </td>
            <td>
              <strong>{stundenText(summen.soll)}</strong>
            </td>
            <td>
              <strong>{stundenText(summen.ist)}</strong>
            </td>
            <td>
              <strong>
                {summen.saldo >= 0 ? '+' : ''}
                {stundenText(summen.saldo)}
              </strong>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
