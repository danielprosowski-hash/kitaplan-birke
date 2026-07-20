import { db } from './db'
import { berechneFeiertage } from '../lib/feiertage'

const STANDARD_BUNDESLAND = 'ST'

/** Beim ersten Start: acht Gruppen-Slots (inaktiv) und die sechs
 * Pflicht-Randdienste vorbefüllen, außerdem Einstellungen anlegen. */
export async function seedWennNoetig() {
  await seedGruppen()
  await seedRanddienste()
  await seedDienstarten()
  await seedEinstellungen()
  await feiertageFuerJahreSicherstellen()
}

async function seedGruppen() {
  const anzahl = await db.gruppen.count()
  if (anzahl > 0) return
  for (let slot = 1; slot <= 8; slot++) {
    await db.gruppen.add({
      slot,
      name: `Gruppe ${slot}`,
      mindestbesetzung: 1,
      typ: 'Kita',
      aktiv: false,
    })
  }
}

async function seedRanddienste() {
  const anzahl = await db.randdienste.count()
  if (anzahl > 0) return
  const liste: [number, string][] = [
    [6 * 60, 'Frühdienst 6:00'],
    [7 * 60, 'Frühdienst 7:00'],
    [15 * 60 + 30, 'Spätdienst 15:30'],
    [16 * 60, 'Spätdienst 16:00'],
    [16 * 60 + 15, 'Spätdienst 16:15'],
    [17 * 60, 'Spätdienst 17:00'],
  ]
  for (let i = 0; i < liste.length; i++) {
    const [beginnMinuten, bezeichnung] = liste[i]
    await db.randdienste.add({ beginnMinuten, bezeichnung, reihenfolge: i, aktiv: true })
  }
}

async function seedDienstarten() {
  const anzahl = await db.dienstarten.count()
  if (anzahl > 0) return
  const liste: [string, number, number, number][] = [
    ['Frühdienst', 6 * 60, 13 * 60 + 30, 0.5],
    ['Regeldienst', 8 * 60, 15 * 60, 0.5],
    ['Mitteldienst', 9 * 60, 16 * 60, 0.5],
    ['Spätdienst', 9 * 60 + 30, 17 * 60, 0.5],
  ]
  for (let i = 0; i < liste.length; i++) {
    const [bezeichnung, beginn1Minuten, ende1Minuten, pauseStunden] = liste[i]
    await db.dienstarten.add({
      bezeichnung,
      beginn1Minuten,
      ende1Minuten,
      beginn2Minuten: null,
      ende2Minuten: null,
      pauseStunden,
      reihenfolge: i,
    })
  }
}

async function seedEinstellungen() {
  const anzahl = await db.einstellungen.count()
  if (anzahl > 0) return
  await db.einstellungen.add({ bundesland: STANDARD_BUNDESLAND })
}

export async function aktuellesBundesland(): Promise<string> {
  const eintrag = await db.einstellungen.toCollection().first()
  return eintrag?.bundesland ?? STANDARD_BUNDESLAND
}

/** Ergänzt automatisch berechnete Feiertage für das laufende und das
 * nächste Jahr, ohne bereits vorhandene (auch manuell angelegte) Tage
 * zu verdoppeln. Wird bei jedem Start aufgerufen, damit die Feiertage nie
 * "auslaufen" (früher war nur 2026 fest hinterlegt). */
export async function feiertageFuerJahreSicherstellen(jahre?: number[]): Promise<number> {
  const bundesland = await aktuellesBundesland()
  const heuteJahr = new Date().getFullYear()
  const zielJahre = jahre ?? [heuteJahr, heuteJahr + 1]
  const vorhandeneDaten = new Set((await db.feiertage.toArray()).map((f) => f.datum))
  const neue: { datum: string; name: string; bundesland: string }[] = []
  for (const jahr of zielJahre) {
    for (const f of berechneFeiertage(jahr, bundesland)) {
      if (!vorhandeneDaten.has(f.datum)) {
        neue.push({ ...f, bundesland })
        vorhandeneDaten.add(f.datum)
      }
    }
  }
  if (neue.length > 0) await db.feiertage.bulkAdd(neue)
  return neue.length
}
