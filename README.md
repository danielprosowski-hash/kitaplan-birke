# Kitaplan Birke

Erstellt von Daniel Prosowski.

Dienstplanung für eine kleine Kita – als Web-App. Läuft vollständig im
Browser (kein Server, keine Cloud), speichert alle Daten lokal auf dem
Gerät und lässt sich kostenlos über GitHub Pages veröffentlichen.

Funktioniert gleichermaßen unter **Windows, macOS und Linux** in jedem
aktuellen Browser (Chrome, Edge, Firefox) – es ist keine Installation
nötig.

Dies ist die Web-Version der ursprünglichen macOS-App „KitaPlan"
(SwiftUI). Der Funktionsumfang wurde 1:1 übernommen und um einen
Kalender für Wünsche und Termine ergänzt.

Eine kurze Bedienanleitung fürs Team liegt bei: [`dokumentation/Bedienanleitung.pdf`](dokumentation/Bedienanleitung.pdf).
Sie ist auch aus der laufenden App heraus verlinkt (Backup & Einstellungen).

## Navigation

Startseite ist immer der Bereich **Start**: eine nummerierte Schritt-für-
Schritt-Anleitung für den üblichen Ablauf (einrichten → Wünsche/Abwesenheiten
pflegen → Wochenplan schreiben → kontrollieren → abrechnen → sichern), mit
Sprungknöpfen zum jeweiligen Bereich. Die Seitenleiste bleibt für den
gezielten Zugriff bestehen, ist aber gruppiert und bis auf „Planung"
(die wöchentlich gebrauchten Bereiche) standardmäßig eingeklappt, damit
nicht alle zwölf Menüpunkte gleichzeitig die Übersicht erschweren.

## Funktionen

- **Personal** – Mitarbeitende anlegen, bearbeiten, ausscheiden lassen
- **Gruppen** – acht Slots, Krippe oder Kita, Mindestbesetzung pro Slot
- **Feiertage** – werden automatisch berechnet (Ostern-Formel + Bundesland,
  z. B. Reformationstag), laufen also nie aus; manuell ergänzbar
- **Abwesenheiten** – alle neun Kürzel (U, RT, UWT, K, FB, F, Ue, MZ, EZ)
  mit korrekter Verrechnungslogik
- **Kalender** – Urlaubswünsche, Frei-Wünsche, Termine und Fortbildungen
  vorab eintragen; erscheinen als Erinnerung im Wochenplan der
  jeweiligen Woche
- **Wochenplan** – pro Gruppe eine Woche im Raster, Dienste anlegen,
  bearbeiten und per Drag-and-Drop verschieben. Stundenkonto (Soll/Ist je
  Person, gruppenübergreifend) immer sichtbar. Live-Warnungen für
  Kernzeit-Unterbesetzung (9–14 Uhr), fehlende Pause ab mehr als 6 Stunden
  und gruppenübergreifende Doppelverplanung; abwesende/ausgeschiedene
  Personen werden beim Zuweisen ausgegraut. Abwesenheiten (Urlaub, Krank,
  …) direkt pro Tag eintragbar, erscheinen als farbige Chips. Schnellauswahl-
  Knöpfe für wiederkehrende Dienstarten. Standard-Woche/Rahmenplan als
  Vorlage speichern und auf andere Wochen übernehmen – bei einer noch
  komplett leeren Woche geschieht das automatisch.
- **Rahmenplan** – fester Wochenrhythmus pro Person (Wochentag → Gruppe/
  Zeiten), die Basis für jede neue Woche im Wochenplan. Gesamtübersicht mit
  allen Personen auf einen Blick, plus Funktion, den Rahmenplan für mehrere
  Wochen im Voraus (z. B. 9 Wochen) für alle Personen auf einmal in den
  Wochenplan zu schreiben.
- **Dienstarten** – wiederkehrende Schichtmuster verwalten (Bezeichnung,
  Zeiten, Pause), erscheinen im Wochenplan und im Rahmenplan als
  Schnellauswahl.
- **Wochenübersicht** – Read-Only-Ansicht aller aktiven Gruppen einer Woche,
  mit PDF-Export
- **Abdeckung** – prüft, ob zu jedem Früh-/Spätdienst-Zeitpunkt jemand
  tatsächlich anwesend ist (nicht nur, ob ein Dienst in der Nähe beginnt)
- **Ist-Zeiten** – pro Person und Monat, automatischer ArbZG-Pausenabzug,
  taggenauer Soll-Ist-Vergleich
- **Abrechnung** – taggenaues Stundenkonto pro Person mit Soll, Ist,
  Saldo; PDF-Export für Einzelperson und Gesamtauswertung
- **PDF-Export** – Wochenaushang, Gesamtplan, Wochenübersicht,
  Monatsabrechnung und Auswertung als Druckansicht, mit echten Namen und
  gut lesbarer Schriftgröße („Drucken → Als PDF speichern")

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
