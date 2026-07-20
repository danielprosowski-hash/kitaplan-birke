import { useEffect, useRef, useState } from 'react'

/** Blendet kurz ein "Gespeichert"-Feedback ein, nachdem eine Aktion
 * ausgelöst wurde. Für Formulare, die ohne expliziten Speichern-Knopf
 * bei jeder Eingabe direkt in die Datenbank schreiben. */
export function useSpeicherFeedback(dauerMs = 1400) {
  const [sichtbar, setSichtbar] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  function ausloesen() {
    setSichtbar(true)
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setSichtbar(false), dauerMs)
  }

  return { sichtbar, ausloesen }
}
