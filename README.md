# Reformradar — statische Seiten

Studentisches Projekt (Gesundheitsökonomie, Hochschule Fulda). Statische Seiten, die keine Daten der
Besucher erheben:

- **Wie viel davon ist Alterung?** (`index.html`) — zerlegt die Veränderung von Krankenhausfällen
  und Pflegebedürftigen in Einwohnerzahl, Alterung und veränderte Häufigkeit.
- **Was die Demografie den Beitragssatz kostet** (`rechner.html`) — statische Wenn-dann-Rechnung
  zum GKV-Beitragssatz bis 2035, mit Reglern für Demografie und Reformhebel. Zweiter Abschnitt:
  **Pflegebedarf je Land bis 2040** — Pflegebedürftige mit Leistung nach Versorgungsart, mit
  wählbarer Annahme über die Häufigkeit, und die Beschäftigten der Pflegedienste und Heime, die dafür
  gebraucht würden.
- **Wie voll werden die Intensivstationen in vier Wochen?** (`intensiv.html`) — die Auslastung der
  Intensivbetten bundesweit 28 Tage voraus, jede Woche neu berechnet. Gezeigt wird nur, was in einem
  vorab festgelegten, einmal ausgewerteten Test besser war als „wie zuletzt"; dazu die Bilanz seit
  dem Start der Seite. Eine statistische Vorhersage, keine Lagebewertung.

Keine Beratung. Quellen und Vermerke stehen auf den Seiten selbst; Daten des Statistischen
Bundesamts unter Datenlizenz Deutschland – Namensnennung – Version 2.0, Daten des Robert
Koch-Instituts unter CC BY 4.0.

Gebaut aus dem (privaten) Forschungs-Repository, Stand `b7f1c3e`. Die Intensiv-Vorhersage
(`intensiv.*`, `daten/intensiv.json`, `daten/intensiv_live.csv`) schreibt ein wöchentlicher Lauf
fort; `daten/intensiv_live.csv` ist ihr Protokoll.
