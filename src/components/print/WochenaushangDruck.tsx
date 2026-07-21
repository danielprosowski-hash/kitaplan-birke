import type { Dienst, Gruppe, Mitarbeiter } from '../../types'
import { formatDatum, formatZeit, stundenText, wochentagKurz } from '../../lib/calendar'
import { dienstNetto } from '../../lib/dienst'
import type { Wocheninfo } from '../../lib/calendar'

export default function WochenaushangDruck({
  gruppe,
  woche,
  dienste,
  mitarbeiterNachId,
}: {
  gruppe: Gruppe
  woche: Wocheninfo
  dienste: Dienst[]
  mitarbeiterNachId: Map<number, Mitarbeiter>
}) {
  return (
    <div className="druck-seite">
      <h1>
        {gruppe.name} · {woche.bezeichnung}
      </h1>
      <p className="hinweis-klein">
        {gruppe.typ} · Mindestbesetzung {gruppe.mindestbesetzung}
      </p>
      <div className="druck-wochenraster">
        {woche.werktage.map((tag) => {
          const tagesDienste = dienste
            .filter((d) => d.datum === tag)
            .sort((a, b) => a.beginn1Minuten - b.beginn1Minuten)
          return (
            <div className="druck-tagspalte" key={tag}>
              <div className="druck-tagspalte-kopf">
                {wochentagKurz(tag)} {formatDatum(tag)}
              </div>
              {tagesDienste.length === 0 && <div className="hinweis-klein">–</div>}
              {tagesDienste.map((d) => {
                const person = d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId) : undefined
                return (
                  <div className="druck-diensteintrag" key={d.id}>
                    <strong>{person?.name ?? '?'}</strong> ({person?.kuerzel ?? '?'})
                    <div>
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
            </div>
          )
        })}
      </div>
      <p className="druck-fusszeile">Erstellt am {new Date().toLocaleDateString('de-DE')} mit Kitaplan Birke.</p>
    </div>
  )
}
