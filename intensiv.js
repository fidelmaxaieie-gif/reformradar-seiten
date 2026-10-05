// Reine Hilfen der Seite „Intensiv-Auslastung in 4 Wochen" — rechnen nichts Inhaltliches (L3, über Node getestet).
export function tageZwischen(vonIso, bisIso) {
  return Math.round((Date.parse(`${bisIso}T00:00:00Z`) - Date.parse(`${vonIso}T00:00:00Z`)) / 86400000);
}
export function veraltet(ursprungIso, heuteIso, grenze) {
  return tageZwischen(ursprungIso, heuteIso) > grenze;
}
export function prozent(x) { return `${x.toFixed(1).replace(".", ",")} %`; }
export function datum(iso) { const [j, m, t] = iso.split("-"); return `${t}.${m}.${j}`; }
export function heuteIso(jetzt = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${z(jetzt.getMonth() + 1)}-${z(jetzt.getDate())}`;
}
// Ist die jüngste Protokollzeile ein Ausfall, sagt die Seite es (statt still die ältere Vorhersage zu zeigen).
export function ausfallSatz(live) {
  const z = live[live.length - 1];
  if (!z || z.prognose !== null) return null;
  return `Für den Mittwoch ${datum(z.ursprung)} gibt es keine Vorhersage: ${z.grund}.`;
}
