/** Kleines Birken-Icon fürs App-Logo (passend zum Favicon in public/favicon.svg). */
export default function BirkeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#5c9a63" />
      <rect x="28.5" y="14" width="7" height="42" rx="3.2" fill="#f6f1e6" />
      <g stroke="#2e2b26" strokeWidth="2" strokeLinecap="round">
        <path d="M29 21.5h3.4" />
        <path d="M31.4 29 35 29.6" />
        <path d="M29 37.4h3.6" />
        <path d="M31.2 45.4 34.9 46" />
      </g>
    </svg>
  )
}
