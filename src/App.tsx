import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import { DruckProvider } from './components/DruckContext'
import type { Bereich } from './lib/bereiche'
import { seedWennNoetig } from './db/seed'
import { taeglichenSnapshotWennNoetig, sicherungFaellig } from './db/backup'
import PersonalView from './components/PersonalView'
import GruppenView from './components/GruppenView'
import FeiertageView from './components/FeiertageView'
import AbwesenheitenView from './components/AbwesenheitenView'
import KalenderView from './components/KalenderView'
import WochenplanView from './components/WochenplanView'
import WochenuebersichtView from './components/WochenuebersichtView'
import AbdeckungView from './components/AbdeckungView'
import IstZeitenView from './components/IstZeitenView'
import AbrechnungView from './components/AbrechnungView'
import EinstellungenView from './components/EinstellungenView'

export default function App() {
  const [bereich, setBereich] = useState<Bereich>('personal')
  const [bereit, setBereit] = useState(false)
  const [faellig, setFaellig] = useState(false)

  useEffect(() => {
    ;(async () => {
      await seedWennNoetig()
      await taeglichenSnapshotWennNoetig()
      setFaellig(sicherungFaellig())
      setBereit(true)
    })()
  }, [])

  if (!bereit) {
    return (
      <div className="lade-anzeige">
        <p>KitaPlan wird geladen …</p>
      </div>
    )
  }

  return (
    <DruckProvider>
      <div className="app-shell" id="app-root">
        <Sidebar aktiv={bereich} onWechsel={setBereich} sicherungFaellig={faellig} />
        <main className="app-inhalt no-print">
          {faellig && bereich !== 'einstellungen' && (
            <div className="hinweisbanner">
              Die letzte heruntergeladene Sicherung ist eine Weile her (oder wurde noch nie erstellt).{' '}
              <button className="linkbutton" onClick={() => setBereich('einstellungen')}>
                Jetzt sichern
              </button>
            </div>
          )}
          {bereich === 'personal' && <PersonalView />}
          {bereich === 'gruppen' && <GruppenView />}
          {bereich === 'feiertage' && <FeiertageView />}
          {bereich === 'abwesenheiten' && <AbwesenheitenView />}
          {bereich === 'kalender' && <KalenderView />}
          {bereich === 'wochenplan' && <WochenplanView />}
          {bereich === 'wochenuebersicht' && <WochenuebersichtView />}
          {bereich === 'abdeckung' && <AbdeckungView />}
          {bereich === 'istzeiten' && <IstZeitenView />}
          {bereich === 'abrechnung' && <AbrechnungView />}
          {bereich === 'einstellungen' && (
            <EinstellungenView onGeaendert={() => setFaellig(sicherungFaellig())} />
          )}
        </main>
      </div>
    </DruckProvider>
  )
}
