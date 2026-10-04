// Liest die Regler des Pflege-Abschnitts, ruft rechnePflege(), zeichnet. Rechnet NICHT selbst (Paritaet).
import { rechnePflege, tausender } from "./pflege.js";

const $ = (id) => document.getElementById(id);
const WEG_NAMEN = { angehoerige: "zu Hause allein durch Angehörige",
  ambulant: "zu Hause mit Pflegedienst", stationaer: "im Pflegeheim" };
const ZEILEN = { einwohner: "Einwohnerzahl", alterung: "Alterung",
  haeufigkeit: "Häufigkeit (Trend 2019–2023, abklingend)" };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);
}
function personen(x) {
  const t = tausender(x);
  return t === "0" ? "±0" : `${x < 0 ? "−" : "+"}${t}`;
}
function prozent(x) { return `${x < 0 ? "−" : "+"}${Math.abs(x * 100).toFixed(1).replace(".", ",")} %`; }
function melde(t) { $("p-ergebnis").innerHTML = `<p class="fehler">${esc(t)}</p>`; }

function regler() {
  return { land: $("p-land").value, variante: $("p-variante").value, jahr: Number($("p-jahr").value),
    trend: Number($("p-trend").value), halbwertszeit: Number($("p-halbwertszeit").value) };
}

function zeichne(b) {
  const r = regler();
  $("p-halbwertszeit").disabled = r.trend === 0;
  for (const o of $("pflege-regler").querySelectorAll("output")) {
    const id = o.htmlFor.value;
    const v = $(id).value;
    o.textContent = id === "p-trend" ? `${Math.round(Number(v) * 100)} %`
      : id === "p-halbwertszeit" ? `${v} Jahre` : v;
  }
  try {
    const e = rechnePflege(b, r);
    const zeilen = e.wege.map((w) => `<tr><th>${esc(WEG_NAMEN[w.weg])}</th>`
      + `<td>${tausender(w.ausgang)}</td><td>${tausender(w.ziel)}</td></tr>`).join("");
    const fall = e.zeilen.map((z) => `<div class="zeile"><div class="zahl ${esc(z.schluessel)}">`
      + `${personen(z.wert)}</div><div class="text"><b>${esc(ZEILEN[z.schluessel])}</b></div></div>`).join("");
    $("p-ergebnis").innerHTML = `<p class="urteil">${esc(e.urteil)}</p>
      <table class="pflege-tabelle"><thead><tr><th></th><th>2023 gezählt</th><th>${r.jahr}</th></tr></thead>
      <tbody>${zeilen}<tr class="summe"><th>zusammen</th><td>${tausender(e.gesamt_ausgang)}</td>
      <td>${tausender(e.gesamt_ziel)}</td></tr></tbody></table>
      <div class="zeile"><div class="zahl start">${tausender(e.gesamt_ausgang)}</div>
      <div class="text"><b>2023 gezählt</b></div></div>${fall}
      <div class="zeile ergebnis"><div class="zahl">${tausender(e.gesamt_ziel)}</div>
      <div class="text"><b>${r.jahr}</b>bei den gewählten Annahmen</div></div>`;
  } catch (f) {
    melde(f.message);
  }
}

try {
  const antwort = await fetch("daten/pflege_vorausrechnung.json");
  if (!antwort.ok) throw new Error(`Datei daten/pflege_vorausrechnung.json fehlt (HTTP ${antwort.status}).`);
  const datei = await antwort.json();
  const b = datei.daten;
  // Lizenzvermerk (dl-de/by-2-0) der Pflege-Daten — steht IMMER da (Review 03.10.2026).
  $("p-quellenvermerk").textContent = datei.beleg.quellenvermerk;
  $("p-land").innerHTML = b.laender.map((l) => `<option value="${esc(l.code)}">${esc(l.name)}</option>`).join("");
  $("p-variante").innerHTML = Object.entries(b.varianten_namen)
    .map(([w, n]) => `<option value="${esc(w)}">${esc(n)}</option>`).join("");
  $("p-halbwertszeit").max = b.h_max;
  $("p-jahr").min = b.jahre[0];
  $("p-jahr").max = b.jahre[b.jahre.length - 1];
  const vor = b.voreinstellung;
  for (const [id, wert] of [["p-land", vor.land], ["p-variante", vor.variante], ["p-jahr", vor.jahr],
    ["p-trend", vor.trend], ["p-halbwertszeit", vor.halbwertszeit]]) $(id).value = wert;
  const p = b.proben;
  const mittel = (k) => {
    const werte = Object.entries(b.tau[k]).flatMap(([, g]) => Object.entries(g)
      .filter(([grp]) => grp !== "90+").map(([, x]) => x));
    return werte.reduce((a, x) => a + x, 0) / werte.length;
  };
  $("p-beleg-trend").textContent = "0–100 % — gemessen bundesweit 2019–2023, je Jahr im Mittel bis 89 Jahre (relative Veränderung der Häufigkeit): "
    + `Angehörige ${prozent(mittel("angehoerige"))}, Pflegedienst ${prozent(mittel("ambulant"))}, `
    + `Heim ${prozent(mittel("stationaer"))}. Proben: Split-Half ρ ${p.t1.rho.toFixed(2).replace(".", ",")}, `
    + `${p.t1.gleiches_vorzeichen} von ${p.t1.anzahl} gleichsinnig; Rückblick 2021→2023 `
    + `Fehler ${(p.t2.mape_trend * 100).toFixed(1).replace(".", ",")} % statt `
    + `${(p.t2.mape_fest * 100).toFixed(1).replace(".", ",")} % mit fester Häufigkeit.`
    + (p.t1.bestanden && p.t2.bestanden ? " Beide Proben bestanden." : "");
  $("p-beleg-halbwertszeit").textContent = `2–${b.h_max} Jahre — Annahme, nicht gemessen. Das jährliche `
    + `Wachstum halbiert sich alle h Jahre. Länger als ${b.h_max} Jahre liefe in mindestens einer `
    + "Altersgruppe mehr als 100 % in die Pflege. "
    + "Ab 90 Jahren bleibt die Häufigkeit fest: In mehreren Ländern beziehen Frauen dieses Alters schon 2023 "
    + "bis zu 99,8 % eine Pflegeleistung (Destatis 22421-0012) — ein fortgeschriebener Trend liefe dort über 100 %.";
  if (vor.trend_gesperrt) {
    $("p-trend").disabled = true;
    $("p-probe").textContent = "Der Trend hat seine Proben nicht bestanden und ist gesperrt "
      + `(Split-Half ${p.t1.bestanden ? "bestanden" : "nicht bestanden"}, `
      + `Rückblick ${p.t2.bestanden ? "bestanden" : "nicht bestanden"}).`;
  }
  $("pflege-regler").addEventListener("input", () => zeichne(b));
  zeichne(b);
} catch (f) {
  melde(f.message);
}
