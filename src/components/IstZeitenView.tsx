import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Abwesenheitsart, IstZeit, Mitarbeiter } from '../types'
import { abwesenheitsartInfo } from '../types'
import { addMonate, formatDatum, formatMonatJahr, formatZeit, isoHeute, istWochenende, monatsTage, parseZeit, stundenText, wochentagKurz } from '../lib/calendar'
import { arbZGPause, istZeitNetto, tagesSoll } from '../lib/dienst'

export default function IstZeitenView() {
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [] as Mitarbeiter[])
  const alleIstZeiten = useLiveQuery(() => db.istZeiten.toArray(), [], [] as IstZeit[])
  const alleFeiertage = useLiveQuery(() => db.feiertage.toArray(), [], [])
  const alleAbwesenheiten = useLiveQuery(() => db.abwesenheiten.toArray(), [], [])

  const [personId, setPersonId] = useState<number | ''>('')
  const [monat, setMonat] = useState(() => isoHeute().slice(0, 8) + '01')

  const person = alleMitarbeiter?.find((m) => m.id === personId)
  const tage = useMemo(() => monatsTage(monat), [monat])
  const feiertagNachDatum = new Map((alleFeiertage ?? []).map((f) => [f.datum, f]))

  const summe = useMemo(() => {
    if (!person) return { ist: 0, soll: 0, diff: 0 }
    const soll = tagesSoll(person)
    let sIst = 0
    let sSoll = 0
    for (const tag of tage) {
      const feiertag = feiertagNachDatum.get(tag)
      if (istWochenende(tag) || feiertag) continue
      sSoll += soll
      const abw = (alleAbwesenheiten ?? []).find((a) => a.mitarbeiterId === person.id && a.datum === tag)
      if (abw) {
        if (abwesenheitsartInfo(abw.art).schreibtSollAlsIstGut) sIst += soll
      } else {
        const iz = (alleIstZeiten ?? []).find((i) => i.mitarbeiterId === person.id && i.datum === tag)
        if (iz) sIst += istZeitNetto(iz)
      }
    }
    return { ist: sIst, soll: sSoll, diff: sIst - sSoll }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, tage, alleAbwesenheiten, alleIstZeiten, alleFeiertage])

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
        <button onClick={() => setMonat(addMonate(monat, -1))}>‹</button>
        <span className="wochen-label">{formatMonatJahr(monat)}</span>
        <button onClick={() => setMonat(addMonate(monat, 1))}>›</button>
        <button onClick={() => setMonat(isoHeute().slice(0, 8) + '01')}>Heute</button>
      </div>

      {!person ? (
        <div className="leerhinweis">Bitte eine Person wählen. Ist-Zeiten werden pro Person erfasst.</div>
      ) : (
        <>
          <table className="tabelle istzeiten-tabelle">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Tag</th>
                <th style={{ width: 110 }}>Von</th>
                <th style={{ width: 110 }}>Bis</th>
                <th style={{ width: 70 }}>Brutto</th>
                <th style={{ width: 70 }}>Pause</th>
                <th style={{ width: 70 }}>Netto</th>
                <th style={{ width: 70 }}>Soll</th>
                <th style={{ width: 80 }}>Diff.</th>
                <th>Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {tage.map((tag) => (
                <IstZeitZeile
                  // Person mit im Key: sonst behält React beim Personenwechsel
                  // die alten Eingabefelder samt fremder Zeiten.
                  key={`${person.id}-${tag}`}
                  tag={tag}
                  person={person}
                  istZeit={(alleIstZeiten ?? []).find((i) => i.mitarbeiterId === person.id && i.datum === tag) ?? null}
                  feiertagName={feiertagNachDatum.get(tag)?.name}
                  abwesenheit={(alleAbwesenheiten ?? []).find((a) => a.mitarbeiterId === person.id && a.datum === tag) ?? null}
                />
              ))}
            </tbody>
          </table>
          <div className="istzeiten-summe">
            <span>Monatssumme</span>
            <div>
              <span>Ist: {stundenText(summe.ist)}</span>
              <span>Soll: {stundenText(summe.soll)}</span>
              <span className={summe.diff >= 0 ? 'erfolg-text' : 'fehler-text'}>
                Differenz: {summe.diff >= 0 ? '+' : ''}
                {stundenText(summe.diff)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function IstZeitZeile({
  tag,
  person,
  istZeit,
  feiertagName,
  abwesenheit,
}: {
  tag: string
  person: Mitarbeiter
  istZeit: IstZeit | null
  feiertagName?: string
  abwesenheit: { art: string } | null
}) {
  const [von, setVon] = useState(formatZeit(istZeit?.vonMinuten))
  const [bis, setBis] = useState(formatZeit(istZeit?.bisMinuten))
  // Wochenende/Feiertag: kein Soll, keine Eingabe möglich. Abwesenheit: auch
  // keine Zeiteingabe, aber Soll bleibt bestehen (siehe unten) – das muss zur
  // Monatssumme und zur Abrechnung passen, sonst zeigen die Ansichten
  // unterschiedliche Stunden für denselben Monat.
  const kalenderOhneSoll = istWochenende(tag) || !!feiertagName
  const gesperrt = kalenderOhneSoll || !!abwesenheit

  const vMin = parseZeit(von)
  const bMin = parseZeit(bis)
  const brutto = vMin != null && bMin != null && bMin > vMin ? (bMin - vMin) / 60 : 0
  const pause = brutto > 0 ? arbZGPause(brutto) : 0
  const netto = Math.max(0, brutto - pause)
  const soll = kalenderOhneSoll ? 0 : tagesSoll(person)
  const abwesenheitInfo = abwesenheit ? abwesenheitsartInfo(abwesenheit.art as Abwesenheitsart) : null
  const ist = abwesenheitInfo ? (abwesenheitInfo.schreibtSollAlsIstGut ? soll : 0) : netto
  const diff = ist - soll

  const bemerkung = feiertagName ?? (istWochenende(tag) ? 'Wochenende' : abwesenheit ? `${abwesenheit.art}` : '')

  async function speichern(neuVon: string, neuBis: string) {
    const v = parseZeit(neuVon)
    const b = parseZeit(neuBis)
    if (v != null && b != null && b > v) {
      if (istZeit?.id) {
        await db.istZeiten.update(istZeit.id, { vonMinuten: v, bisMinuten: b })
      } else {
        await db.istZeiten.add({ datum: tag, vonMinuten: v, bisMinuten: b, mitarbeiterId: person.id! })
      }
    } else if (istZeit?.id) {
      await db.istZeiten.delete(istZeit.id)
    }
  }

  return (
    <tr className={gesperrt ? 'zeile-gesperrt' : abwesenheit ? 'zeile-abwesend' : ''}>
      <td className="mono">
        {wochentagKurz(tag)} {formatDatum(tag)}
      </td>
      <td>
        <input
          type="time"
          value={von}
          disabled={gesperrt}
          onChange={(e) => setVon(e.target.value)}
          onBlur={() => speichern(von, bis)}
          style={{ width: 100 }}
        />
      </td>
      <td>
        <input
          type="time"
          value={bis}
          disabled={gesperrt}
          onChange={(e) => setBis(e.target.value)}
          onBlur={() => speichern(von, bis)}
          style={{ width: 100 }}
        />
      </td>
      <td className="zahl">{brutto > 0 ? stundenText(brutto) : ''}</td>
      <td className="zahl">{pause > 0 ? stundenText(pause) : ''}</td>
      <td className="zahl" style={{ fontWeight: 600 }}>
        {ist > 0 ? stundenText(ist) : ''}
      </td>
      <td className="zahl">{soll > 0 ? stundenText(soll) : ''}</td>
      <td className={`zahl ${diff >= 0 ? 'erfolg-text' : 'fehler-text'}`}>
        {brutto > 0 || abwesenheit ? `${diff >= 0 ? '+' : ''}${stundenText(diff)}` : ''}
      </td>
      <td className="hinweis-klein">{bemerkung}</td>
    </tr>
  )
}
