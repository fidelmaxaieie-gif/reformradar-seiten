// Was die Seiten anzeigen und zitieren (UX-Spec § 4) — reine Funktionen. Die Formate hier benutzen die Apps auch
// für die ANZEIGE; dadurch ist die Zahl in der Zitierzeile zeichengleich mit der Zahl auf der Seite.
import { auswahl, gesperrt, schalter, zahl } from "./permalink.js";
import { tausender } from "./pflege.js";

// --- Formate -------------------------------------------------------------------------------------------------
export function komma(x, stellen) { return x.toFixed(stellen).replace(".", ","); }
export function punkte(x, start) {
  const s = Math.abs(x).toFixed(2).replace(".", ",");
  if (start) return `${s} %`;
  if (Math.abs(x) < 0.005) return `±${s}`;
  return `${x < 0 ? "−" : "+"}${s}`;
}
export function personen(x) {
  const t = tausender(x);
  return t === "0" ? "±0" : `${x < 0 ? "−" : "+"}${t}`;
}
export function prozentZerlegung(x) {
  return (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1).replace(".", ",") + " %";
}
export function prozentRegler(v) { return `${Math.round(Number(v) * 100)} %`; }

// --- Beitragssatz --------------------------------------------------------------------------------------------
export function schemaBeitragssatz(b) {
  const v = b.voreinstellung;
  const pkvAktiv = b.proben.pkv_bestanden;
  const honorarAktiv = b.konstanten.mehrumsatz !== null;
  const honorar = zahl(0, 1, 0.05, v.honorar);
  return {
    variante: auswahl(Object.keys(b.varianten_namen), v.variante),
    jahr: zahl(2025, 2035, 1, v.jahr),
    regelalter: zahl(0, 1, 0.05, v.regelalter),
    pkv: pkvAktiv ? schalter(v.pkv) : gesperrt(schalter(false)),
    honorar: honorarAktiv ? honorar : gesperrt(honorar),
    faktor: zahl(1.2, 1.6, 0.05, v.faktor),
    spitze: auswahl(["bbg", "3500"], v.spitze),
    morbiditaet: zahl(0.85, 1, 0.01, v.morbiditaet),
  };
}
const SPITZE = { bbg: "an der Beitragsbemessungsgrenze", 3500: "3.500 € netto × Faktor" };
export function einstellungenBeitragssatz(b, r) {
  const v = b.voreinstellung;
  const liste = [
    { name: "Bevölkerungsvariante", wert: b.varianten_namen[r.variante], abweichend: r.variante !== v.variante },
    { name: "Zieljahr", wert: String(r.jahr), abweichend: r.jahr !== v.jahr },
    { name: "Wirkung der gesetzlichen Verschiebung des Rentenbeginns", wert: prozentRegler(r.regelalter),
      abweichend: r.regelalter !== v.regelalter },
    { name: "Privatversicherte einbeziehen", wert: r.pkv ? "ja" : "nein", abweichend: r.pkv !== v.pkv },
  ];
  if (r.pkv) liste.push({ name: "Honorarausgleich", wert: prozentRegler(r.honorar), abweichend: r.honorar !== v.honorar });
  liste.push(
    { name: "Faktor netto → brutto", wert: komma(r.faktor, 2), abweichend: r.faktor !== v.faktor },
    { name: "Einkommen der Spitzenklasse", wert: SPITZE[r.spitze], abweichend: r.spitze !== v.spitze },
    { name: "Kosten der Privatversicherten relativ zur GKV", wert: prozentRegler(r.morbiditaet),
      abweichend: r.morbiditaet !== v.morbiditaet },
  );
  return liste;
}
export function aussageBeitragssatz(r, e) { return `Nötiger GKV-Beitragssatz ${r.jahr}: ${punkte(e.satz, true)}`; }

// --- Pflege und Personal -------------------------------------------------------------------------------------
export const PFLEGE_SCHLUESSEL = ["land", "variante", "jahr", "trend", "halbwertszeit"];
export function schemaPflege(b) {
  const v = b.voreinstellung;
  const trend = zahl(0, 1, 0.05, v.trend);
  return {
    land: auswahl(b.laender.map((l) => l.code), v.land),
    variante: auswahl(Object.keys(b.varianten_namen), v.variante),
    jahr: zahl(b.jahre[0], b.jahre[b.jahre.length - 1], 1, v.jahr),
    trend: v.trend_gesperrt ? gesperrt(trend) : trend,
    halbwertszeit: zahl(2, b.h_max, 1, v.halbwertszeit),
  };
}
export function einstellungenPflege(b, r) {
  const v = b.voreinstellung;
  const land = (c) => b.laender.find((l) => l.code === c).name;
  const liste = [
    { name: "Land", wert: land(r.land), abweichend: r.land !== v.land },
    { name: "Bevölkerungsvariante", wert: b.varianten_namen[r.variante], abweichend: r.variante !== v.variante },
    { name: "Zieljahr", wert: String(r.jahr), abweichend: r.jahr !== v.jahr },
    { name: "Häufigkeit ändert sich wie 2019–2023", wert: prozentRegler(r.trend), abweichend: r.trend !== v.trend },
  ];
  if (r.trend > 0) {
    liste.push({ name: "Halbwertszeit des Trends", wert: `${r.halbwertszeit} Jahre`,
                 abweichend: r.halbwertszeit !== v.halbwertszeit });
  }
  return liste;
}
export function aussagePflege(b, r, e) {
  const name = b.laender.find((l) => l.code === r.land).name;
  return `Pflegebedürftige mit Leistung in ${name} ${r.jahr}: ${tausender(e.gesamt_ziel)} `
    + `(2023 gezählt: ${tausender(e.gesamt_ausgang)})`;
}
export function aussagePersonal(name, r, p) {
  return `Neu nötige Beschäftigte der Pflegedienste und Heime in ${name} bis ${r.jahr}: ${personen(p.neu)}`;
}

// --- Zerlegung -----------------------------------------------------------------------------------------------
export const ZERLEGUNG_SCHLUESSEL = ["z", "s", "g", "t"];
export function schemaZerlegungOutcome(katalog) {
  const o = katalog.daten.outcomes;
  return { z: auswahl(o.map((x) => x.wert), o[0].wert) };
}
export function schemaZerlegung(katalog, outcomeWert) {
  const o = katalog.daten.outcomes.find((x) => x.wert === outcomeWert);
  const erste = (liste) => auswahl(liste.map((x) => x.wert), liste[0].wert);
  return { ...(o.sachachse === null ? {} : { s: erste(o.sachen) }), g: erste(o.gebiete), t: erste(o.zeitraeume) };
}
export function aussageZerlegung(teile, e) {
  const wo = [teile.outcome, teile.sache, teile.gebiet, teile.zeitraum].filter((x) => x).join(", ");
  return `${wo}: tatsächlich ${prozentZerlegung(e.beobachtet)}, davon Einwohnerzahl ${prozentZerlegung(e.einwohner)}, `
    + `Alterung ${prozentZerlegung(e.alterung)}, veränderte Häufigkeit ${prozentZerlegung(e.rest)}`;
}
