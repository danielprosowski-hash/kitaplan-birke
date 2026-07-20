import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Abwesenheit, Dienst, Feiertag, IstZeit, Mitarbeiter } from '../types'
import { formatDatum, isoHeute, stundenText } from '../lib/calendar'
import { berechneTage, summen as berechneSummen } from '../lib/abrechnung'
import { istAktiv } from '../lib/dienst'
import { useDruck } from './DruckContext'
import AbrechnungDruck from './print/AbrechnungDruck'
import AuswertungDruck, { type AuswertungsZeile } from './print/AuswertungDruck'

function jahresanfang(): string {
  return isoHeute().slice(0, 4) + '-01-01'
}
function jahresende(): string {
  return isoHeute().slice(0, 4) + '-12-31'
}

export default function AbrechnungView() {
  const { oeffneDruck } = useDruck()
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [] as Mitarbeiter[])
  const alleFeiertage = useLiveQuery(() => db.feiertage.toArray(), [], [] as Feiertag[])
  const alleDienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const alleAbwesenheiten = useLiveQuery(() => db.abwesenheiten.toArray(), [], [] as Abwesenheit[])
  const alleIstZeiten = useLiveQuery(() => db.istZeiten.toArray(), [], [] as IstZeit[])

  const [personId, setPersonId] = useState<number | ''>('')
  const [von, setVon] = useState(jahresanfang())
  const [bis, setBis] = useState(jahresende())

  const person = alleMitarbeiter?.find((m) => m.id === personId)

  const tage = useMemo(() => {
    if (!person) return []
    return berechneTage(person, von, bis, alleFeiertage ?? [], alleDienste ?? [], alleAbwesenheiten ?? [], alleIstZeiten ?? [])
  }, [person, von, bis, alleFeiertage, alleDienste, alleAbwesenheiten, alleIstZeiten])

  const summen = useMemo(() => berechneSummen(tage), [tage])

  function pdfPerson() {
    if (!person) return
    oeffneDruck(<AbrechnungDruck person={person} tage={tage} von={von} bis={bis} summen={summen} />, `Abrechnung – ${person.name}`, false)
  }

  function pdfAuswertung() {
    const zeilen: AuswertungsZeile[] = (alleMitarbeiter ?? [])
      .filter((m) => istAktiv(m))
      .map((m) => {
        const t = berechneTage(m, von, bis, alleFeiertage ?? [], alleDienste ?? [], alleAbwesenheiten ?? [], alleIstZeiten ?? [])
        const s = berechneSummen(t)
        return { kuerzel: m.kuerzel, name: m.name, funktion: m.funktion, wochenstunden: m.wochenstunden, soll: s.soll, ist: s.ist }
      })
    oeffneDruck(<AuswertungDruck zeilen={zeilen} von={von} bis={bis} />, 'Auswertung gesamt', false)
  }

  return (
    <div className="view">
      <div className="kopfleiste">
        <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))} style={{ maxWidth: 300 }}>
          <option value="">– Person wählen –</option>
          {alleMitarbeiter?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.kuerzel} – {m.name}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <label>
          Von <input type="date" value={von} onChange={(e) => setVon(e.target.value)} />
        </label>
        <label>
          Bis <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} />
        </label>
        {person && <button onClick={pdfPerson}>PDF</button>}
        <button onClick={pdfAuswertung}>Auswertung</button>
      </div>

      {!person ? (
        <div className="leerhinweis">Bitte eine Person wählen.</div>
      ) : (
        <>
          <div className="abrechnung-kennzahlen">
            <div>
              <span className="hinweis-klein">Tages-Soll</span>
              <strong>{stundenText(person.wochenstunden / 5)}</strong>
            </div>
            <div>
              <span className="hinweis-klein">Soll gesamt</span>
              <strong>{stundenText(summen.soll)}</strong>
            </div>
            <div>
              <span className="hinweis-klein">Ist gesamt</span>
              <strong>{stundenText(summen.ist)}</strong>
            </div>
            <div>
              <span className="hinweis-klein">Saldo</span>
              <strong className={summen.saldo >= 0 ? 'erfolg-text' : 'fehler-text'}>
                {summen.saldo >= 0 ? '+' : ''}
                {stundenText(summen.saldo)}
              </strong>
            </div>
          </div>

          <table className="tabelle">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Datum</th>
                <th style={{ width: 50 }}>Tag</th>
                <th style={{ width: 70 }}>Soll</th>
                <th style={{ width: 70 }}>Ist</th>
                <th style={{ width: 80 }}>Saldo</th>
                <th>Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {tage.map((t) => (
                <tr key={t.datum}>
                  <td className="mono">{formatDatum(t.datum)}</td>
                  <td>{t.wochentagKurz}</td>
                  <td className="zahl hinweis-klein">{t.soll > 0 ? stundenText(t.soll) : ''}</td>
                  <td className="zahl" style={{ fontWeight: 600 }}>
                    {t.ist > 0 ? stundenText(t.ist) : ''}
                  </td>
                  <td className={`zahl ${t.saldo > 0 ? 'erfolg-text' : t.saldo < 0 ? 'fehler-text' : ''}`}>
                    {t.soll > 0 || t.ist > 0 ? `${t.saldo >= 0 ? '+' : ''}${stundenText(t.saldo)}` : ''}
                  </td>
                  <td className={t.istFeiertag ? 'feiertag-text' : 'hinweis-klein'}>{t.bemerkung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
