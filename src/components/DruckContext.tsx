import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface DruckState {
  titel: string
  inhalt: ReactNode
  quer: boolean
}

interface DruckContextWert {
  oeffneDruck: (inhalt: ReactNode, titel: string, quer?: boolean) => void
}

const DruckContext = createContext<DruckContextWert | null>(null)

export function useDruck(): DruckContextWert {
  const ctx = useContext(DruckContext)
  if (!ctx) throw new Error('useDruck muss innerhalb von DruckProvider verwendet werden.')
  return ctx
}

export function DruckProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DruckState | null>(null)

  const oeffneDruck = (inhalt: ReactNode, titel: string, quer = true) => {
    setState({ inhalt, titel, quer })
  }

  // Setzt die Seitenausrichtung fürs Drucken passend zum jeweiligen Report
  // (Wochenaushang/Gesamtplan quer, Abrechnung/Auswertung hochkant).
  useEffect(() => {
    const styleId = 'druck-seitenformat'
    let style = document.getElementById(styleId) as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = `@page { size: A4 ${state?.quer ? 'landscape' : 'portrait'}; margin: 12mm; }`
  }, [state?.quer])

  return (
    <DruckContext.Provider value={{ oeffneDruck }}>
      {children}
      {state && (
        <div className={`print-overlay${state.quer ? ' quer' : ''}`}>
          <div className="print-toolbar no-print">
            <strong>{state.titel}</strong>
            <div className="print-toolbar-buttons">
              <button onClick={() => window.print()}>Drucken / Als PDF speichern</button>
              <button onClick={() => setState(null)}>Schließen</button>
            </div>
          </div>
          <div className="print-area">{state.inhalt}</div>
        </div>
      )}
    </DruckContext.Provider>
  )
}
