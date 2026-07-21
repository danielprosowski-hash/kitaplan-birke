import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Abwesenheit, Abwesenheitsart, Dienst, Dienstart, Feiertag, Gruppe, KalenderEintrag, Mitarbeiter, Randdienst } from '../types'
import { ABWESENHEITSARTEN, ABWESENHEITS_FARBEN, KALENDER_FARBEN, abwesenheitsartInfo } from '../types'
import { addTage, formatDatum, formatZeit, isoHeute, parseZeit, stundenText, wochentagKurz, wocheninfo } from '../lib/calendar'
import { dienstNetto, dienstBrutto, istAktiv, vorname } from '../lib/dienst'
import { kernzeitDefizit, pauseFehlt, findeUeberschneidungen } from '../lib/pruefungen'
import { deckRanddienstAb, randdienstFarbe } from '../lib/abdeckung'
import { berechneWochenkonto } from '../lib/stundenkonto'
import { baueUebernahme, baueVorlage, rotationswocheFuerMontag } from '../lib/wochenvorlage'
import { useDruck } from './DruckContext'
import Modal from './Modal'
import WochenaushangDruck from './print/WochenaushangDruck'
import GesamtplanDruck from './print/GesamtplanDruck'

const WOCHENTAGE: { label: string; wd: number }[] = [
  { label: 'Mo', wd: 2 },
  { label: 'Di', wd: 3 },
  { label: 'Mi', wd: 4 },
  { label: 'Do', wd: 5 },
  { label: 'Fr', wd: 6 },
]

