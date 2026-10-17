// Zitierzeile (UX-Spec § 4.2) — reine Funktionen. Sie rechnen nichts und runden nichts: Zahlen kommen als die
// Zeichenketten, die die Seite anzeigt. Fehlt ein Pflichtteil, wird geworfen — eine halbe Zitierzeile wäre ein stiller Ausfall.
export function datumDe(iso) {
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

export function datenstand(texte) {
  const alle = texte.flatMap((t) => String(t).match(/\d{4}-\d{2}-\d{2}/g) ?? []);
  if (alle.length === 0) throw new Error("Datenstand: kein Datum in den Belegen.");
  return datumDe([...alle].sort().at(-1));
}

export function einstellungenText(liste) {
  const ab = liste.filter((e) => e.abweichend);
  return ab.length === 0 ? "Voreinstellungen" : ab.map((e) => `${e.name} ${e.wert}`).join("; ");
}

export function quelleGenesis(beleg) {
  for (const k of ["quelle", "tabelle", "abrufdatum", "lizenz", "lizenz_url"]) {
    if (!beleg?.[k]) throw new Error(`Beleg ohne „${k}“ — Zitierzeile verweigert.`);
  }
  return `Reformradar (eigene Berechnung) nach ${beleg.quelle}, Tabelle ${beleg.tabelle}, `
    + `Abruf ${beleg.abrufdatum}; Lizenz ${beleg.lizenz} (${beleg.lizenz_url}); die Daten wurden verändert.`;
}

export function quelleRki(quellen, namen) {
  if (!quellen?.length) throw new Error("Keine RKI-Quellen — Zitierzeile verweigert.");
  const teile = quellen.map((q) => `${namen[q.quelle] ?? q.quelle} Stand ${datumDe(q.tag)}`);
  return `Reformradar (eigene Berechnung) nach Robert Koch-Institut: ${teile.join(", ")}; `
    + "Lizenz CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); die Daten wurden verändert.";
}

export function zitierzeile({ aussage, einstellungen, pflichtsatz, quelle, stand, link }) {
  for (const [k, v] of Object.entries({ aussage, pflichtsatz, quelle, stand, link })) {
    if (typeof v !== "string" || v.trim() === "") throw new Error(`Zitierzeile: „${k}“ fehlt.`);
  }
  const klammer = einstellungen ? ` (${einstellungen})` : "";
  return `${aussage}${klammer}. ${pflichtsatz} Quelle: ${quelle} Stand ${stand}. ${link}`;
}
