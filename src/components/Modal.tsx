import type { ReactNode } from 'react'

export default function Modal({
  titel,
  onSchliessen,
  children,
  breit = false,
}: {
  titel: string
  onSchliessen: () => void
  children: ReactNode
  breit?: boolean
}) {
  return (
    <div className="modal-hintergrund" onMouseDown={(e) => e.target === e.currentTarget && onSchliessen()}>
      <div className={`modal${breit ? ' modal-breit' : ''}`}>
        <div className="modal-kopf">
          <h2>{titel}</h2>
          <button className="iconbutton" onClick={onSchliessen} aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="modal-inhalt">{children}</div>
      </div>
    </div>
  )
}
