import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { FUNKTIONEN, type Funktion, type Mitarbeiter } from '../types'
import { istAktiv, tagesSoll } from '../lib/dienst'
import { isoHeute, stundenText } from '../lib/calendar'
import Modal from './Modal'
import SpeicherAnzeige from './SpeicherAnzeige'
import { useSpeicherFeedback } from '../hooks/useSpeicherFeedback'

export default function PersonalView() {
  const mitarbeitende = useLiveQuery(
    () => db.mitarbeiter.orderBy('reihenfolge').toArray(),
    [],
    [] as Mitarbeiter[],
  )
  const gruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [])
  const [ausgewaehlt, setAusgewaehlt] = useState<number | null>(null)
  const [zeigeNeu, setZeigeNeu] = useState(false)
  const [zeigeLoeschDialog, setZeigeLoeschDialog] = useState(false)

  const aktuelle = mitarbeitende?.find((m) => m.id === ausgewaehlt)
  const aktiveGruppen = (gruppen ?? []).filter((g) => g.aktiv)
  const { sichtbar: gespeichertSichtbar, ausloesen: zeigeGespeichert } = useSpeicherFeedback()

  const [kuerzelEntwurf, setKuerzelEntwurf] = useState(aktuelle?.kuerzel ?? '')
  useEffect(() => {
    setKuerzelEntwurf(aktuelle?.kuerzel ?? '')
  }, [aktuelle?.id, aktuelle?.kuerzel])

  const kuerzelVergeben = (mitarbeitende ?? []).some(
    (m) => m.id !== aktuelle?.id && m.kuerzel.toUpperCase() === kuerzelEntwurf.trim().toUpperCase(),
  )
  const kuerzelZuKurz = kuerzelEntwurf.trim().length < 2
  const kuerzelFehler = kuerzelVergeben
    ? 'Dieses Kürzel ist schon vergeben – bitte ein anderes wählen.'
    : kuerzelZuKurz
      ? 'Das Kürzel braucht mindestens 2 Zeichen.'
      : null

  async function speichern(feld: keyof Mitarbeiter, wert: unknown) {
    if (!aktuelle?.id) return
    await db.mitarbeiter.update(aktuelle.id, { [feld]: wert })
    zeigeGespeichert()
  }

  function kuerzelUebernehmen() {
    if (!aktuelle?.id || kuerzelFehler) return
    if (kuerzelEntwurf.toUpperCase() !== aktuelle.kuerzel) {
      speichern('kuerzel', kuerzelEntwurf.toUpperCase())
    }
  }

  async function alsAusgeschiedenMarkieren() {
    if (!aktuelle?.id) return
    await db.mitarbeiter.update(aktuelle.id, { austrittsdatum: aktuelle.austrittsdatum ?? isoHeute() })
    setZeigeLoeschDialog(false)
  }

  async function endgueltigLoeschen() {
    if (!aktuelle?.id) return
    const id = aktuelle.id
    await db.transaction('rw', [db.mitarbeiter, db.abwesenheiten, db.dienste, db.istZeiten, db.kalender], async () => {
      await db.abwesenheiten.where('mitarbeiterId').equals(id).delete()
      await db.dienste.where('mitarbeiterId').equals(id).delete()
      await db.istZeiten.where('mitarbeiterId').equals(id).delete()
      await db.kalender.where('mitarbeiterId').equals(id).delete()
      await db.mitarbeiter.delete(id)
    })
    setZeigeLoeschDialog(false)
    setAusgewaehlt(null)
  }

  return (
    <div className="view split-view">
      <div className="split-liste">
        <div className="liste-scroll">
          {mitarbeitende?.map((m) => (
            <button
              key={m.id}
              className={`listen-eintrag${ausgewaehlt === m.id ? ' aktiv' : ''}`}
              onClick={() => setAusgewaehlt(m.id ?? null)}
            >
              <span className="mono kuerzel-badge">{m.kuerzel}</span>
              <span className="listen-eintrag-text">
                <strong>{m.name}</strong>
                <span className="listen-eintrag-sub">
                  {m.funktion} · {stundenText(m.wochenstunden)}/Woche
                </span>
              </span>
              {!istAktiv(m) && <span className="badge">ausgeschieden</span>}
            </button>
          ))}
        </div>
        <div className="liste-fusszeile">
          <button onClick={() => setZeigeNeu(true)}>+ Neu</button>
          <button className="gefahr" disabled={!aktuelle} onClick={() => setZeigeLoeschDialog(true)}>
            Löschen …
          </button>
          <span className="spacer" />
          <span className="hinweis-klein">{mitarbeitende?.length ?? 0} Mitarbeitende</span>
        </div>
      </div>

      <div className="split-detail">
        {aktuelle ? (
          <div className="formular" key={aktuelle.id}>
            <div className="formular-kopf">
              <h2 style={{ margin: 0 }}>Person</h2>
              <SpeicherAnzeige sichtbar={gespeichertSichtbar} />
            </div>
            <label>
              Name
              <input type="text" value={aktuelle.name} onChange={(e) => speichern('name', e.target.value)} />
            </label>
            <div className="formular-zeile">
              <label>
                Kürzel
                <input
                  type="text"
                  value={kuerzelEntwurf}
                  onChange={(e) => setKuerzelEntwurf(e.target.value.toUpperCase())}
                  onBlur={kuerzelUebernehmen}
                  style={{ width: 100 }}
                />
                {kuerzelFehler && <span className="fehler-text hinweis-klein">{kuerzelFehler}</span>}
              </label>
              <label>
                Funktion
                <select value={aktuelle.funktion} onChange={(e) => speichern('funktion', e.target.value as Funktion)}>
                  {FUNKTIONEN.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <h2>Arbeitszeit</h2>
            <div className="formular-zeile">
              <label>
                Wochenstunden
                <input
                  type="number"
                  step={0.5}
                  value={aktuelle.wochenstunden}
                  onChange={(e) => speichern('wochenstunden', Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </label>
              <div className="feldanzeige">
                <span className="hinweis-klein">Tages-Soll (5-Tage-Woche)</span>
                <strong>{stundenText(tagesSoll(aktuelle))}</strong>
              </div>
            </div>

            <h2>Zuordnung</h2>
            <label>
              Stammgruppe
              <select
                value={aktuelle.stammgruppeSlot ?? -1}
                onChange={(e) => speichern('stammgruppeSlot', Number(e.target.value) === -1 ? null : Number(e.target.value))}
              >
                <option value={-1}>– keine –</option>
                {aktiveGruppen.map((g) => (
                  <option key={g.slot} value={g.slot}>
                    {g.name} ({g.typ})
                  </option>
                ))}
              </select>
            </label>
            <div className="formular-zeile">
              <label>
                Beschäftigt seit
                <input
                  type="date"
                  value={aktuelle.beschaeftigtSeit}
                  onChange={(e) => speichern('beschaeftigtSeit', e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!aktuelle.austrittsdatum}
                  onChange={(e) =>
                    speichern('austrittsdatum', e.target.checked ? aktuelle.beschaeftigtSeit : null)
                  }
                />{' '}
                Ausgeschieden
              </label>
              {aktuelle.austrittsdatum && (
                <label>
                  Austrittsdatum
                  <input
                    type="date"
                    value={aktuelle.austrittsdatum}
                    onChange={(e) => speichern('austrittsdatum', e.target.value)}
                  />
                </label>
              )}
            </div>

            <h2>Hinweise</h2>
            <textarea
              rows={4}
              value={aktuelle.hinweise}
              onChange={(e) => speichern('hinweise', e.target.value)}
            />
          </div>
        ) : (
          <div className="leerhinweis">Mitarbeiter wählen oder neu anlegen.</div>
        )}
      </div>

      {zeigeNeu && (
        <NeuSheet
          gruppenSlots={aktiveGruppen.map((g) => ({ slot: g.slot, name: g.name, typ: g.typ }))}
          bestehendeReihenfolge={mitarbeitende?.map((m) => m.reihenfolge) ?? []}
          vorhandeneKuerzel={mitarbeitende?.map((m) => m.kuerzel) ?? []}
          onSchliessen={() => setZeigeNeu(false)}
          onAngelegt={(id) => {
            setZeigeNeu(false)
            setAusgewaehlt(id)
          }}
        />
      )}

      {zeigeLoeschDialog && aktuelle && (
        <Modal titel={`${aktuelle.name} entfernen?`} onSchliessen={() => setZeigeLoeschDialog(false)}>
          <p>
            In den meisten Fällen ist <strong>„Als ausgeschieden markieren"</strong> die richtige Wahl: Die Person
            verschwindet aus den Auswahllisten für neue Dienste, aber alle bisherigen Dienste, Abwesenheiten und
            Abrechnungsdaten bleiben erhalten und sind weiter auswertbar.
          </p>
          <p className="hinweis-klein">
            „Endgültig löschen" entfernt die Person und <strong>unwiderruflich</strong> auch alle ihre Dienste,
            Abwesenheiten, Ist-Zeiten und Kalendereinträge – auch aus vergangenen Monaten. Das lässt sich nur über
            eine zuvor heruntergeladene Sicherung rückgängig machen.
          </p>
          <div className="modal-aktionen">
            <button onClick={() => setZeigeLoeschDialog(false)}>Abbrechen</button>
            <button onClick={alsAusgeschiedenMarkieren}>Als ausgeschieden markieren</button>
            <button className="gefahr" onClick={endgueltigLoeschen}>
              Endgültig löschen
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function NeuSheet({
  gruppenSlots,
  bestehendeReihenfolge,
  vorhandeneKuerzel,
  onSchliessen,
  onAngelegt,
}: {
  gruppenSlots: { slot: number; name: string; typ: string }[]
  bestehendeReihenfolge: number[]
  vorhandeneKuerzel: string[]
  onSchliessen: () => void
  onAngelegt: (id: number) => void
}) {
  const [name, setName] = useState('')
  const [kuerzel, setKuerzel] = useState('')
  const [funktion, setFunktion] = useState<Funktion>('Erzieher')
  const [wochenstunden, setWochenstunden] = useState(35)
  const [stammgruppeSlot, setStammgruppeSlot] = useState(-1)

  const kuerzelVergeben = vorhandeneKuerzel.some((k) => k.toUpperCase() === kuerzel.trim().toUpperCase())
  const kuerzelGueltig = kuerzel.trim().length >= 2 && !kuerzelVergeben

  async function anlegen() {
    if (!kuerzelGueltig) return
    const reihenfolge = (bestehendeReihenfolge.length > 0 ? Math.max(...bestehendeReihenfolge) : 0) + 1
    const id = await db.mitarbeiter.add({
      kuerzel: kuerzel.toUpperCase(),
      name,
      funktion,
      wochenstunden,
      beschaeftigtSeit: new Date().toISOString().slice(0, 10),
      stammgruppeSlot: stammgruppeSlot === -1 ? null : stammgruppeSlot,
      hinweise: '',
      austrittsdatum: null,
      reihenfolge,
    })
    onAngelegt(id)
  }

  return (
    <Modal titel="Neuer Mitarbeiter" onSchliessen={onSchliessen}>
      <label>
        Name
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Kürzel (2–3 Buchstaben)
        <input type="text" value={kuerzel} onChange={(e) => setKuerzel(e.target.value.toUpperCase())} />
        {kuerzelVergeben && <span className="fehler-text hinweis-klein">Dieses Kürzel ist schon vergeben.</span>}
      </label>
      <label>
        Funktion
        <select value={funktion} onChange={(e) => setFunktion(e.target.value as Funktion)}>
          {FUNKTIONEN.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        Wochenstunden
        <input type="number" step={0.5} value={wochenstunden} onChange={(e) => setWochenstunden(Number(e.target.value))} />
      </label>
      <label>
        Stammgruppe
        <select value={stammgruppeSlot} onChange={(e) => setStammgruppeSlot(Number(e.target.value))}>
          <option value={-1}>– keine –</option>
          {gruppenSlots.map((g) => (
            <option key={g.slot} value={g.slot}>
              {g.name} ({g.typ})
            </option>
          ))}
        </select>
      </label>
      <div className="modal-aktionen">
        <button onClick={onSchliessen}>Abbrechen</button>
        <button className="primaer" disabled={name.trim().length === 0 || !kuerzelGueltig} onClick={anlegen}>
          Anlegen
        </button>
      </div>
    </Modal>
  )
}
