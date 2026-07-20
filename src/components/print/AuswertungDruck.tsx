import { formatDatum, stundenText } from '../../lib/calendar'

export interface AuswertungsZeile {
  kuerzel: string
  name: string
  funktion: string
  wochenstunden: number
  soll: number
  ist: number
}

export default function AuswertungDruck({
  zeilen,
  von,
  bis,
}: {
  zeilen: AuswertungsZeile[]
  von: string
  bis: string
}) {
  return (
    <div className="druck-seite">
      <h1>Auswertung gesamt</h1>
      <p className="hinweis-klein">
        Zeitraum {formatDatum(von)} – {formatDatum(bis)}
      </p>
      <table className="druck-tabelle">
        <thead>
          <tr>
            <th>Kürzel</th>
            <th>Name</th>
            <th>Funktion</th>
            <th>Wochenstunden</th>
            <th>Soll</th>
            <th>Ist</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.kuerzel}>
              <td>{z.kuerzel}</td>
              <td>{z.name}</td>
              <td>{z.funktion}</td>
              <td>{z.wochenstunden}</td>
              <td>{stundenText(z.soll)}</td>
              <td>{stundenText(z.ist)}</td>
              <td>
                {z.ist - z.soll >= 0 ? '+' : ''}
                {stundenText(z.ist - z.soll)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
