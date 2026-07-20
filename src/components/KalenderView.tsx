import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  ABWESENHEITSARTEN,
  KALENDER_FARBEN,
  KALENDER_KATEGORIEN,
  type Abwesenheitsart,
  type KalenderEintrag,
  type KalenderKategorie,
} from '../types'
import { addMonate, addTage, formatDatum, formatMonatJahr, isoHeute, montagDerWoche, wochentagKurz } from '../lib/calendar'
import Modal from './Modal'

/** Sinnvolle Vorbelegung, wenn aus einem Kalender-Wunsch eine echte
 * Abwesenheit gemacht wird. Bleibt im Dialog änderbar. */
const KATEGORIE_ZU_ABWESENHEIT: Record<KalenderKategorie, Abwesenheitsart> = {
  Urlaubswunsch: 'U',
  'Frei-Wunsch': 'F',
  Termin: 'F',
  Fortbildung: 'FB',
  Sonstiges: 'F',
}

/** Kalender für Urlaubswünsche, freie Tage und Termine der Beschäftigten.
 * Die Leitung trägt Wünsche vorab ein; im Wochenplan werden sie als
 * Erinnerung angezeigt. */
export default function KalenderView() {
  const [monat, setMonat] = useState(() => isoHeute().slice(0, 8) + '01')
  const mitarbeitende = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [])
  const eintraege = useLiveQuery(() => db.kalender.orderBy('datum').toArray(), [], [] as KalenderEintrag[])

  const [bearbeiten, setBearbeiten] = useState<KalenderEintrag | 'neu' | null>(null)
  const [neuFuerTag, setNeuFuerTag] = useState<string | null>(null)

  const tageImRaster = useMemo(() => {
    const [y, m] = monat.split('-').map(Number)
    const ersterDesMonats = `${y}-${String(m).padStart(2, '0')}-01`
    const start = montagDerWoche(ersterDesMonats)
    return Array.from({ length: 42 }, (_, i) => addTage(start, i))
  }, [monat])

  const eintraegeProTag = useMemo(() => {
    const map = new Map<string, KalenderEintrag[]>()
    for (const e of eintraege ?? []) {
      if (!map.has(e.datum)) map.set(e.datum, [])
      map.get(e.datum)!.push(e)
    }
    return map
  }, [eintraege])

  const heute = isoHeute()
  const aktuellerMonat = monat.slice(0, 7)
  const kuerzel = (id: number) => mitarbeitende?.find((m) => m.id === id)?.kuerzel ?? '?'

  return (
    <div className="view">
      <div className="kopfleiste">
        <h1 style={{ margin: 0 }}>Kalender – Wünsche &amp; Termine</h1>
        <span className="spacer" />
        <button onClick={() => setMonat(addMonate(monat, -1))}>‹</button>
        <span className="wochen-label">{formatMonatJahr(monat)}</span>
        <button onClick={() => setMonat(addMonate(monat, 1))}>›</button>
        <button onClick={() => setMonat(isoHeute().slice(0, 8) + '01')}>Heute</button>
      </div>
      <p className="view-untertitel">
        Trage hier Urlaubswünsche, Frei-Wünsche, private Termine und Fortbildungen der Beschäftigten ein. Im
        Wochenplan wirst du beim Schreiben der jeweiligen Woche automatisch daran erinnert.
      </p>

      <div className="kalender-legende">
        {KALENDER_KATEGORIEN.map((k) => (
          <span key={k} className="kalender-legende-eintrag">
            <span className="kalender-punkt" style={{ background: KALENDER_FARBEN[k] }} />
            {k}
          </span>
        ))}
      </div>

      <div className="kalender-raster">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((wd) => (
          <div className="kalender-kopf" key={wd}>
            {wd}
          </div>
        ))}
        {tageImRaster.map((tag) => {
          const imMonat = tag.slice(0, 7) === aktuellerMonat
          const eintraegeHeute = eintraegeProTag.get(tag) ?? []
          return (
            <div key={tag} className={`kalender-zelle${imMonat ? '' : ' ausserhalb'}${tag === heute ? ' heute' : ''}`}>
              <div className="kalender-zelle-kopf">
                <span>{Number(tag.slice(8, 10))}</span>
                <button className="kalender-plus" onClick={() => setNeuFuerTag(tag)} title="Eintrag hinzufügen">
                  +
                </button>
              </div>
              <div className="kalender-chips">
                {eintraegeHeute.map((e) => (
                  <button
                    key={e.id}
                    className="kalender-chip"
                    style={{ background: KALENDER_FARBEN[e.kategorie] }}
                    onClick={() => setBearbeiten(e)}
                    title={`${e.kategorie}${e.bemerkung ? ': ' + e.bemerkung : ''}`}
                  >
                    {kuerzel(e.mitarbeiterId)}
                    {e.erledigt && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {neuFuerTag && (
        <EintragSheet
          datum={neuFuerTag}
          mitarbeitende={mitarbeitende ?? []}
          onSchliessen={() => setNeuFuerTag(null)}
        />
      )}
      {bearbeiten && bearbeiten !== 'neu' && (
        <EintragSheet
          eintrag={bearbeiten}
          datum={bearbeiten.datum}
          mitarbeitende={mitarbeitende ?? []}
          onSchliessen={() => setBearbeiten(null)}
        />
      )}
    </div>
  )
}

function EintragSheet({
  datum,
  eintrag,
  mitarbeitende,
  onSchliessen,
}: {
  datum: string
  eintrag?: KalenderEintrag
  mitarbeitende: { id?: number; kuerzel: string; name: string }[]
  onSchliessen: () => void
}) {
  const [mitarbeiterId, setMitarbeiterId] = useState<number | ''>(eintrag?.mitarbeiterId ?? '')
  const [kategorie, setKategorie] = useState<KalenderKategorie>(eintrag?.kategorie ?? 'Urlaubswunsch')
  const [bemerkung, setBemerkung] = useState(eintrag?.bemerkung ?? '')
  const [erledigt, setErledigt] = useState(eintrag?.erledigt ?? false)
  const [abwesenheitsart, setAbwesenheitsart] = useState<Abwesenheitsart>(
    KATEGORIE_ZU_ABWESENHEIT[eintrag?.kategorie ?? 'Urlaubswunsch'],
  )
  const [uebernahmeMeldung, setUebernahmeMeldung] = useState<string | null>(null)

  async function speichern() {
    if (mitarbeiterId === '') return
    if (eintrag?.id) {
      await db.kalender.update(eintrag.id, { mitarbeiterId, kategorie, bemerkung, erledigt })
    } else {
      await db.kalender.add({ datum, mitarbeiterId, kategorie, bemerkung, erledigt: false })
    }
    onSchliessen()
  }

  async function loeschen() {
    if (eintrag?.id) await db.kalender.delete(eintrag.id)
    onSchliessen()
  }

  async function alsAbwesenheitUebernehmen() {
    if (mitarbeiterId === '' || !eintrag?.id) return
    const vorhanden = await db.abwesenheiten.where({ mitarbeiterId, datum }).first()
    if (vorhanden) {
      setUebernahmeMeldung(`Für diesen Tag ist bereits eine Abwesenheit (${vorhanden.art}) erfasst.`)
    } else {
      await db.abwesenheiten.add({
        datum,
        art: abwesenheitsart,
        bemerkung: bemerkung || `Aus Kalender: ${kategorie}`,
        mitarbeiterId,
      })
      setUebernahmeMeldung('Als Abwesenheit übernommen und im Stundenkonto berücksichtigt.')
    }
    await db.kalender.update(eintrag.id, { erledigt: true })
    setErledigt(true)
  }

  return (
    <Modal titel={`Kalender-Eintrag – ${formatDatum(datum)} (${wochentagKurz(datum)})`} onSchliessen={onSchliessen}>
      <label>
        Person
        <select value={mitarbeiterId} onChange={(e) => setMitarbeiterId(e.target.value === '' ? '' : Number(e.target.value))} autoFocus>
          <option value="">– wählen –</option>
          {mitarbeitende.map((m) => (
            <option key={m.id} value={m.id}>
              {m.kuerzel} – {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kategorie
        <select value={kategorie} onChange={(e) => setKategorie(e.target.value as KalenderKategorie)}>
          {KALENDER_KATEGORIEN.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bemerkung
        <input type="text" value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="optional" />
      </label>
      <p className="hinweis-klein">
        Wichtig: Dieser Kalender-Eintrag ist nur eine Erinnerung. Er wirkt sich NICHT auf den Dienstplan oder die
        Abrechnung aus. Für einen genehmigten Urlaub/freien Tag zusätzlich unten „Als Abwesenheit übernehmen" nutzen
        – erst das trägt sich ins Stundenkonto ein.
      </p>
      {eintrag && (
        <>
          <div className="karte" style={{ margin: '4px 0 14px' }}>
            <strong style={{ fontSize: 13 }}>Als Abwesenheit übernehmen</strong>
            <p className="hinweis-klein" style={{ margin: '4px 0 8px' }}>
              Legt für {formatDatum(datum)} einen echten Abwesenheits-Eintrag an (wirkt sich auf Wochenplan-Warnungen
              und die Abrechnung aus).
            </p>
            <div className="formular-zeile" style={{ alignItems: 'center' }}>
              <select value={abwesenheitsart} onChange={(e) => setAbwesenheitsart(e.target.value as Abwesenheitsart)}>
                {ABWESENHEITSARTEN.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} – {a.bezeichnung}
                  </option>
                ))}
              </select>
              <button type="button" disabled={mitarbeiterId === ''} onClick={alsAbwesenheitUebernehmen}>
                Übernehmen
              </button>
            </div>
            {uebernahmeMeldung && <p className="erfolg-text hinweis-klein">{uebernahmeMeldung}</p>}
          </div>
          <label>
            <input type="checkbox" checked={erledigt} onChange={(e) => setErledigt(e.target.checked)} /> Als
            „erledigt" markieren (nur eine Notiz für dich, ändert nichts an Plan/Abrechnung)
          </label>
        </>
      )}
      <div className="modal-aktionen">
        {eintrag && (
          <button className="gefahr" onClick={loeschen}>
            Löschen
          </button>
        )}
        <span className="spacer" />
        <button onClick={onSchliessen}>Abbrechen</button>
        <button className="primaer" disabled={mitarbeiterId === ''} onClick={speichern}>
          Speichern
        </button>
      </div>
    </Modal>
  )
}
