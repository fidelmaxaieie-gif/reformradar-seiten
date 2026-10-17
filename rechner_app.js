// Liest Regler, ruft rechne(), zeichnet. Rechnet NICHT selbst (Paritaetstest).
import { rechne } from "./rechner.js";
import { hinweis, lies, schreibe, unbekannt } from "./permalink.js";
import { PFLEGE_SCHLUESSEL, aussageBeitragssatz, einstellungenBeitragssatz, punkte, schemaBeitragssatz } from "./seiten.js";
import { einstellungenText, quelleGenesis, zitierzeile, datenstand } from "./zitat.js";
import { adresse, ersetzeAdresse, meldeDatenstand, setzeLeiste, verbirgZitat, zeigeZitat, beobachteAbschnitte } from "./rahmen.js";

const $ = (id) => document.getElementById(id);
const TITEL = {
  start: "Beitragssatz 2025", ausgaben: "Ausgaben je Versichertem",
  basis: "Beitragsbasis je Versichertem", pkv: "Privatversicherte einbeziehen",
  honorar: "Honorarausgleich",
};
const ERKLAERUNG = {
  start: "Beitragssatzniveau 2025 laut GKV-Schätzerkreis.",
  ausgaben: "Ältere Versicherte kosten mehr — bei gleichen Kosten je Alter (BAS-Profil 2024).",
  basis: "Mehr Rentner und Mitversicherte je Versichertem senken die Basis je Kopf; ein Minus heißt, sie steigt.",
  pkv: "Statisch, zu GKV-Preisen, Beitragsbemessungsgrenze unverändert.",
  honorar: "Anteil des PKV-Mehrumsatzes, den die GKV den Praxen und Kliniken ausgleicht.",
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);
}
function melde(t) { $("ergebnis").innerHTML = `<p class="fehler">${esc(t)}</p>`; }
// Ein Prozentwert mit deutschem Komma und echtem Minuszeichen (nicht dem Bindestrich-Minus).
function prozentSigniert(x) {
  const s = Math.abs(x).toFixed(1).replace(".", ",");
  return `${x < 0 ? "−" : "+"}${s} %`;
}
function prozentBetrag(x) {
  return `${Math.abs(x).toFixed(1).replace(".", ",")} %`;
}

function regler() {
  return {
    variante: $("variante").value, jahr: Number($("jahr").value),
    regelalter: Number($("regelalter").value), pkv: $("pkv").checked,
    honorar: Number($("honorar").value), faktor: Number($("faktor").value),
    spitze: $("spitze").value, morbiditaet: Number($("morbiditaet").value),
  };
}

let schema, beleg;
function zeichne(b) {
  const r = regler();
  $("honorar").disabled = !r.pkv || b.konstanten.mehrumsatz === null;
  for (const o of $("regler").querySelectorAll("output")) {
    const id = o.htmlFor.value;
    const v = $(id).value;
    o.textContent = id === "jahr" ? v
      : id === "faktor" ? Number(v).toFixed(2).replace(".", ",")
      : `${Math.round(Number(v) * 100)} %`;
  }
  const e = rechne(b, r);
  const zeilen = e.zeilen.map((z) => `
    <div class="zeile ${esc(z.schluessel)}">
      <div class="zahl">${punkte(z.wert, z.schluessel === "start")}</div>
      <div class="text"><b>${esc(TITEL[z.schluessel])}</b>${esc(ERKLAERUNG[z.schluessel])}</div>
    </div>`).join("");
  $("ergebnis").innerHTML = `<p class="urteil">${esc(e.urteil)}</p>${zeilen}
    <div class="zeile ergebnis"><div class="zahl">${punkte(e.satz, true)}</div>
    <div class="text"><b>nötiger Beitragssatz ${r.jahr}</b>bei den gewählten Annahmen</div></div>`;
  const suche = schreibe(location.search, r, schema);
  ersetzeAdresse(suche);
  const einstellungen = einstellungenText(einstellungenBeitragssatz(b, r));
  $("druck-beitragssatz").textContent = `Einstellungen: ${einstellungen}`;
  const aussage = aussageBeitragssatz(r, e);
  setzeLeiste("beitragssatz", aussage);
  try {
    zeigeZitat($("zitat-beitragssatz"), zitierzeile({
      aussage, einstellungen, pflichtsatz: $("pflicht-beitragssatz").textContent,
      quelle: quelleGenesis(beleg), stand: datenstand([beleg.abrufdatum]), link: adresse(schreibe("", r, schema, "", true), "beitragssatz"),
    }));
  } catch (f) {
    verbirgZitat($("zitat-beitragssatz"));
    melde(f.message);
  }
}

