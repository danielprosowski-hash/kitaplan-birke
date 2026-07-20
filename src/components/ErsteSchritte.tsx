import type { Bereich } from '../lib/bereiche'

interface Props {
  gruppeAktiv: boolean
  personalVorhanden: boolean
  dienstVorhanden: boolean
  onWechsel: (b: Bereich) => void
  onAusblenden: () => void
}

/** Kurzer Einstiegs-Hinweis, damit man beim allerersten Öffnen nicht vor
 * einer leeren „Bitte Gruppe wählen"-Meldung im Wochenplan steht, ohne zu
 * wissen, wo man anfangen soll. */
export default function ErsteSchritte({ gruppeAktiv, personalVorhanden, dienstVorhanden, onWechsel, onAusblenden }: Props) {
  return (
    <div className="karte erste-schritte no-print">
      <div className="erste-schritte-kopf">
        <strong>Erste Schritte</strong>
        <button className="linkbutton" onClick={onAusblenden}>
          Ausblenden
        </button>
      </div>
      <ol className="erste-schritte-liste">
        <li className={gruppeAktiv ? 'erledigt' : ''}>
          <span>{gruppeAktiv ? '✓' : '1'}</span>
          <span>
            Mindestens eine Gruppe aktivieren (Typ und Mindestbesetzung festlegen).{' '}
            <button className="linkbutton" onClick={() => onWechsel('gruppen')}>
              Zu Gruppen
            </button>
          </span>
        </li>
        <li className={personalVorhanden ? 'erledigt' : ''}>
          <span>{personalVorhanden ? '✓' : '2'}</span>
          <span>
            Mitarbeitende anlegen (Kürzel, Wochenstunden, Stammgruppe).{' '}
            <button className="linkbutton" onClick={() => onWechsel('personal')}>
              Zu Personal
            </button>
          </span>
        </li>
        <li className={dienstVorhanden ? 'erledigt' : ''}>
          <span>{dienstVorhanden ? '✓' : '3'}</span>
          <span>
            Im Wochenplan die Gruppe wählen und die ersten Dienste eintragen.{' '}
            <button className="linkbutton" onClick={() => onWechsel('wochenplan')}>
              Zum Wochenplan
            </button>
          </span>
        </li>
      </ol>
    </div>
  )
}
