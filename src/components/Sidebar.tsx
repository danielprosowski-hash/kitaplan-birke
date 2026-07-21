import { useState } from 'react'
import { BEREICHE, type Bereich } from '../lib/bereiche'

interface Props {
  aktiv: Bereich
  onWechsel: (b: Bereich) => void
  sicherungFaellig: boolean
}

const GRUPPEN_REIHENFOLGE = ['Stammdaten', 'Planung', 'Auswertung', 'System'] as const
const LS_EINGEKLAPPT = 'kitaplan.sidebarEingeklappt'

// Standardmäßig ist nur "Planung" aufgeklappt – das ist der Bereich für die
// wöchentliche Arbeit. Die anderen Gruppen braucht man selten und sie
// würden sonst die Liste unnötig lang und unübersichtlich machen.
function initialEingeklappt(): Record<string, boolean> {
  const gespeichert = localStorage.getItem(LS_EINGEKLAPPT)
  if (gespeichert) {
    try {
      return JSON.parse(gespeichert)
    } catch {
      // ignorieren, Standard verwenden
    }
  }
  return { Stammdaten: true, Auswertung: true, System: true }
}

export default function Sidebar({ aktiv, onWechsel, sicherungFaellig }: Props) {
  const [eingeklappt, setEingeklappt] = useState<Record<string, boolean>>(initialEingeklappt)

  function umschalten(gruppe: string) {
    const neu = { ...eingeklappt, [gruppe]: !eingeklappt[gruppe] }
    setEingeklappt(neu)
    localStorage.setItem(LS_EINGEKLAPPT, JSON.stringify(neu))
  }

  return (
    <nav className="sidebar no-print">
      <div className="sidebar-titel">
        <span className="sidebar-logo">
          <img src="./logo.png" alt="" width={44} height={44} />
        </span>
        <span>Kitaplan Birke</span>
      </div>

      <button
        className={`sidebar-eintrag sidebar-start${aktiv === 'start' ? ' aktiv' : ''}`}
        onClick={() => onWechsel('start')}
      >
        ⌂ Start
      </button>

      {GRUPPEN_REIHENFOLGE.map((gruppe) => {
        const offen = !eingeklappt[gruppe]
        return (
          <div className="sidebar-gruppe" key={gruppe}>
            <button className="sidebar-gruppe-label sidebar-gruppe-klapper" onClick={() => umschalten(gruppe)}>
              <span>{offen ? '▾' : '▸'}</span> {gruppe}
            </button>
            {offen &&
              BEREICHE.filter((b) => b.gruppe === gruppe).map((b) => (
                <button
                  key={b.id}
                  className={`sidebar-eintrag${aktiv === b.id ? ' aktiv' : ''}`}
                  onClick={() => onWechsel(b.id)}
                  title={b.hinweis}
                >
                  {b.label}
                  {b.id === 'einstellungen' && sicherungFaellig && (
                    <span className="sidebar-warnpunkt" title="Sicherung fällig" />
                  )}
                </button>
              ))}
          </div>
        )
      })}
      <div className="sidebar-fusszeile">Erstellt von Daniel Prosowski</div>
    </nav>
  )
}
