// Zentrale Datentypen der App. Entspricht den SwiftData-Modellen der
// ursprünglichen macOS-App (Mitarbeiter, Gruppe, Feiertag, Abwesenheit,
// Dienst, IstZeit, Randdienst) plus dem neuen Kalender-Feature.

export type Funktion = 'Erzieher' | 'Azubi' | 'Leitung' | 'Springer' | 'Praktikant'
export const FUNKTIONEN: Funktion[] = ['Erzieher', 'Azubi', 'Leitung', 'Springer', 'Praktikant']

export type GruppenTyp = 'Krippe' | 'Kita'
export const GRUPPEN_TYPEN: GruppenTyp[] = ['Krippe', 'Kita']

export type Abwesenheitsart = 'U' | 'RT' | 'UWT' | 'K' | 'FB' | 'F' | 'Ue' | 'MZ' | 'EZ'

export interface AbwesenheitsartInfo {
  code: Abwesenheitsart
  bezeichnung: string
  grundlage: string
  schreibtSollAlsIstGut: boolean
}

export const ABWESENHEITSARTEN: AbwesenheitsartInfo[] = [
  { code: 'U', bezeichnung: 'Urlaub', grundlage: 'BUrlG', schreibtSollAlsIstGut: true },
  { code: 'RT', bezeichnung: 'Regenerationstag', grundlage: 'TVöD-SuE', schreibtSollAlsIstGut: true },
  { code: 'UWT', bezeichnung: 'Umwandlungstag', grundlage: 'TVöD-SuE', schreibtSollAlsIstGut: true },
  { code: 'K', bezeichnung: 'Krank', grundlage: 'EFZG', schreibtSollAlsIstGut: true },
  { code: 'FB', bezeichnung: 'Fortbildung', grundlage: 'Arbeitszeit', schreibtSollAlsIstGut: true },
  { code: 'F', bezeichnung: 'Frei', grundlage: 'intern', schreibtSollAlsIstGut: false },
  { code: 'Ue', bezeichnung: 'Überstundenabbau', grundlage: 'intern', schreibtSollAlsIstGut: false },
  { code: 'MZ', bezeichnung: 'Mutterschutz', grundlage: 'MuSchG', schreibtSollAlsIstGut: false },
  { code: 'EZ', bezeichnung: 'Elternzeit', grundlage: 'BEEG', schreibtSollAlsIstGut: false },
]

export function abwesenheitsartInfo(code: Abwesenheitsart): AbwesenheitsartInfo {
  return ABWESENHEITSARTEN.find((a) => a.code === code) ?? ABWESENHEITSARTEN[5]
}

// Kalender-Feature: Wünsche/Termine, die vorab eingetragen und beim
// Schreiben des Wochenplans als Erinnerung angezeigt werden.
export type KalenderKategorie = 'Urlaubswunsch' | 'Frei-Wunsch' | 'Termin' | 'Fortbildung' | 'Sonstiges'
export const KALENDER_KATEGORIEN: KalenderKategorie[] = [
  'Urlaubswunsch',
  'Frei-Wunsch',
  'Termin',
  'Fortbildung',
  'Sonstiges',
]

export const KALENDER_FARBEN: Record<KalenderKategorie, string> = {
  Urlaubswunsch: '#2f9e44',
  'Frei-Wunsch': '#1c7ed6',
  Termin: '#e8590c',
  Fortbildung: '#7048e8',
  Sonstiges: '#868e96',
}

export interface Mitarbeiter {
  id?: number
  kuerzel: string
  name: string
  funktion: Funktion
  wochenstunden: number
  beschaeftigtSeit: string // ISO-Datum (yyyy-MM-dd)
  stammgruppeSlot: number | null
  hinweise: string
  austrittsdatum: string | null
  reihenfolge: number
}

export interface Gruppe {
  id?: number
  slot: number
  name: string
  mindestbesetzung: number
  typ: GruppenTyp
  aktiv: boolean
}

export interface Feiertag {
  id?: number
  datum: string // ISO-Datum
  name: string
  bundesland: string
}

export interface Abwesenheit {
  id?: number
  datum: string
  art: Abwesenheitsart
  bemerkung: string
  mitarbeiterId: number
}

export interface Dienst {
  id?: number
  istVorlage: boolean
  datum: string
  beginn1Minuten: number
  ende1Minuten: number
  beginn2Minuten: number | null
  ende2Minuten: number | null
  pauseStunden: number
  mitarbeiterId: number | null
  gruppenSlot: number | null
}

export interface IstZeit {
  id?: number
  datum: string
  vonMinuten: number
  bisMinuten: number
  mitarbeiterId: number
}

export interface Randdienst {
  id?: number
  beginnMinuten: number
  bezeichnung: string
  reihenfolge: number
  aktiv: boolean
}

export interface KalenderEintrag {
  id?: number
  datum: string
  mitarbeiterId: number
  kategorie: KalenderKategorie
  bemerkung: string
  erledigt: boolean // wird gesetzt, wenn der Wunsch im Wochenplan berücksichtigt wurde
}