export default function WochenplanView() {
  const { oeffneDruck } = useDruck()
  const alleGruppen = useLiveQuery(() => db.gruppen.orderBy('slot').toArray(), [], [] as Gruppe[])
  const alleMitarbeiter = useLiveQuery(() => db.mitarbeiter.orderBy('name').toArray(), [], [] as Mitarbeiter[])
  const alleDienste = useLiveQuery(() => db.dienste.toArray(), [], [] as Dienst[])
  const alleFeiertage = useLiveQuery(() => db.feiertage.toArray(), [], [] as Feiertag[])
  const alleKalender = useLiveQuery(() => db.kalender.toArray(), [], [] as KalenderEintrag[])
  const alleAbwesenheiten = useLiveQuery(() => db.abwesenheiten.toArray(), [], [] as Abwesenheit[])
  const alleDienstarten = useLiveQuery(() => db.dienstarten.orderBy('reihenfolge').toArray(), [], [] as Dienstart[])
  const alleRanddienste = useLiveQuery(() => db.randdienste.orderBy('reihenfolge').toArray(), [], [] as Randdienst[])
  const aktiveRanddienste = useMemo(() => (alleRanddienste ?? []).filter((r) => r.aktiv), [alleRanddienste])
  const einstellungen = useLiveQuery(() => db.einstellungen.toCollection().first(), [], undefined)
  const anzahlRotationswochen = einstellungen?.rahmenplanRotationswochen ?? 1

  const [gewaehlterSlot, setGewaehlterSlot] = useState<number | null>(null)
  const [referenzdatum, setReferenzdatum] = useState(isoHeute())
  const [bearbeitenDienst, setBearbeitenDienst] = useState<Dienst | null>(null)
  const [neuFuerTag, setNeuFuerTag] = useState<string | null>(null)
  const [neueAbwesenheitFuerTag, setNeueAbwesenheitFuerTag] = useState<string | null>(null)
  const [zeigeSpeichernAlsVorlage, setZeigeSpeichernAlsVorlage] = useState(false)
  const [zeigeUebernehmenDialog, setZeigeUebernehmenDialog] = useState(false)
  const [meldung, setMeldung] = useState<string | null>(null)
  const [autoUebernommenFuer, setAutoUebernommenFuer] = useState<string | null>(null)

  const aktiveGruppen = (alleGruppen ?? []).filter((g) => g.aktiv)
  const gruppe = aktiveGruppen.find((g) => g.slot === gewaehlterSlot) ?? null
  const woche = useMemo(() => wocheninfo(referenzdatum), [referenzdatum])

  const mitarbeiterNachId = useMemo(() => new Map((alleMitarbeiter ?? []).map((m) => [m.id!, m])), [alleMitarbeiter])
  // Ausgeschiedene Personen sollen beim Neuanlegen/Verschieben nicht mehr auswählbar sein.
  const aktiveMitarbeiter = useMemo(() => (alleMitarbeiter ?? []).filter((m) => istAktiv(m)), [alleMitarbeiter])
  const feiertagNachDatum = useMemo(() => new Map((alleFeiertage ?? []).map((f) => [f.datum, f])), [alleFeiertage])

  function zeige(msg: string) {
    setMeldung(msg)
    setTimeout(() => setMeldung(null), 4000)
  }

  // --- Prüf-Hinweise (Kernzeit/Pause) ---
  const pruefHinweise = useMemo(() => {
    if (!gruppe) return []
    const hinweise: string[] = []
    for (const tag of woche.werktage) {
      // An Feiertagen ist die Einrichtung geschlossen – Kernzeit-/Pausen-
      // Warnungen wären hier nur Lärm, den niemand beheben kann.
      if (feiertagNachDatum.has(tag)) continue
      const dienste = (alleDienste ?? []).filter((d) => !d.istVorlage && d.gruppenSlot === gruppe.slot && d.datum === tag)
      const defizit = kernzeitDefizit(dienste, gruppe.mindestbesetzung)
      if (defizit > 0) {
        hinweise.push(`Kernzeit ${gruppe.name} am ${formatDatum(tag)}: ${defizit} Person(en) fehlen.`)
      }
      for (const d of dienste) {
        if (pauseFehlt(d)) {
          const p = d.mitarbeiterId != null ? mitarbeiterNachId.get(d.mitarbeiterId)?.kuerzel ?? '?' : '?'
          hinweise.push(`${p} am ${formatDatum(tag)}: ${stundenText(dienstBrutto(d))} ohne ausreichende Pause.`)
        }
      }
    }
    return hinweise
  }, [gruppe, woche, alleDienste, mitarbeiterNachId, feiertagNachDatum])

  // --- Kalender-Erinnerungen der Woche (Wünsche/Termine) ---
  const kalenderHinweise = useMemo(() => {
    return (alleKalender ?? [])
      .filter((k) => woche.alleTage.includes(k.datum))
      .map((k) => ({ ...k, person: mitarbeiterNachId.get(k.mitarbeiterId) }))
      .sort((a, b) => a.datum.localeCompare(b.datum))
  }, [alleKalender, woche, mitarbeiterNachId])
  const kalenderProTag = useMemo(() => {
    const map = new Map<string, typeof kalenderHinweise>()
    for (const k of kalenderHinweise) {
      if (!map.has(k.datum)) map.set(k.datum, [])
      map.get(k.datum)!.push(k)
    }
    return map
  }, [kalenderHinweise])

  // --- Abwesenheiten (Urlaub/Krank/…) der Stammbesetzung dieser Gruppe,
  // direkt im Wochenplan sichtbar und eintragbar. ---
  const abwesenheitenDerWoche = useMemo(() => {
    if (!gruppe) return []
    return (alleAbwesenheiten ?? [])
      .filter((a) => woche.alleTage.includes(a.datum))
      .map((a) => ({ ...a, person: mitarbeiterNachId.get(a.mitarbeiterId) }))
      .filter((a) => a.person?.stammgruppeSlot === gruppe.slot)
  }, [alleAbwesenheiten, woche, mitarbeiterNachId, gruppe])
  const abwesenheitenProTag = useMemo(() => {
    const map = new Map<string, typeof abwesenheitenDerWoche>()
    for (const a of abwesenheitenDerWoche) {
      if (!map.has(a.datum)) map.set(a.datum, [])
      map.get(a.datum)!.push(a)
    }
    return map
  }, [abwesenheitenDerWoche])

  // --- Dienste der ganzen Woche, gruppenübergreifend (für Stundenkonto & Überschneidungen) ---
  const wochendienste = useMemo(
    () => (alleDienste ?? []).filter((d) => !d.istVorlage && woche.alleTage.includes(d.datum)),
    [alleDienste, woche],
  )

  // --- Stundenkonto: Soll/Ist je Person für die angezeigte Woche, unabhängig
  // von der gewählten Gruppe, damit man beim Planen nicht selbst rechnen muss. ---
  const wochenkonto = useMemo(
    () => berechneWochenkonto(alleMitarbeiter ?? [], woche.werktage, alleFeiertage ?? [], wochendienste, alleAbwesenheiten ?? []),
    [alleMitarbeiter, woche, alleFeiertage, wochendienste, alleAbwesenheiten],
  )

  // --- Gruppenübergreifende Doppelverplanung: derselbe Mensch zur selben
  // Zeit in zwei Gruppen. Der Wochenplan zeigt sonst immer nur eine Gruppe,
  // daher würde das sonst nicht auffallen. ---
  const gruppeNachSlot = useMemo(() => new Map((alleGruppen ?? []).map((g) => [g.slot, g])), [alleGruppen])
  const ueberschneidungen = useMemo(() => findeUeberschneidungen(wochendienste), [wochendienste])

  async function verschiebeDienst(dienstId: number, neuesDatum: string) {
    await db.dienste.update(dienstId, { datum: neuesDatum })
  }

  // --- Standard-Woche / Rahmenplan ---
  // Bei einer Rotation aus mehreren Wochen (Einstellung im Rahmenplan) gilt
  // für jede echte Kalenderwoche eine andere der hinterlegten Wochen – die
  // hier gezeigte/gespeicherte Vorlage bezieht sich immer nur auf die zur
  // angezeigten Woche passende Rotationswoche, nicht auf alle auf einmal.
  const rotationsWocheAktuell = useMemo(
    () => rotationswocheFuerMontag(woche.montag, anzahlRotationswochen),
    [woche.montag, anzahlRotationswochen],
  )
  const vorlageDieserRotationswoche = useMemo(
    () => (alleDienste ?? []).filter((d) => d.istVorlage && (d.rotationsWoche ?? 1) === rotationsWocheAktuell),
    [alleDienste, rotationsWocheAktuell],
  )
  const vorlagenAnzahl = vorlageDieserRotationswoche.length
  const diensteInZielwoche = (alleDienste ?? []).filter((d) => !d.istVorlage && woche.alleTage.includes(d.datum)).length
  const diensteFuerGruppeInWoche = gruppe ? wochendienste.filter((d) => d.gruppenSlot === gruppe.slot).length : 0

  async function speichereAlsVorlage() {
    const neueVorlage = baueVorlage(woche, alleDienste ?? [], rotationsWocheAktuell)
    const alteVorlageIds = vorlageDieserRotationswoche.filter((d) => d.id != null).map((d) => d.id!)
    await db.transaction('rw', db.dienste, async () => {
      if (alteVorlageIds.length > 0) await db.dienste.bulkDelete(alteVorlageIds)
      if (neueVorlage.length > 0) await db.dienste.bulkAdd(neueVorlage)
    })
    zeige(
      anzahlRotationswochen > 1
        ? `${neueVorlage.length} Dienste als Rotationswoche ${rotationsWocheAktuell} von ${anzahlRotationswochen} gespeichert.`
        : `${neueVorlage.length} Dienste als Vorlage gespeichert.`,
    )
    setZeigeSpeichernAlsVorlage(false)
  }

  // --- Rahmenplan automatisch übernehmen: sobald eine komplett leere Woche
  // (noch KEIN echter Dienst irgendwo, egal welche Gruppe) geöffnet wird und
  // für die passende Rotationswoche ein Rahmenplan existiert, wird er
  // transparent eingesetzt – ohne bestehende Einträge anzufassen (die
  // Bedingung greift nur, wenn wirklich noch nichts da ist) und pro Woche
  // nur einmal. ---
  useEffect(() => {
    if (alleDienste == null) return
    if (vorlagenAnzahl === 0) return
    if (diensteInZielwoche > 0) return
    if (autoUebernommenFuer === woche.montag) return
    setAutoUebernommenFuer(woche.montag)
    ;(async () => {
      const { neueDienste } = baueUebernahme(woche, vorlageDieserRotationswoche, false, alleDienste)
      if (neueDienste.length > 0) {
        await db.dienste.bulkAdd(neueDienste)
        zeige(`Rahmenplan automatisch für ${woche.bezeichnung} übernommen (${neueDienste.length} Dienste).`)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [woche.montag, vorlagenAnzahl, diensteInZielwoche, alleDienste, autoUebernommenFuer, vorlageDieserRotationswoche])

  async function uebernehmen(vorhandeneErsetzen: boolean) {
    const { neueDienste, zuLoeschenIds } = baueUebernahme(woche, vorlageDieserRotationswoche, vorhandeneErsetzen, alleDienste ?? [])
    await db.transaction('rw', db.dienste, async () => {
      if (zuLoeschenIds.length > 0) await db.dienste.bulkDelete(zuLoeschenIds)
      if (neueDienste.length > 0) await db.dienste.bulkAdd(neueDienste)
    })
    zeige(`${neueDienste.length} Dienste übernommen.`)
    setZeigeUebernehmenDialog(false)
  }

  function pdfAushang() {
    if (!gruppe) return
    const dienste = (alleDienste ?? []).filter(
      (d) => !d.istVorlage && d.gruppenSlot === gruppe.slot && woche.alleTage.includes(d.datum),
    )
    oeffneDruck(
      <WochenaushangDruck gruppe={gruppe} woche={woche} dienste={dienste} mitarbeiterNachId={mitarbeiterNachId} />,
      `Wochenaushang – ${gruppe.name}`,
    )
  }

  function pdfGesamt() {
    const dienste = (alleDienste ?? []).filter((d) => !d.istVorlage && woche.alleTage.includes(d.datum))
    oeffneDruck(
      <GesamtplanDruck woche={woche} gruppen={aktiveGruppen} dienste={dienste} mitarbeiterNachId={mitarbeiterNachId} />,
      'Gesamtplan',
    )
  }

  return (
    <div className="view">
      <div className="kopfleiste">
        <select
          value={gewaehlterSlot ?? ''}
          onChange={(e) => setGewaehlterSlot(e.target.value === '' ? null : Number(e.target.value))}
          style={{ maxWidth: 320 }}
        >
          <option value="">– Gruppe wählen –</option>
          {aktiveGruppen.map((g) => (
            <option key={g.slot} value={g.slot}>
              {g.name} ({g.typ}, min. {g.mindestbesetzung})
            </option>
          ))}
        </select>
        <span className="spacer" />
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, -7))}>‹</button>
        <span className="wochen-label">{woche.bezeichnung}</span>
        <button onClick={() => setReferenzdatum(addTage(referenzdatum, 7))}>›</button>
        <button onClick={() => setReferenzdatum(isoHeute())}>Heute</button>
        {gruppe && (
          <>
            <button onClick={pdfAushang}>PDF Aushang</button>
            <button onClick={pdfGesamt}>PDF Gesamt</button>
          </>
        )}
      </div>

      {wochenkonto.length > 0 && (
        <div className="karte stundenkonto-karte">
          <h3>Stundenkonto diese Woche</h3>
          <p className="hinweis-klein" style={{ marginBottom: 10 }}>
            Ist / Soll je Person, über alle Gruppen hinweg – rot heißt: noch nicht auf Vertragsstunden geplant.
          </p>
          <div className="stundenkonto-liste">
            {wochenkonto.map((z) => (
              <span key={z.mitarbeiterId} className={`stundenkonto-eintrag ${z.diff < -0.01 ? 'unter' : 'passt'}`}>
                <strong>{vorname(z.name)}</strong> {stundenText(z.ist)} / {stundenText(z.soll)} Std
              </span>
            ))}
          </div>
        </div>
      )}

      {ueberschneidungen.length > 0 && (
        <div className="hinweisliste">
          {ueberschneidungen.map((u, i) => {
            const person = mitarbeiterNachId.get(u.mitarbeiterId)
            const gruppeA = u.a.gruppenSlot != null ? gruppeNachSlot.get(u.a.gruppenSlot)?.name : undefined
            const gruppeB = u.b.gruppenSlot != null ? gruppeNachSlot.get(u.b.gruppenSlot)?.name : undefined
            return (
              <div key={i} className="hinweiszeile warnung">
                ⚠ {vorname(person?.name)} ist am {wochentagKurz(u.datum)} ({formatDatum(u.datum)}) doppelt eingeplant:{' '}
                {formatZeit(u.a.beginn1Minuten)}–{formatZeit(u.a.ende1Minuten)}
                {gruppeA ? ` in ${gruppeA}` : ''} und {formatZeit(u.b.beginn1Minuten)}–{formatZeit(u.b.ende1Minuten)}
                {gruppeB ? ` in ${gruppeB}` : ''}.
              </div>
            )
          })}
        </div>
      )}

      <div className="vorlagen-leiste">
        <span>
          {anzahlRotationswochen > 1 && (
            <strong>Rotationswoche {rotationsWocheAktuell} von {anzahlRotationswochen}:{' '}</strong>
          )}
          {vorlagenAnzahl === 0 ? 'Keine Standard-Woche gespeichert.' : `Standard-Woche gespeichert (${vorlagenAnzahl} Dienste).`}
          {' '}
          <span className="hinweis-klein">
            Gilt für die ganze angezeigte Woche, über alle Gruppen hinweg – nicht nur für {gruppe?.name ?? 'die gewählte Gruppe'}.
            {anzahlRotationswochen > 1 && ' Andere Rotationswochen bleiben davon unberührt, siehe „Rahmenplan".'}
          </span>
        </span>
        <span className="spacer" />
        {meldung && <span className="erfolg-text">{meldung}</span>}
        <button onClick={() => setZeigeSpeichernAlsVorlage(true)}>Als Standard-Woche speichern</button>
        <button disabled={vorlagenAnzahl === 0} onClick={() => setZeigeUebernehmenDialog(true)}>
          Standard-Woche übernehmen
        </button>
      </div>

      {!gruppe ? (
        <div className="leerhinweis">Bitte eine aktive Gruppe wählen. Gruppen werden unter „Gruppen" aktiviert.</div>
      ) : (
        <>
          {diensteFuerGruppeInWoche === 0 && (
            <div className="karte einstiegs-karte">
              <h3>Diese Woche ist für {gruppe.name} noch leer</h3>
              <p className="hinweis-klein" style={{ marginBottom: vorlagenAnzahl > 0 ? 10 : 0 }}>
                {vorlagenAnzahl > 0
                  ? 'Am schnellsten geht es mit der gespeicherten Standard-Woche, die dann direkt für alle Gruppen der Woche gilt.'
                  : 'Lege unten Dienste über „+ Dienst" an einem Tag an, oder speichere zuerst in einer bereits geplanten Woche eine Standard-Woche als Vorlage.'}
                {kalenderHinweise.length > 0 && ` Es gibt außerdem ${kalenderHinweise.length} offene Wunsch/Termin-Eintrag(e) für diese Woche – siehe unten.`}
              </p>
              {vorlagenAnzahl > 0 && (
                <button className="primaer" onClick={() => setZeigeUebernehmenDialog(true)}>
                  Standard-Woche übernehmen
                </button>
              )}
            </div>
          )}

          {(pruefHinweise.length > 0 || kalenderHinweise.length > 0) && (
            <div className="hinweisliste">
              {pruefHinweise.map((h, i) => (
                <div key={`p${i}`} className="hinweiszeile warnung">
                  ⚠ {h}
                </div>
              ))}
              {kalenderHinweise.map((k) => (
                <div key={`k${k.id}`} className="hinweiszeile kalenderhinweis">
                  <span className="kalender-punkt" style={{ background: KALENDER_FARBEN[k.kategorie] }} />
                  {formatDatum(k.datum)} ({wochentagKurz(k.datum)}): {k.person?.kuerzel ?? '?'} – {k.kategorie}
                  {k.bemerkung ? ` (${k.bemerkung})` : ''}
                  {k.erledigt ? ' · bereits berücksichtigt' : ''}
                </div>
              ))}
            </div>
          )}

          {diensteFuerGruppeInWoche > 0 && pruefHinweise.length === 0 && ueberschneidungen.length === 0 && (
            <p className="erfolg-text" style={{ margin: '0 0 12px' }}>
              ✓ Kernzeit besetzt, Pausen eingehalten, keine Doppelverplanung gefunden.
            </p>
          )}

          <p className="hinweis-klein" style={{ margin: '0 0 8px' }}>
            Tipp: Dienstkarten lassen sich mit der Maus auf einen anderen Tag ziehen. Auf dem Tablet oder ohne Maus:
            Karte antippen und den Tag im Dialog umstellen.
          </p>
          <div className="wochenraster">
            {woche.alleTage.map((tag) => (
              <TagSpalte
                key={tag}
                tag={tag}
                dienste={(alleDienste ?? [])
                  .filter((d) => !d.istVorlage && d.gruppenSlot === gruppe.slot && d.datum === tag)
                  .sort((a, b) => a.beginn1Minuten - b.beginn1Minuten)}
                feiertagName={feiertagNachDatum.get(tag)?.name}
                kalenderEintraege={kalenderProTag.get(tag) ?? []}
                abwesenheiten={abwesenheitenProTag.get(tag) ?? []}
                mitarbeiterNachId={mitarbeiterNachId}
                aktiveRanddienste={aktiveRanddienste}
                onNeu={() => setNeuFuerTag(tag)}
                onNeueAbwesenheit={() => setNeueAbwesenheitFuerTag(tag)}
                onBearbeiten={setBearbeitenDienst}
                onDrop={verschiebeDienst}
              />
            ))}
          </div>
        </>
      )}

      {bearbeitenDienst && (
        <DienstBearbeitenSheet
          dienst={bearbeitenDienst}
          mitarbeitende={alleMitarbeiter ?? []}
          abwesenheiten={alleAbwesenheiten ?? []}
          onSchliessen={() => setBearbeitenDienst(null)}
        />
      )}
      {neuFuerTag && gruppe && (
        <DienstNeuSheet
          datum={neuFuerTag}
          gruppe={gruppe}
          mitarbeitende={aktiveMitarbeiter}
          abwesenheiten={alleAbwesenheiten ?? []}
          dienstarten={alleDienstarten ?? []}
          onSchliessen={() => setNeuFuerTag(null)}
        />
      )}
      {neueAbwesenheitFuerTag && (
        <AbwesenheitNeuSheet
          datum={neueAbwesenheitFuerTag}
          mitarbeitende={aktiveMitarbeiter}
          abwesenheiten={alleAbwesenheiten ?? []}
          dienste={alleDienste ?? []}
          gruppeNachSlot={gruppeNachSlot}
          onSchliessen={() => setNeueAbwesenheitFuerTag(null)}
        />
      )}
      {zeigeSpeichernAlsVorlage && (
        <Modal titel="Aktuelle Woche als Standard-Woche speichern?" onSchliessen={() => setZeigeSpeichernAlsVorlage(false)}>
          <p>
            Alle Dienste der angezeigten Woche werden als Vorlage gespeichert. Eine bereits gespeicherte Vorlage wird
            dabei ersetzt. Die echten Dienste der Woche bleiben unverändert.
          </p>
          <div className="modal-aktionen">
            <button onClick={() => setZeigeSpeichernAlsVorlage(false)}>Abbrechen</button>
            <button className="primaer" onClick={speichereAlsVorlage}>
              Speichern
            </button>
          </div>
        </Modal>
      )}
      {zeigeUebernehmenDialog && (
        <Modal titel={`Standard-Woche auf ${woche.bezeichnung} übernehmen?`} onSchliessen={() => setZeigeUebernehmenDialog(false)}>
          <p>
            {diensteInZielwoche > 0
              ? `In der Zielwoche stehen bereits ${diensteInZielwoche} Dienste. Soll die Vorlage ergänzend angelegt werden oder die bestehenden Dienste der Woche ersetzen?`
              : 'Die Standard-Woche wird vollständig auf diese Woche kopiert.'}
          </p>
          <div className="modal-aktionen">
            <button onClick={() => setZeigeUebernehmenDialog(false)}>Abbrechen</button>
            {diensteInZielwoche > 0 ? (
              <>
                <button onClick={() => uebernehmen(false)}>Ergänzen</button>
                <button className="gefahr" onClick={() => uebernehmen(true)}>
                  Ersetzen
                </button>
              </>
            ) : (
              <button className="primaer" onClick={() => uebernehmen(false)}>
                Übernehmen
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function TagSpalte({
  tag,
  dienste,
  feiertagName,
  kalenderEintraege,
  abwesenheiten,
  mitarbeiterNachId,
  aktiveRanddienste,
  onNeu,
  onNeueAbwesenheit,
  onBearbeiten,
  onDrop,
}: {
  tag: string
  dienste: Dienst[]
  feiertagName?: string
  kalenderEintraege: (KalenderEintrag & { person?: Mitarbeiter })[]
  abwesenheiten: (Abwesenheit & { person?: Mitarbeiter })[]
  mitarbeiterNachId: Map<number, Mitarbeiter>
  aktiveRanddienste: Randdienst[]
  onNeu: () => void
  onNeueAbwesenheit: () => void
  onBearbeiten: (d: Dienst) => void
  onDrop: (dienstId: number, neuesDatum: string) => void
}) {
  const wd = wochentagKurz(tag)
  const istWE = wd === 'Sa' || wd === 'So'
  const [dragUeber, setDragUeber] = useState(false)

  return (
    <div
      className={`tagspalte${istWE || feiertagName ? ' frei' : ''}${dragUeber ? ' drop-ziel' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragUeber(true)
      }}
      onDragLeave={() => setDragUeber(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragUeber(false)
        const id = Number(e.dataTransfer.getData('text/plain'))
        if (id) onDrop(id, tag)
      }}
    >
      <div className="tagspalte-kopf">
        <strong>{wd}</strong>
        <span className="hinweis-klein">{formatDatum(tag).slice(0, 5)}</span>
      </div>
      {feiertagName && <div className="tagspalte-hinweis feiertag">{feiertagName}</div>}
      {istWE && !feiertagName && <div className="tagspalte-hinweis">Wochenende</div>}
      {kalenderEintraege.length > 0 && (
        <div className="tagspalte-kalender">
          {kalenderEintraege.map((k) => (
            <span
              key={k.id}
              className="kalender-chip klein"
              style={{ background: KALENDER_FARBEN[k.kategorie] }}
              title={`${k.kategorie}${k.bemerkung ? ': ' + k.bemerkung : ''}`}
            >
              {vorname(k.person?.name)}
            </span>
          ))}
        </div>
      )}
      {abwesenheiten.length > 0 && (
        <div className="tagspalte-kalender">
          {abwesenheiten.map((a) => {
            const info = abwesenheitsartInfo(a.art)
            return (
              <span
                key={a.id}
                className="kalender-chip klein"
                style={{ background: ABWESENHEITS_FARBEN[a.art] }}
                title={`${info.bezeichnung}${a.bemerkung ? ': ' + a.bemerkung : ''}`}
              >
                {vorname(a.person?.name)} · {info.code}
              </span>
            )
          })}
        </div>
      )}
      {dienste.map((d) => {
        const abgedeckt = aktiveRanddienste
          .map((rd, i) => ({ rd, farbe: randdienstFarbe(i) }))
          .filter(({ rd }) => deckRanddienstAb(d, rd))
        return (
          <div
            key={d.id}
            className={`dienstkarte${pauseFehlt(d) ? ' warnung' : ''}`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(d.id))}
            onClick={() => onBearbeiten(d)}
            style={abgedeckt.length > 0 ? { borderLeft: `4px solid ${abgedeckt[0].farbe}` } : undefined}
          >
            <div className="dienstkarte-kopf">
              <strong>{d.mitarbeiterId != null ? vorname(mitarbeiterNachId.get(d.mitarbeiterId)?.name) : '?'}</strong>
              <span className="hinweis-klein">{stundenText(dienstNetto(d))}</span>
            </div>
            <div className="hinweis-klein">
              {formatZeit(d.beginn1Minuten)}–{formatZeit(d.ende1Minuten)}
              {d.beginn2Minuten != null && d.ende2Minuten != null && (
                <> · {formatZeit(d.beginn2Minuten)}–{formatZeit(d.ende2Minuten)}</>
              )}
            </div>
            {abgedeckt.length > 0 && (
              <div className="dienstkarte-randdienste">
                {abgedeckt.map(({ rd, farbe }) => (
                  <span
                    key={rd.id}
                    className="randdienst-punkt"
                    style={{ background: farbe }}
                    title={`Deckt Randdienst „${rd.bezeichnung}" ab`}
                  />
                ))}
              </div>
            )}
            {d.notiz && (
              <div className="dienstkarte-notiz" title={d.notiz}>
                📝 {d.notiz}
              </div>
            )}
          </div>
        )
      })}
      {!istWE && !feiertagName && (
        <div className="tagspalte-aktionen">
          <button className="tagspalte-plus" onClick={onNeu}>
            + Dienst
          </button>
          <button className="tagspalte-plus" onClick={onNeueAbwesenheit}>
            + Abwesenheit
          </button>
        </div>
      )}
    </div>
  )
}

