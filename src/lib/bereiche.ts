export type Bereich =
  | 'start'
  | 'personal'
  | 'gruppen'
  | 'dienstarten'
  | 'rahmenplan'
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
  hinweis: string
}

// "start" ist bewusst nicht Teil dieser Liste – die Sidebar zeigt ihn separat
// und angeheftet oben, als festen Ausgangspunkt statt eines 13. Gruppeneintrags.
export const BEREICHE: BereichInfo[] = [
  { id: 'personal', label: 'Personal', gruppe: 'Stammdaten', hinweis: 'Mitarbeitende anlegen und verwalten' },
  { id: 'gruppen', label: 'Gruppen', gruppe: 'Stammdaten', hinweis: 'Kita-Gruppen aktivieren und Mindestbesetzung festlegen' },
  { id: 'dienstarten', label: 'Dienstarten', gruppe: 'Stammdaten', hinweis: 'Wiederkehrende Schichtmuster für die Schnellauswahl im Wochenplan' },
  { id: 'rahmenplan', label: 'Rahmenplan', gruppe: 'Stammdaten', hinweis: 'Fester Wochenplan pro Person – Basis für jede neue Woche' },
  { id: 'feiertage', label: 'Feiertage', gruppe: 'Stammdaten', hinweis: 'Feiertage prüfen und bei Bedarf ergänzen' },
  { id: 'abwesenheiten', label: 'Abwesenheiten', gruppe: 'Stammdaten', hinweis: 'Urlaub, Krankheit und andere Abwesenheiten erfassen' },
  { id: 'kalender', label: 'Kalender', gruppe: 'Planung', hinweis: 'Wünsche und Termine vorab eintragen, als Erinnerung im Wochenplan' },
  { id: 'wochenplan', label: 'Wochenplan', gruppe: 'Planung', hinweis: 'Dienste für die Woche eintragen – die Haupttätigkeit beim Planen' },
  { id: 'wochenuebersicht', label: 'Wochenübersicht', gruppe: 'Planung', hinweis: 'Alle Gruppen einer Woche auf einen Blick (nur Ansicht)' },
  { id: 'abdeckung', label: 'Abdeckung', gruppe: 'Planung', hinweis: 'Prüft, ob alle Früh-/Spätdienste besetzt sind' },
  { id: 'istzeiten', label: 'Ist-Zeiten', gruppe: 'Auswertung', hinweis: 'Tatsächlich geleistete Zeiten pro Person und Monat erfassen' },
  { id: 'abrechnung', label: 'Abrechnung', gruppe: 'Auswertung', hinweis: 'Stundenkonto pro Person, mit PDF-Export' },
  { id: 'einstellungen', label: 'Backup & Einstellungen', gruppe: 'System', hinweis: 'Daten sichern und wiederherstellen' },
]
