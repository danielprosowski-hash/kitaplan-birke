import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sidebar from './components/Sidebar'
import { DruckProvider } from './components/DruckContext'
import ErsteSchritte from './components/ErsteSchritte'
import type { Bereich } from './lib/bereiche'
import { db } from './db/db'
import { seedWennNoetig } from './db/seed'
import { taeglichenSnapshotWennNoetig, sicherungFaellig } from './db/backup'
import PersonalView from './components/PersonalView'
import GruppenView from './components/GruppenView'
import DienstartenView from './components/DienstartenView'
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
  const [ersteSchritteAusgeblendet, setErsteSchritteAusgeblendet] = useState(
    () => localStorage.getItem('kitaplan.ersteSchritteAusgeblendet') === 'true',
  )

  const aktiveGruppenAnzahl = useLiveQuery(() => db.gruppen.filter((g) => g.aktiv).count(), [], undefined)
  const mitarbeiterAnzahl = useLiveQuery(() => db.mitarbeiter.count(), [], undefined)
  const dienstAnzahl = useLiveQuery(() => db.dienste.filter((d) => !d.istVorlage).count(), [], undefined)
  const einrichtungKomplett = !!aktiveGruppenAnzahl && !!mitarbeiterAnzahl && !!dienstAnzahl
  const zeigeErsteSchritte =
    bereit && !ersteSchritteAusgeblendet && !einrichtungKomplett && aktiveGruppenAnzahl !== undefined

  function ersteSchritteAusblenden() {
    localStorage.setItem('kitaplan.ersteSchritteAusgeblendet', 'true')
    setErsteSchritteAusgeblendet(true)
  }

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
        <p>Kitaplan Birke wird geladen …</p>
      </div>
    )
  }

  return (
    <DruckProvider>
      <div className="app-shell" id="app-root">
        <Sidebar aktiv={bereich} onWechsel={setBereich} sicherungFaellig={faellig} />
        <main className="app-inhalt no-print">
          {zeigeErsteSchritte && (
            <ErsteSchritte
              gruppeAktiv={!!aktiveGruppenAnzahl}
              personalVorhanden={!!mitarbeiterAnzahl}
              dienstVorhanden={!!dienstAnzahl}
              onWechsel={setBereich}
              onAusblenden={ersteSchritteAusblenden}
            />
          )}
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
          {bereich === 'dienstarten' && <DienstartenView />}
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