function WochentagAuswahl({
  basisdatum,
  auswahl,
  setAuswahl,
}: {
  basisdatum: string
  auswahl: Set<number>
  setAuswahl: (s: Set<number>) => void
}) {
  const aktuellerWd = wochentagKurz(basisdatum)
  return (
    <div className="wochentag-auswahl">
      <span className="hinweis-klein">Auch übernehmen für</span>
      <div className="wochentag-auswahl-reihe">
        {WOCHENTAGE.map((w) => {
          const istAktuell = w.label === aktuellerWd
          const gewaehlt = auswahl.has(w.wd)
          return (
            <button
              key={w.wd}
              type="button"
              disabled={istAktuell}
              className={`wochentag-knopf${gewaehlt ? ' aktiv' : ''}`}
              onClick={() => {
                const neu = new Set(auswahl)
                if (neu.has(w.wd)) neu.delete(w.wd)
                else neu.add(w.wd)
                setAuswahl(neu)
              }}
            >
              {w.label}
            </button>
          )
        })}
        <button type="button" onClick={() => setAuswahl(new Set(WOCHENTAGE.map((w) => w.wd).filter((wd) => wochentagKurz(basisdatum) !== WOCHENTAGE.find((w) => w.wd === wd)?.label)))}>
          Mo–Fr
        </button>
        <button type="button" onClick={() => setAuswahl(new Set())}>
          Keine
        </button>
      </div>
    </div>
  )
}

