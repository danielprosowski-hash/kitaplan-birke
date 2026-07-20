export type Bereich =
  | 'personal'
  | 'gruppen'
  | 'dienstarten'
  | 'feiertage'
  | 'abwesenheiten'
  | 'kalender'
  | 'wochenplan'
  | 'wochenuebersicht'
  | 'abdeckung'
  | 'istzeiten'
  | 'abrechnung'
  | 'einstellungen'

export interface BereichInfo {
  id: Bereich
  label: string
  gruppe: 'Stammdaten' | 'Planung' | 'Auswertung' | 'System'
}

export const BEREICHE: BereichInfo[] = [
  { id: 'personal', label: 'Personal', gruppe: 'Stammdaten' },
  { id: 'gruppen', label: 'Gruppen', gruppe: 'Stammdaten' },
  { id: 'dienstarten', label: 'Dienstarten', gruppe: 'Stammdaten' },
  { id: 'feiertage', label: 'Feiertage', gruppe: 'Stammdaten' },
  { id: 'abwesenheiten', label: 'Abwesenheiten', gruppe: 'Stammdaten' },
  { id: 'kalender', label: 'Kalender', gruppe: 'Planung' },
  { id: 'wochenplan', label: 'Wochenplan', gruppe: 'Planung' },
  { id: 'wochenuebersicht', label: 'Wochenübersicht', gruppe: 'Planung' },
  { id: 'abdeckung', label: 'Abdeckung', gruppe: 'Planung' },
  { id: 'istzeiten', label: 'Ist-Zeiten', gruppe: 'Auswertung' },
  { id: 'abrechnung', label: 'Abrechnung', gruppe: 'Auswertung' },
  { id: 'einstellungen', label: 'Backup & Einstellungen', gruppe: 'System' },
]