try {
  const antwort = await fetch("daten/rechner.json");
  if (!antwort.ok) throw new Error(`Datei daten/rechner.json fehlt (HTTP ${antwort.status}).`);
  const datei = await antwort.json();
  const b = datei.daten;
  $("variante").innerHTML = Object.entries(b.varianten_namen)
    .map(([w, n]) => `<option value="${esc(w)}">${esc(n)}</option>`).join("");
  schema = schemaBeitragssatz(b);
  beleg = datei.beleg;
  const { zustand, ungueltig } = lies(location.search, schema);
  const fremd = unbekannt(location.search, [...Object.keys(schema), ...PFLEGE_SCHLUESSEL.map((k) => `p_${k}`)]);
  const satz = hinweis([...ungueltig, ...fremd]);
  if (satz) { $("link-hinweis").textContent = satz; $("link-hinweis").hidden = false; }
  for (const [id, wert] of Object.entries(zustand)) {
    const el = $(id);
    if (el.type === "checkbox") el.checked = wert; else el.value = wert;
  }
  meldeDatenstand("beitragssatz", beleg.abrufdatum);
  beobachteAbschnitte(["beitragssatz", "pflege"]);
  if (!b.proben.pkv_bestanden) { $("pkv").checked = false; $("pkv").disabled = true; }
  if (b.konstanten.mehrumsatz === null) {
    $("honorar-feld").hidden = true;
  } else {
    const mrd = (b.konstanten.mehrumsatz / 1e9).toFixed(2).replace(".", ",");
    $("beleg-honorar").textContent = `0–100 % — WIP (Institut des PKV-Verbands, interessengebunden): PKV-Mehrumsatz ${mrd} Mrd. € (${b.konstanten.mehrumsatz_jahr}). Wie viel davon die GKV den Praxen und Kliniken ausgleicht.`;
  }
  $("quellen").innerHTML = b.weitere_quellen
    .map((q) => `<li><a href="${esc(q.url)}">${esc(q.name)}</a> — ${esc(q.vermerk)}</li>`).join("");
  // Probe 3' (Spec-Nachtrag K, 25.09.2026): die gesetzliche Verschiebung des Rentenbeginns ist
  // jetzt die massgebliche Probe; die alte Probe 3 (feste Statusanteile) steht nur noch als
  // Vergleichszahl daneben. Die Bandfehler, die sich ausgleichen, gehoeren zum
  // VERSCHIEBUNGSmodell (60–64 zu viele, 65–69 zu wenige Rentner) — die festen Anteile liegen in
  // beiden Baendern zu hoch (erkunde_statusanteile.py).
  const rbv = b.proben.rueckblick_verschoben;
  const rb = b.proben.rueckblick;
  $("beleg-regelalter").textContent = `0–100 % — Gesetz: Altersgrenzen steigen je Jahrgang um `
    + `2 Monate (63→65 bis 2029, 65→67 bis 2031). 100 % = wie im Gesetz; Rückblick 2019→2024 `
    + `trifft die Rentnerzahl damit bis auf ${prozentBetrag(rbv.abweichung * 100)}.`;
  const huerdeProzentV = Math.round(b.proben.rueckblick_verschoben_huerde * 100);
  if (Math.abs(rbv.abweichung) > b.proben.rueckblick_verschoben_huerde) {
    $("probe").textContent = `⚠️ Rückblick 2019→2024 (gesetzliche Verschiebung des Rentenbeginns): `
      + `Abweichung ${prozentSigniert(rbv.abweichung * 100)} (Hürde ${huerdeProzentV} %). Feste `
      + `Statusanteile, nur zum Vergleich: ${prozentSigniert(rb.abweichung * 100)}.`;
  } else {
    $("probe").textContent = `Rückblick 2019→2024: Die gesetzliche Verschiebung des Rentenbeginns `
      + `trifft die Rentnerzahl insgesamt bis auf ${prozentBetrag(rbv.abweichung * 100)}; je Band `
      + `gleichen sich Fehler aus (60–64 zu viele, 65–69 zu wenige Rentner). Feste Statusanteile, `
      + `nur zum Vergleich: ${prozentSigniert(rb.abweichung * 100)}.`;
  }
  let datenstaende = "Datenstände: Kosten, Versicherte, Beitragsbasis 2024; Privatversicherte Mikrozensus 2023";
  datenstaende += b.konstanten.mehrumsatz === null ? "."
    : `; PKV-Mehrumsatz ${b.konstanten.mehrumsatz_jahr} (nicht fortgeschrieben).`;
  $("hinweis-datenstaende").textContent = datenstaende;
  $("quellenvermerk").textContent = datei.beleg.quellenvermerk;
  $("regler").addEventListener("input", () => zeichne(b));
  zeichne(b);
} catch (f) {
  melde(f.message);
}