function datenFuerWochentage(basis: string, wochentage: Set<number>): string[] {
  const woche = wocheninfo(basis)
  return woche.werktage.filter((d) => {
    const wd = WOCHENTAGE.find((w) => w.label === wochentagKurz(d))?.wd
    return wd != null && wochentage.has(wd)
  })
}

function DienstNeuSheet({
  datum,
  gruppe,
  mitarbeitende,
  abwesenheiten,
  dienstarten,
  onSchliessen,
}: {
  datum: string
  gruppe: Gruppe
  mitarbeitende: Mitarbeiter[]
  abwesenheiten: Abwesenheit[]
  dienstarten: Dienstart[]
  onSchliessen: () => void
}) {
  const [personId, setPersonId] = useState<number | ''>('')
  const [beginn1, setBeginn1] = useState('08:00')
  const [ende1, setEnde1] = useState('14:00')
  const [beginn2, setBeginn2] = useState('')
  const [ende2, setEnde2] = useState('')
  const [pause, setPause] = useState(0.5)
  const [zusatzTage, setZusatzTage] = useState<Set<number>>(new Set())
  const [notiz, setNotiz] = useState('')

  const abwesenheitAmTag = (mitarbeiterId: number) => abwesenheiten.find((a) => a.mitarbeiterId === mitarbeiterId && a.datum === datum)

  const b1 = parseZeit(beginn1)
  const e1 = parseZeit(ende1)
  const gueltig = personId !== '' && b1 != null && e1 != null && e1 > b1

  async function anlegen() {
    if (!gueltig) return
    const alleTage = [datum, ...datenFuerWochentage(datum, zusatzTage)]
    const neue = alleTage.map((tag) => ({
      istVorlage: false,
      datum: tag,
      beginn1Minuten: b1!,
      ende1Minuten: e1!,
      beginn2Minuten: parseZeit(beginn2),
      ende2Minuten: parseZeit(ende2),
      pauseStunden: pause,
      mitarbeiterId: personId as number,
      gruppenSlot: gruppe.slot,
      notiz: notiz.trim() || undefined,
    }))
    await db.dienste.bulkAdd(neue)
    onSchliessen()
  }

  return (
    <Modal titel={`Neuer Dienst – ${formatDatum(datum)}`} onSchliessen={onSchliessen}>
      <label>
        Person
        <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))} autoFocus>
          <option value="">– wählen –</option>
          {mitarbeitende.map((m) => {
            const abw = abwesenheitAmTag(m.id!)
            return (
              <option key={m.id} value={m.id} disabled={!!abw}>
                {m.kuerzel} – {m.name}
                {abw ? ` (${abwesenheitsartInfo(abw.art).bezeichnung})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      {dienstarten.length > 0 && (
        <div className="feldanzeige">
          <span className="hinweis-klein">Schnellauswahl</span>
          <div className="dienstarten-knopfreihe">
            {dienstarten.map((da) => (
              <button
                key={da.id}
                type="button"
                onClick={() => {
                  setBeginn1(formatZeit(da.beginn1Minuten))
                  setEnde1(formatZeit(da.ende1Minuten))
                  setBeginn2(formatZeit(da.beginn2Minuten))
                  setEnde2(formatZeit(da.ende2Minuten))
                  setPause(da.pauseStunden)
                }}
              >
                {da.bezeichnung} · {formatZeit(da.beginn1Minuten)}–{formatZeit(da.ende1Minuten)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="formular-zeile">
        <label>
          Beginn 1
          <input type="time" value={beginn1} onChange={(e) => setBeginn1(e.target.value)} style={{ width: 110 }} />
        </label>
        <label>
          Ende 1
          <input type="time" value={ende1} onChange={(e) => setEnde1(e.target.value)} style={{ width: 110 }} />
        </label>
      </div>
      {e1 != null && b1 != null && e1 <= b1 && (
        <p className="fehler-text hinweis-klein">Ende muss nach dem Beginn liegen.</p>
      )}
      <div className="formular-zeile">
        <label>
          Beginn 2 (nur bei geteiltem Dienst)
          <input type="time" value={beginn2} onChange={(e) => setBeginn2(e.target.value)} style={{ width: 110 }} />
        </label>
        <label>
          Ende 2 (nur bei geteiltem Dienst)
          <input type="time" value={ende2} onChange={(e) => setEnde2(e.target.value)} style={{ width: 110 }} />
        </label>
      </div>
      <label>
        Pause (Std.)
        <input type="number" step={0.25} min={0} value={pause} onChange={(e) => setPause(Number(e.target.value))} style={{ width: 80 }} />
      </label>
      <label>
        Notiz (optional)
        <textarea
          rows={2}
          placeholder="z.B. übernimmt Bringdienst, Rückfrage bei Eltern …"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
        />
      </label>
      <WochentagAuswahl basisdatum={datum} auswahl={zusatzTage} setAuswahl={setZusatzTage} />
      <div className="modal-aktionen">
        <button onClick={onSchliessen}>Abbrechen</button>
        <button className="primaer" disabled={!gueltig} onClick={anlegen}>
          Anlegen
        </button>
      </div>
    </Modal>
  )
}

function DienstBearbeitenSheet({
  dienst,
  mitarbeitende,
  abwesenheiten,
  onSchliessen,
}: {
  dienst: Dienst
  mitarbeitende: Mitarbeiter[]
  abwesenheiten: Abwesenheit[]
  onSchliessen: () => void
}) {
  const woche = wocheninfo(dienst.datum)
  const [personId, setPersonId] = useState<number | ''>(dienst.mitarbeiterId ?? '')
  const [datum, setDatum] = useState(dienst.datum)
  const abwesenheitAmTag = (mitarbeiterId: number) => abwesenheiten.find((a) => a.mitarbeiterId === mitarbeiterId && a.datum === datum)
  const [beginn1, setBeginn1] = useState(formatZeit(dienst.beginn1Minuten))
  const [ende1, setEnde1] = useState(formatZeit(dienst.ende1Minuten))
  const [beginn2, setBeginn2] = useState(formatZeit(dienst.beginn2Minuten))
  const [ende2, setEnde2] = useState(formatZeit(dienst.ende2Minuten))
  const [pause, setPause] = useState(dienst.pauseStunden)
  const [kopierTage, setKopierTage] = useState<Set<number>>(new Set())
  const [notiz, setNotiz] = useState(dienst.notiz ?? '')

  const b1 = parseZeit(beginn1)
  const e1 = parseZeit(ende1)
  const zeitenGueltig = b1 != null && e1 != null && e1 > b1

  const netto = dienstNetto({
    ...dienst,
    beginn1Minuten: b1 ?? dienst.beginn1Minuten,
    ende1Minuten: e1 ?? dienst.ende1Minuten,
    beginn2Minuten: parseZeit(beginn2),
    ende2Minuten: parseZeit(ende2),
    pauseStunden: pause,
  })

  async function speichern() {
    if (!zeitenGueltig) return
    const aenderungen: Partial<Dienst> = {
      mitarbeiterId: personId === '' ? null : (personId as number),
      datum,
      pauseStunden: pause,
      beginn1Minuten: b1,
      ende1Minuten: e1,
      beginn2Minuten: parseZeit(beginn2),
      ende2Minuten: parseZeit(ende2),
      notiz: notiz.trim() || undefined,
    }
    await db.dienste.update(dienst.id!, aenderungen)

    if (kopierTage.size > 0) {
      const zielTage = datenFuerWochentage(dienst.datum, kopierTage)
      const kopien = zielTage.map((tag) => ({
        istVorlage: false,
        datum: tag,
        beginn1Minuten: aenderungen.beginn1Minuten ?? dienst.beginn1Minuten,
        ende1Minuten: aenderungen.ende1Minuten ?? dienst.ende1Minuten,
        beginn2Minuten: aenderungen.beginn2Minuten ?? null,
        ende2Minuten: aenderungen.ende2Minuten ?? null,
        pauseStunden: pause,
        mitarbeiterId: aenderungen.mitarbeiterId ?? dienst.mitarbeiterId,
        gruppenSlot: dienst.gruppenSlot,
        notiz: aenderungen.notiz,
      }))
      await db.dienste.bulkAdd(kopien)
    }
    onSchliessen()
  }

  async function loeschen() {
    await db.dienste.delete(dienst.id!)
    onSchliessen()
  }

  return (
    <Modal titel="Dienst bearbeiten" onSchliessen={onSchliessen}>
      <label>
        Person
        <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">– keine –</option>
          {mitarbeitende.map((m) => {
            const ausgeschieden = !istAktiv(m)
            const abw = abwesenheitAmTag(m.id!)
            const istAktuellePerson = m.id === dienst.mitarbeiterId
            return (
              <option key={m.id} value={m.id} disabled={(ausgeschieden || !!abw) && !istAktuellePerson}>
                {m.kuerzel} – {m.name}
                {ausgeschieden ? ' (ausgeschieden)' : abw ? ` (${abwesenheitsartInfo(abw.art).bezeichnung})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      <label>
        Tag
        <select value={datum} onChange={(e) => setDatum(e.target.value)}>
          {woche.alleTage.map((tag) => (
            <option key={tag} value={tag}>
              {wochentagKurz(tag)}, {formatDatum(tag)}
            </option>
          ))}
        </select>
        <span className="hinweis-klein">
          Tipp: Dienstkarten im Wochenplan lassen sich auch mit der Maus auf einen anderen Tag ziehen.
        </span>
      </label>
      <div className="formular-zeile">
        <label>
          Beginn 1
          <input type="time" value={beginn1} onChange={(e) => setBeginn1(e.target.value)} style={{ width: 110 }} />
        </label>
        <label>
          Ende 1
          <input type="time" value={ende1} onChange={(e) => setEnde1(e.target.value)} style={{ width: 110 }} />
        </label>
      </div>
      {!zeitenGueltig && (
        <p className="fehler-text hinweis-klein">Ende muss nach dem Beginn liegen.</p>
      )}
      <div className="formular-zeile">
        <label>
          Beginn 2 (nur bei geteiltem Dienst)
          <input type="time" value={beginn2} onChange={(e) => setBeginn2(e.target.value)} style={{ width: 110 }} />
        </label>
        <label>
          Ende 2 (nur bei geteiltem Dienst)
          <input type="time" value={ende2} onChange={(e) => setEnde2(e.target.value)} style={{ width: 110 }} />
        </label>
      </div>
      <label>
        Pause (Std.)
        <input type="number" step={0.25} min={0} value={pause} onChange={(e) => setPause(Number(e.target.value))} style={{ width: 80 }} />
      </label>
      <div className="feldanzeige">
        <span className="hinweis-klein">Netto-Stunden</span>
        <strong>{stundenText(netto)}</strong>
      </div>
      <label>
        Notiz (optional)
        <textarea
          rows={2}
          placeholder="z.B. übernimmt Bringdienst, Rückfrage bei Eltern …"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
        />
      </label>
      <WochentagAuswahl basisdatum={dienst.datum} auswahl={kopierTage} setAuswahl={setKopierTage} />
      {kopierTage.size > 0 && (
        <p className="hinweis-klein">
          Beim Speichern wird der Dienst zusätzlich auf den ausgewählten Tagen angelegt (Person und Zeiten werden
          kopiert).
        </p>
      )}
      <div className="modal-aktionen">
        <button className="gefahr" onClick={loeschen}>
          Löschen
        </button>
        <span className="spacer" />
        <button onClick={onSchliessen}>Abbrechen</button>
        <button className="primaer" disabled={!zeitenGueltig} onClick={speichern}>
          Speichern
        </button>
      </div>
    </Modal>
  )
}

function AbwesenheitNeuSheet({
  datum,
  mitarbeitende,
  abwesenheiten,
  dienste,
  gruppeNachSlot,
  onSchliessen,
}: {
  datum: string
  mitarbeitende: Mitarbeiter[]
  abwesenheiten: Abwesenheit[]
  dienste: Dienst[]
  gruppeNachSlot: Map<number, Gruppe>
  onSchliessen: () => void
}) {
  const [personId, setPersonId] = useState<number | ''>('')
  const [art, setArt] = useState<Abwesenheitsart>('U')
  const [bemerkung, setBemerkung] = useState('')

  const bereitsAbwesend = (mitarbeiterId: number) => abwesenheiten.find((a) => a.mitarbeiterId === mitarbeiterId && a.datum === datum)
  const kollidierendeDienste =
    personId !== '' ? dienste.filter((d) => !d.istVorlage && d.mitarbeiterId === personId && d.datum === datum) : []
  const gueltig = personId !== '' && !bereitsAbwesend(personId as number)

  async function speichern() {
    if (!gueltig) return
    await db.abwesenheiten.add({ datum, art, bemerkung, mitarbeiterId: personId as number })
    onSchliessen()
  }

  return (
    <Modal titel={`Abwesenheit eintragen – ${formatDatum(datum)}`} onSchliessen={onSchliessen}>
      <label>
        Person
        <select value={personId} onChange={(e) => setPersonId(e.target.value === '' ? '' : Number(e.target.value))} autoFocus>
          <option value="">– wählen –</option>
          {mitarbeitende.map((m) => {
            const abw = bereitsAbwesend(m.id!)
            return (
              <option key={m.id} value={m.id} disabled={!!abw}>
                {m.kuerzel} – {m.name}
                {abw ? ` (bereits: ${abwesenheitsartInfo(abw.art).bezeichnung})` : ''}
              </option>
            )
          })}
        </select>
      </label>
      <label>
        Art
        <select value={art} onChange={(e) => setArt(e.target.value as Abwesenheitsart)}>
          {ABWESENHEITSARTEN.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} – {a.bezeichnung}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bemerkung
        <input type="text" placeholder="optional" value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} />
      </label>
      {kollidierendeDienste.length > 0 && (
        <p className="fehler-text hinweis-klein">
          Achtung: Für diese Person ist an diesem Tag noch{' '}
          {kollidierendeDienste.length === 1 ? 'ein Dienst' : `${kollidierendeDienste.length} Dienste`} eingetragen (
          {kollidierendeDienste
            .map((d) => `${d.gruppenSlot != null ? gruppeNachSlot.get(d.gruppenSlot)?.name ?? '?' : '?'} ${formatZeit(d.beginn1Minuten)}–${formatZeit(d.ende1Minuten)}`)
            .join(', ')}
          ) – die Abwesenheit wird trotzdem gespeichert, den Dienst bitte anschließend im Wochenplan selbst prüfen und
          bei Bedarf löschen.
        </p>
      )}
      <p className="hinweis-klein">
        Nur für diesen einen Tag. Für einen ganzen Zeitraum (z.B. eine Urlaubswoche) eignet sich der Bereich
        „Abwesenheiten" besser.
      </p>
      <div className="modal-aktionen">
        <button onClick={onSchliessen}>Abbrechen</button>
        <button className="primaer" disabled={!gueltig} onClick={speichern}>
          Speichern
        </button>
      </div>
    </Modal>
  )
}
