import type { Bereich } from '../lib/bereiche'

interface Props {
  onWechsel: (b: Bereich) => void
  gruppeAktiv: boolean
  personalVorhanden: boolean
  dienstVorhanden: boolean
}

/**
 * Der feste Ausgangspunkt der App: statt zwölf gleichberechtigten
 * Menüpunkten, aus denen man selbst erraten muss, wo man anfängt, zeigt
 * diese Seite den üblichen Ablauf als nummerierte Schritte mit direkten
 * Sprungknöpfen. Ersetzt die frühere, überall eingeblendete
 * "Erste Schritte"-Karte – die Einrichtung ist jetzt Teil von Schritt 1.
 */
export default function StartView({ onWechsel, gruppeAktiv, personalVorhanden, dienstVorhanden }: Props) {
  const einrichtungKomplett = gruppeAktiv && personalVorhanden && dienstVorhanden

  return (
    <div className="view">
      <div className="start-kopf">
        <img src="./logo.png" alt="" width={72} height={72} />
        <h1>Willkommen bei Kitaplan Birke</h1>
      </div>
      <p className="view-untertitel">
        So läuft die Planung normalerweise ab. Jeder Schritt führt direkt zum passenden Bereich – die Seitenleiste
        bleibt für den gezielten Zugriff daneben bestehen.
      </p>

      <div className="start-schritte">
        <div className="karte start-schritt">
          <span className="start-schritt-nummer">{einrichtungKomplett ? '✓' : '1'}</span>
          <div className="start-schritt-inhalt">
            <h3>Einmalig einrichten</h3>
            <p className="hinweis-klein">
              Gruppen aktivieren, Personal anlegen und die erste Woche im Wochenplan eintragen. Danach musst du das
              nicht mehr anfassen, außer es ändert sich etwas.
            </p>
            <ul className="start-schritt-checkliste">
              <li className={gruppeAktiv ? 'erledigt' : ''}>
                {gruppeAktiv ? '✓' : '–'} Mindestens eine Gruppe aktiv{' '}
                <button className="linkbutton" onClick={() => onWechsel('gruppen')}>
                  Zu Gruppen
                </button>
              </li>
              <li className={personalVorhanden ? 'erledigt' : ''}>
                {personalVorhanden ? '✓' : '–'} Mitarbeitende angelegt{' '}
                <button className="linkbutton" onClick={() => onWechsel('personal')}>
                  Zu Personal
                </button>
              </li>
              <li className={dienstVorhanden ? 'erledigt' : ''}>
                {dienstVorhanden ? '✓' : '–'} Erste Dienste eingetragen{' '}
                <button className="linkbutton" onClick={() => onWechsel('wochenplan')}>
                  Zum Wochenplan
                </button>
              </li>
            </ul>
            <p className="hinweis-klein" style={{ marginTop: 10 }}>
              Optional, aber empfohlen: Für jede Person einen{' '}
              <button className="linkbutton" onClick={() => onWechsel('rahmenplan')}>
                Rahmenplan
              </button>{' '}
              hinterlegen (fester Wochenrhythmus) – neue Wochen füllen sich damit von selbst.
            </p>
          </div>
        </div>

        <div className="karte start-schritt">
          <span className="start-schritt-nummer">2</span>
          <div className="start-schritt-inhalt">
            <h3>Laufend: Wünsche und Abwesenheiten erfassen</h3>
            <p className="hinweis-klein">
              Sobald jemand Urlaub beantragt, krank wird oder einen Termin hat: hier eintragen. Erscheint dann
              automatisch als Erinnerung im Wochenplan.
            </p>
            <div className="start-schritt-aktionen">
              <button onClick={() => onWechsel('kalender')}>Kalender (Wünsche/Termine)</button>
              <button onClick={() => onWechsel('abwesenheiten')}>Abwesenheiten (Urlaub/Krank)</button>
            </div>
          </div>
        </div>

        <div className="karte start-schritt">
          <span className="start-schritt-nummer">3</span>
          <div className="start-schritt-inhalt">
            <h3>Wöchentlich: Dienstplan schreiben</h3>
            <p className="hinweis-klein">
              Die Haupttätigkeit. Gruppe wählen, Dienste eintragen oder per Standard-Woche übernehmen – das
              Stundenkonto und alle Warnungen laufen direkt mit.
            </p>
            <div className="start-schritt-aktionen">
              <button className="primaer" onClick={() => onWechsel('wochenplan')}>
                Zum Wochenplan
              </button>
            </div>
          </div>
        </div>

        <div className="karte start-schritt">
          <span className="start-schritt-nummer">4</span>
          <div className="start-schritt-inhalt">
            <h3>Kontrollieren</h3>
            <p className="hinweis-klein">
              Vor dem Aushängen einmal gegenprüfen: Sind alle Gruppen einer Woche vollständig? Sind alle
              Früh-/Spätdienste besetzt?
            </p>
            <div className="start-schritt-aktionen">
              <button onClick={() => onWechsel('wochenuebersicht')}>Wochenübersicht</button>
              <button onClick={() => onWechsel('abdeckung')}>Abdeckung Randdienste</button>
            </div>
          </div>
        </div>

        <div className="karte start-schritt">
          <span className="start-schritt-nummer">5</span>
          <div className="start-schritt-inhalt">
            <h3>Am Monatsende: Abrechnen</h3>
            <p className="hinweis-klein">
              Tatsächliche Zeiten eintragen (falls abweichend vom Plan) und das Stundenkonto pro Person prüfen und
              als PDF exportieren.
            </p>
            <div className="start-schritt-aktionen">
              <button onClick={() => onWechsel('istzeiten')}>Ist-Zeiten</button>
              <button onClick={() => onWechsel('abrechnung')}>Abrechnung</button>
            </div>
          </div>
        </div>

        <div className="karte start-schritt">
          <span className="start-schritt-nummer">6</span>
          <div className="start-schritt-inhalt">
            <h3>Regelmäßig: Sichern</h3>
            <p className="hinweis-klein">
              Alle Daten liegen nur in diesem Browser. Eine Sicherungsdatei herunterladen und an einem sicheren Ort
              aufbewahren – die App erinnert daran, wenn es länger her ist.
            </p>
            <div className="start-schritt-aktionen">
              <button onClick={() => onWechsel('einstellungen')}>Backup & Einstellungen</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
