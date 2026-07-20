import { db } from './db'

/** Beim ersten Start: acht Gruppen-Slots (inaktiv), Feiertage 2026 (bundesweit)
 * und die sechs Pflicht-Randdienste vorbefüllen. */
export async function seedWennNoetig() {
  await seedGruppen()
  await seedFeiertage2026()
  await seedRanddienste()
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

async function seedFeiertage2026() {
  const anzahl = await db.feiertage.count()
  if (anzahl > 0) return
  const liste: [string, string][] = [
    ['2026-01-01', 'Neujahr'],
    ['2026-04-03', 'Karfreitag'],
    ['2026-04-06', 'Ostermontag'],
    ['2026-05-01', 'Tag der Arbeit'],
    ['2026-05-14', 'Christi Himmelfahrt'],
    ['2026-05-25', 'Pfingstmontag'],
    ['2026-10-03', 'Tag der Deutschen Einheit'],
    ['2026-12-25', '1. Weihnachtstag'],
    ['2026-12-26', '2. Weihnachtstag'],
  ]
  for (const [datum, name] of liste) {
    await db.feiertage.add({ datum, name, bundesland: 'bundesweit' })
  }
}
