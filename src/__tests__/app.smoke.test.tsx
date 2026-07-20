import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { BEREICHE } from '../lib/bereiche'

describe('App – Rauchtest', () => {
  it('lädt und zeigt alle Bereiche der Seitenleiste ohne Absturz an', async () => {
    // Alle Sidebar-Gruppen aufgeklappt, damit der Test unabhängig vom
    // Standard-Einklapp-Zustand jeden Menüpunkt findet.
    localStorage.setItem('kitaplan.sidebarEingeklappt', JSON.stringify({}))
    render(<App />)

    // Ladezustand (Seed + Snapshot) muss durchlaufen.
    await waitFor(() => expect(screen.getByText('Personal')).toBeTruthy(), { timeout: 5000 })

    for (const bereich of BEREICHE) {
      const knopf = screen.getAllByText(bereich.label).find((el) => el.tagName === 'BUTTON')
      expect(knopf, `Sidebar-Eintrag „${bereich.label}" fehlt`).toBeTruthy()
      fireEvent.click(knopf!)
      // Nach dem Klick sollte die App nicht abstürzen – ein beliebiges,
      // für jede Ansicht vorhandenes Element (die Sidebar) muss weiter da sein.
      await waitFor(() => expect(screen.getByText('Kitaplan Birke')).toBeTruthy())
    }
  })
})
