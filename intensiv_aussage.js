// Zitierzeile der Intensiv-Seite. Eigene Datei, damit der Wochenlauf nur Module veröffentlicht, die kein anderer
// Rechner teilt (siehe docs/divi/seite.md). Die Zahlen sind die des Hauptsatzes: `prozent` und `datum` sind dieselben
// Funktionen, die die Seite anzeigt.
import { datum, prozent } from "./intensiv.js";

export function aussageIntensiv(a) {
  return `Erwartete Auslastung der Intensivbetten für Erwachsene, bundesweit, am ${datum(a.zieltag)}: `
    + `${prozent(a.prognose)} (80-%-Intervall ${prozent(a.unten)} bis ${prozent(a.oben)}; `
    + `Stand ${datum(a.ursprung)}: ${prozent(a.heute)})`;
}
