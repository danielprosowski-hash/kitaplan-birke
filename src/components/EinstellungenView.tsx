import { useEffect, useRef, useState } from 'react'
import {
  downloadFaelligkeitTage,
  letzterDownloadAm,
  sicherungEinspielen,
  sicherungHerunterladen,
  snapshotJetzt,
  snapshotWiederherstellen,
  snapshotsListe,
} from '../db/backup'
import type { Snapshot } from '../db/db'

export default function EinstellungenView({ onGeaendert }: { onGeaendert: () => void }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [meldung, setMeldung] = useState<string | null>(null)
  const dateiInput = useRef<HTMLInputElement>(null)

  const laden = async () => setSnapshots(await snapshotsListe())
  useEffect(() => {
    laden()
  }, [])

  const letzterDownload = letzterDownloadAm()
  const faelligkeitTage = downloadFaelligkeitTage()

  async function jetztHerunterladen() {
    const dateiname = await sicherungHerunterladen()
    setMeldung(`Sicherung heruntergeladen: ${dateiname}`)
    onGeaendert()
  }

  async function zwischensicherung() {
    await snapshotJetzt()
    await laden()
    setMeldung('Interne Zwischensicherung erstellt.')
  }

  async function dateiAusgewaehlt(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0]
    if (!datei) return
    if (!confirm('Die eingespielte Sicherung ersetzt ALLE aktuellen Daten in dieser App. Fortfahren?')) {
      if (dateiInput.current) dateiInput.current.value = ''
      return
    }
    try {
      await sicherungEinspielen(datei)
      setMeldung('Sicherung erfolgreich eingespielt.')
      onGeaendert()
    } catch (err) {
      setMeldung(err instanceof Error ? err.message : 'Fehler beim Einspielen der Sicherung.')
    }
    if (dateiInput.current) dateiInput.current.value = ''
  }

  async function wiederherstellen(id: number) {
    if (!confirm('Diese interne Sicherung wiederherstellen? Der aktuelle Datenbestand wird ersetzt.')) return
    await snapshotWiederherstellen(id)
    setMeldung('Interne Sicherung wiederhergestellt.')
    onGeaendert()
  }

  return (
    <div className="view">
      <h1>Backup &amp; Einstellungen</h1>
      <p className="hinweis-klein" style={{ marginTop: -8, marginBottom: 18 }}>
        Kitaplan Birke · Erstellt von Daniel Prosowski ·{' '}
        <a href="./Bedienanleitung.pdf" target="_blank" rel="noreferrer">
          Kurzanleitung als PDF
        </a>
      </p>

      <div className="karte">
        <h3>Wo liegen die Daten?</h3>
        <p>
          Kitaplan Birke läuft vollständig im Browser. Alle Eingaben werden sofort lokal im Browser dieses Geräts
          gespeichert (IndexedDB) – es gibt keinen Server, an den Daten übertragen werden. Das funktioniert
          gleichermaßen unter Windows, macOS und Linux, in jedem aktuellen Browser (Chrome, Edge, Firefox).
        </p>
        <div className="hinweisbanner" style={{ marginTop: 12 }}>
          ⚠ Wichtig: Die Daten liegen ausschließlich in diesem Browser auf diesem Gerät. Ein Klick auf
          „Browserdaten/Cookies löschen" im Browser, ein Browserwechsel oder ein neues Gerät leert den Dienstplan
          vollständig – ohne Sicherung unwiederbringlich. Personaldaten (Krankheit, Urlaub) sind DSGVO-sensibel –
          lade die Sicherungsdatei nur an einem geschützten Ort ab.
        </div>
      </div>

      <div className="karte">
        <h3>Sicherung herunterladen (empfohlen)</h3>
        <p>
          Das ist die wichtigste Sicherung: eine JSON-Datei mit dem kompletten Datenbestand, die du selbst
          aufbewahrst – am besten in einem Cloud-Ordner (iCloud, OneDrive) oder auf einem USB-Stick.
        </p>
        <p>
          Letzte heruntergeladene Sicherung:{' '}
          <strong>{letzterDownload ? letzterDownload.toLocaleString('de-DE') : 'noch nie'}</strong>
          {faelligkeitTage != null && faelligkeitTage >= 7 && (
            <span className="fehler-text"> · seit {faelligkeitTage} Tagen fällig</span>
          )}
        </p>
        <div className="modal-aktionen" style={{ justifyContent: 'flex-start' }}>
          <button className="primaer" onClick={jetztHerunterladen}>
            Sicherung jetzt herunterladen
          </button>
          <button onClick={() => dateiInput.current?.click()}>Sicherung einspielen …</button>
          <input ref={dateiInput} type="file" accept="application/json" hidden onChange={dateiAusgewaehlt} />
        </div>
      </div>

      <div className="karte">
        <h3>Interne Versionshistorie</h3>
        <p className="hinweis-klein">
          Zusätzliches Sicherheitsnetz: einmal täglich beim Öffnen der App wird automatisch eine Zwischensicherung
          in der Browser-Datenbank abgelegt (30 Tage aufbewahrt). Ersetzt NICHT die heruntergeladene Sicherung –
          sie hilft nur bei Fehlbedienung innerhalb dieses Browsers.
        </p>
        <button onClick={zwischensicherung}>Zwischensicherung jetzt erstellen</button>
        {snapshots.length === 0 ? (
          <p className="hinweis-klein" style={{ marginTop: 12 }}>
            Noch keine Zwischensicherung vorhanden.
          </p>
        ) : (
          <table className="tabelle" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Erstellt am</th>
                <th style={{ width: 160 }} />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.erstelltAm).toLocaleString('de-DE')}</td>
                  <td>
                    <button onClick={() => wiederherstellen(s.id!)}>Wiederherstellen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meldung && <p className="erfolg-text">{meldung}</p>}
    </div>
  )
}
