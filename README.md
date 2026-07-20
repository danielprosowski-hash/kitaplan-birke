# KitaPlan (Web)

Dienstplanung für eine kleine Kita – als Web-App. Läuft vollständig im
Browser (kein Server, keine Cloud), speichert alle Daten lokal auf dem
Gerät und lässt sich kostenlos über GitHub Pages veröffentlichen.

Funktioniert gleichermaßen unter **Windows, macOS und Linux** in jedem
aktuellen Browser (Chrome, Edge, Firefox) – es ist keine Installation
nötig.

Dies ist die Web-Version der ursprünglichen macOS-App „KitaPlan"
(SwiftUI). Der Funktionsumfang wurde 1:1 übernommen und um einen
Kalender für Wünsche und Termine ergänzt.

## Funktionen

- **Personal** – Mitarbeitende anlegen, bearbeiten, ausscheiden lassen
- **Gruppen** – acht Slots, Krippe oder Kita, Mindestbesetzung pro Slot
- **Feiertage** – bundesweite Liste 2026 vorbefüllt, ergänzbar
- **Abwesenheiten** – alle neun Kürzel (U, RT, UWT, K, FB, F, Ue, MZ, EZ)
  mit korrekter Verrechnungslogik
- **Kalender** – Urlaubswünsche, Frei-Wünsche, Termine und Fortbildungen
  vorab eintragen; erscheinen als Erinnerung im Wochenplan der
  jeweiligen Woche
- **Wochenplan** – pro Gruppe eine Woche im Raster, Dienste anlegen,
  bearbeiten und per Drag-and-Drop verschieben. Live-Warnungen für
  Kernzeit-Unterbesetzung (9–14 Uhr) und fehlende Pause ab 6 Stunden.
  Standard-Woche als Vorlage speichern und auf andere Wochen übernehmen.
- **Wochenübersicht** – Read-Only-Ansicht aller aktiven Gruppen einer Woche
- **Abdeckung** – prüft, ob alle Pflicht-Randdienste besetzt sind
- **Ist-Zeiten** – pro Person und Monat, automatischer ArbZG-Pausenabzug,
  taggenauer Soll-Ist-Vergleich
- **Abrechnung** – taggenaues Stundenkonto pro Person mit Soll, Ist,
  Saldo; PDF-Export für Einzelperson und Gesamtauswertung
- **PDF-Export** – Wochenaushang, Gesamtplan, Monatsabrechnung und
  Auswertung als Druckansicht („Drucken → Als PDF speichern")

## Datenhaltung und Backup

Alle Eingaben werden sofort im Browser gespeichert (IndexedDB) – es
gibt keinen Server, an den Daten übertragen werden.

**Wichtig:** Diese Daten liegen nur auf dem jeweiligen Gerät/Browser.
Für eine echte Sicherung:

1. Unter **Backup & Einstellungen** regelmäßig auf **„Sicherung jetzt
   herunterladen"** klicken – das erzeugt eine JSON-Datei mit dem
   kompletten Datenbestand.
2. Diese Datei an einem sicheren Ort ablegen (Cloud-Ordner, USB-Stick).
   Da Personaldaten (Krankheit, Urlaub) enthalten sind, gilt das als
   DSGVO-relevant – entsprechend vorsichtig aufbewahren.
3. Über **„Sicherung einspielen"** lässt sich eine solche Datei jederzeit
   wieder einlesen (ersetzt dabei den kompletten aktuellen Datenbestand).

Zusätzlich legt die App automatisch einmal täglich eine interne
Zwischensicherung an (30 Tage Historie) – als Sicherheitsnetz gegen
Fehlbedienung, ersetzt aber nicht die heruntergeladene Sicherung.

Der App-Code selbst enthält keine Personaldaten. Das Hosting auf einem
öffentlichen GitHub-Pages-Link ist daher unbedenklich – sensible Daten
verlassen nie den Browser der Nutzerin/des Nutzers.

## Lokal starten (Entwicklung)

Voraussetzung: [Node.js](https://nodejs.org) (Version 20 oder neuer).

```bash
npm install
npm run dev
```

Die App ist danach unter `http://localhost:5173` erreichbar.

## Produktions-Build

```bash
npm run build
```

Das Ergebnis liegt im Ordner `dist/` und kann auf jedem beliebigen
statischen Webhost (auch offline vom eigenen Rechner per Doppelklick auf
`dist/index.html`) geöffnet werden.

## Veröffentlichen auf GitHub Pages

1. Dieses Verzeichnis (`webapp`) als eigenes Repository auf GitHub
   hochladen (oder als Unterordner eines bestehenden Repos – dann den
   Workflow ggf. anpassen).
2. Im Repository unter **Settings → Pages** bei „Source" **„GitHub
   Actions"** auswählen.
3. Bei jedem Push auf den Branch `main` baut die Workflow-Datei
   `.github/workflows/deploy.yml` die App automatisch und veröffentlicht
   sie unter `https://<benutzername>.github.io/<repo-name>/`.
4. Der erste Durchlauf kann 1–2 Minuten dauern – Fortschritt unter dem
   Reiter **Actions** im Repository sichtbar.

Kein eigener Server, kein Hosting-Vertrag nötig – GitHub Pages ist für
öffentliche Repositories kostenlos.

## Technik

- React + TypeScript + Vite
- Dexie (IndexedDB) für die lokale Datenspeicherung
- Keine Backend-Abhängigkeiten, keine externen Cloud-Dienste

## Unterschiede zur macOS-App

- PDF-Export erfolgt über die Druckfunktion des Browsers statt über eine
  native PDF-Bibliothek (funktioniert identisch, keine zusätzliche
  Installation nötig).
- Neu: eigener **Kalender**-Bereich für Urlaubswünsche und Termine mit
  Erinnerung im Wochenplan (gab es in der macOS-Version nicht).
- Backup läuft über Datei-Download statt automatischem Dateisystem-Zugriff
  (Browser dürfen aus Sicherheitsgründen nicht selbstständig auf die
  Festplatte schreiben).
