import Dexie, { type Table } from 'dexie'
import type {
  Mitarbeiter,
  Gruppe,
  Feiertag,
  Abwesenheit,
  Dienst,
  IstZeit,
  Randdienst,
  KalenderEintrag,
} from '../types'

export interface Snapshot {
  id?: number
  erstelltAm: string // ISO-Zeitstempel
  json: string
}

export interface Einstellungen {
  id?: number
  bundesland: string // Code aus BUNDESLAENDER, steuert die automatische Feiertagsberechnung
}

/**
 * IndexedDB-Datenbank der App (über Dexie). Jede Änderung wird sofort
 * persistiert – das entspricht dem SwiftData-Store der Mac-App, nur dass
 * hier der Browser statt der App-Sandbox der Speicherort ist.
 */
class KitaPlanDB extends Dexie {
  mitarbeiter!: Table<Mitarbeiter, number>
  gruppen!: Table<Gruppe, number>
  feiertage!: Table<Feiertag, number>
  abwesenheiten!: Table<Abwesenheit, number>
  dienste!: Table<Dienst, number>
  istZeiten!: Table<IstZeit, number>
  randdienste!: Table<Randdienst, number>
  kalender!: Table<KalenderEintrag, number>
  snapshots!: Table<Snapshot, number>
  einstellungen!: Table<Einstellungen, number>

  constructor() {
    super('KitaPlanDB')
    this.version(1).stores({
      mitarbeiter: '++id, kuerzel, reihenfolge, name',
      gruppen: '++id, &slot',
      feiertage: '++id, &datum',
      abwesenheiten: '++id, datum, mitarbeiterId',
      dienste: '++id, datum, mitarbeiterId, gruppenSlot, istVorlage',
      istZeiten: '++id, datum, mitarbeiterId',
      randdienste: '++id, &beginnMinuten, reihenfolge',
      kalender: '++id, datum, mitarbeiterId',
      snapshots: '++id, erstelltAm',
    })
    this.version(2).stores({
      einstellungen: '++id',
    })
  }
}

export const db = new KitaPlanDB()

export const DATENTABELLEN = [
  'mitarbeiter',
  'gruppen',
  'feiertage',
  'abwesenheiten',
  'dienste',
  'istZeiten',
  'randdienste',
  'kalender',
  'einstellungen',
] as const

export type Datentabelle = (typeof DATENTABELLEN)[number]
