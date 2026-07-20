import { BEREICHE, type Bereich } from '../lib/bereiche'

interface Props {
  aktiv: Bereich
  onWechsel: (b: Bereich) => void
  sicherungFaellig: boolean
}

const GRUPPEN_REIHENFOLGE = ['Stammdaten', 'Planung', 'Auswertung', 'System'] as const

export default function Sidebar({ aktiv, onWechsel, sicherungFaellig }: Props) {
  return (
    <nav className="sidebar no-print">
      <div className="sidebar-titel">
        <span className="sidebar-logo">KP</span>
        <span>KitaPlan</span>
      </div>
      {GRUPPEN_REIHENFOLGE.map((gruppe) => (
        <div className="sidebar-gruppe" key={gruppe}>
          <div className="sidebar-gruppe-label">{gruppe}</div>
          {BEREICHE.filter((b) => b.gruppe === gruppe).map((b) => (
            <button
              key={b.id}
              className={`sidebar-eintrag${aktiv === b.id ? ' aktiv' : ''}`}
              onClick={() => onWechsel(b.id)}
            >
              {b.label}
              {b.id === 'einstellungen' && sicherungFaellig && (
                <span className="sidebar-warnpunkt" title="Sicherung fällig" />
              )}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
