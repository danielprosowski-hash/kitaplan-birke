export default function SpeicherAnzeige({ sichtbar }: { sichtbar: boolean }) {
  return (
    <span className={`speicher-anzeige${sichtbar ? ' sichtbar' : ''}`} aria-live="polite">
      ✓ Gespeichert
    </span>
  )
}
