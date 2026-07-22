import { db, DATENTABELLEN, type Datentabelle } from './db'

const AUFBEWAHRUNGSTAGE = 30
const LS_LETZTER_DOWNLOAD = 'kitaplan.letzterJsonDownload'
const LS_LETZTES_SNAPSHOT = 'kitaplan.letztesSnapshot'

export interface Sicherungsdatei {
  format: 'kitaplan-sicherung'
  version: 1
  erstelltAm: string
  daten: Record<Datentabelle, unknown[]>
}

async function alleDatenSammeln(): Promise<Record<Datentabelle, unknown[]>> {
  const eintraege = await Promise.all(DATENTABELLEN.map((tabelle) => db.table(tabelle).toArray()))
  const ergebnis = {} as Record<Datentabelle, unknown[]>
  DATENTABELLEN.forEach((tabelle, i) => {
    ergebnis[tabelle] = eintraege[i]
  })
  return ergebnis
}

/** Baut die Sicherungsdatei (JSON) aus dem aktuellen Datenbestand. */
export async function sicherungErstellen(): Promise<Sicherungsdatei> {
  return {
    format: 'kitaplan-sicherung',
    version: 1,
    erstelltAm: new Date().toISOString(),
    daten: await alleDatenSammeln(),
  }
}

/** Erstellt die JSON-Sicherung und stößt den Download im Browser an. */
export async function sicherungHerunterladen(): Promise<string> {
  const sicherung = await sicherungErstellen()
  const json = JSON.stringify(sicherung, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stempel = sicherung.erstelltAm.slice(0, 16).replace(/[-:]/g, '').replace('T', '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `kitaplan_sicherung_${stempel}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  localStorage.setItem(LS_LETZTER_DOWNLOAD, new Date().toISOString())
  return a.download
}

/** Prüft eine eingelesene (potenziell manipulierte) Sicherungsdatei, bevor
 * ihr Inhalt in die Datenbank geschrieben wird: korrektes Format, und pro
 * Tabelle entweder gar keine Angabe (ältere Sicherung) oder ein Array aus
 * einfachen Objekten – keine Strings, Funktionen, verschachtelten Arrays
 * o.ä. Verhindert, dass eine absichtlich kaputte Datei beliebige Werte in
 * die App-Datenbank einschleust. */
function istGueltigeSicherung(wert: unknown): wert is Sicherungsdatei {
  if (typeof wert !== 'object' || wert === null) return false
  const obj = wert as Record<string, unknown>
  if (obj.format !== 'kitaplan-sicherung') return false
  if (typeof obj.erstelltAm !== 'string') return false
  if (typeof obj.daten !== 'object' || obj.daten === null) return false
  const daten = obj.daten as Record<string, unknown>
  for (const tabelle of DATENTABELLEN) {
    const zeilen = daten[tabelle]
    if (zeilen === undefined) continue
    if (!Array.isArray(zeilen)) return false
    const alleGueltig = zeilen.every(
      (zeile) => typeof zeile === 'object' && zeile !== null && !Array.isArray(zeile),
    )
    if (!alleGueltig) return false
  }
  return true
}

/** Spielt eine zuvor heruntergeladene Sicherungsdatei zurück.
 * Ersetzt IMMER den kompletten aktuellen Datenbestand. */
export async function sicherungEinspielen(datei: File): Promise<void> {
  const text = await datei.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Die Datei lässt sich nicht lesen – das ist kein gültiges JSON.')
  }
  if (!istGueltigeSicherung(parsed)) {
    throw new Error('Das ist keine gültige Kitaplan-Birke-Sicherungsdatei.')
  }
  await db.transaction('rw', DATENTABELLEN.map((t) => db.table(t)), async () => {
    for (const tabelle of DATENTABELLEN) {
      await db.table(tabelle).clear()
      const zeilen = parsed.daten[tabelle] ?? []
      if (zeilen.length > 0) await db.table(tabelle).bulkAdd(zeilen)
    }
  })
}

/** Interne Versionshistorie: legt einmal pro Tag automatisch (und jederzeit
 * manuell) einen Snapshot in der Datenbank an. Dient als Sicherheitsnetz
 * gegen Fehlbedienung, ersetzt aber NICHT die heruntergeladene Sicherung. */
export async function snapshotJetzt(): Promise<void> {
  const sicherung = await sicherungErstellen()
  await db.snapshots.add({ erstelltAm: sicherung.erstelltAm, json: JSON.stringify(sicherung) })
  localStorage.setItem(LS_LETZTES_SNAPSHOT, sicherung.erstelltAm)
  await snapshotsAufraeumen()
}

export async function taeglichenSnapshotWennNoetig(): Promise<void> {
  const letzt = localStorage.getItem(LS_LETZTES_SNAPSHOT)
  if (letzt) {
    const heute = new Date().toDateString()
    if (new Date(letzt).toDateString() === heute) return
  }
  await snapshotJetzt()
}

async function snapshotsAufraeumen(): Promise<void> {
  const grenze = Date.now() - AUFBEWAHRUNGSTAGE * 24 * 3600 * 1000
  const alte = await db.snapshots.filter((s) => new Date(s.erstelltAm).getTime() < grenze).toArray()
  await db.snapshots.bulkDelete(alte.map((s) => s.id!).filter((id) => id != null))
}

export async function snapshotsListe() {
  return db.snapshots.orderBy('erstelltAm').reverse().toArray()
}

export async function snapshotWiederherstellen(id: number): Promise<void> {
  const snap = await db.snapshots.get(id)
  if (!snap) throw new Error('Sicherung nicht gefunden.')
  let parsed: unknown
  try {
    parsed = JSON.parse(snap.json)
  } catch {
    throw new Error('Diese interne Sicherung ist beschädigt und lässt sich nicht lesen.')
  }
  if (!istGueltigeSicherung(parsed)) {
    throw new Error('Diese interne Sicherung ist beschädigt oder ungültig.')
  }
  await db.transaction('rw', DATENTABELLEN.map((t) => db.table(t)), async () => {
    for (const tabelle of DATENTABELLEN) {
      await db.table(tabelle).clear()
      const zeilen = parsed.daten[tabelle] ?? []
      if (zeilen.length > 0) await db.table(tabelle).bulkAdd(zeilen)
    }
  })
}

export function letzterDownloadAm(): Date | null {
  const wert = localStorage.getItem(LS_LETZTER_DOWNLOAD)
  return wert ? new Date(wert) : null
}

export function downloadFaelligkeitTage(): number | null {
  const letzt = letzterDownloadAm()
  if (!letzt) return null
  return Math.floor((Date.now() - letzt.getTime()) / (24 * 3600 * 1000))
}

/** true, wenn seit > 7 Tagen keine Sicherung heruntergeladen wurde
 * (oder noch nie eine). Steuert die Erinnerung im UI. */
export function sicherungFaellig(): boolean {
  const tage = downloadFaelligkeitTage()
  return tage === null || tage >= 7
}
