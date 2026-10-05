// Zeichnet die Seite aus daten/intensiv.json. Rechnet NICHTS Inhaltliches: Zahlen und Urteilssatz kommen aus dem Bau.
import { ausfallSatz, datum, heuteIso, prozent, veraltet } from "./intensiv.js";

const $ = (id) => document.getElementById(id);
const QUELLEN = { divi: "Intensivregister (DIVI)", influenza: "Influenza-Meldefälle",
  are: "Atemwegserkrankungen (ARE)", sari: "Schwere Atemwegsinfekte (SARI)", covid: "COVID-19-Klinikaufnahmen" };
const NS = "http://www.w3.org/2000/svg";
const esc = (s) => String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);

function element(name, attr, eltern) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  eltern.appendChild(e);
  return e;
}

function zeichne(d) {
  const svg = $("grafik");
  const B = 720, H = 300, L = 44, R = 10, O = 10, U = 26;
  const punkte = [...d.pruefung, ...d.live].filter((p) => p.prognose !== null);
  const alleY = [...d.verlauf.map((v) => v[1]), ...punkte.flatMap((p) => [p.unten ?? p.prognose, p.oben ?? p.prognose])];
  const yMin = Math.floor(Math.min(...alleY)) - 1, yMax = Math.ceil(Math.max(...alleY)) + 1;
  const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
  const tMin = t(d.verlauf[0][0]);
  const tMax = Math.max(t(d.verlauf[d.verlauf.length - 1][0]), ...punkte.map((p) => t(p.zieltag)));
  const x = (iso) => L + ((t(iso) - tMin) / (tMax - tMin)) * (B - L - R);
  const y = (v) => O + ((yMax - v) / (yMax - yMin)) * (H - O - U);
  for (let v = yMin; v <= yMax; v += 2) {
    element("line", { x1: L, x2: B - R, y1: y(v), y2: y(v), class: "gitter" }, svg);
    element("text", { x: L - 6, y: y(v) + 4, class: "achse", "text-anchor": "end" }, svg).textContent = `${v} %`;
  }
  element("polyline", { points: d.verlauf.map(([dt, v]) => `${x(dt)},${y(v)}`).join(" "), class: "verlauf" }, svg);
  const marke = (p, klasse, r) => {
    if (p.unten !== null && p.oben !== null) {
      element("line", { x1: x(p.zieltag), x2: x(p.zieltag), y1: y(p.unten), y2: y(p.oben), class: `intervall ${klasse}` }, svg);
    }
    element("circle", { cx: x(p.zieltag), cy: y(p.prognose), r, class: `punkt ${klasse}` }, svg);
  };
  d.pruefung.filter((p) => p.prognose !== null).forEach((p) => marke(p, "pruefung", 2));
  d.live.filter((p) => p.prognose !== null && p.ursprung !== d.aktuell?.ursprung).forEach((p) => marke(p, "live", 3));
  if (d.aktuell) marke(d.aktuell, "aktuell", 5);
}

function bilanzen(d) {
  const b = d.bilanz_pruefung;
  $("pruefung-text").textContent =
    `Im Test über ${b.n} Wochen (Ursprünge ${datum(b.von)} bis ${datum(b.bis)}, vorab festgelegt, einmal ausgewertet) ` +
    `lag die Vorhersage im Mittel ${b.mae.toFixed(2).replace(".", ",")} Prozentpunkte daneben, ` +
    `„wie zuletzt" ${b.mae_s0.toFixed(2).replace(".", ",")} — besser in ${b.k2_saisonjahre} von 3 Saisonjahren, ` +
    `p = ${b.k3_p.toFixed(4).replace(".", ",")}; das 80-%-Intervall traf in ${Math.round(b.k4_abdeckung * 100)} % der Wochen.`;
  const l = d.bilanz_live;
  $("live-text").textContent = l.mae === null
    ? `Noch ${l.n_aufgeloest} von ${d.mindest_live} Vorhersagen aufgelöst — die Bilanz erscheint ab ${d.mindest_live}.`
    : `${l.n_aufgeloest} Vorhersagen aufgelöst: im Mittel ${l.mae.toFixed(2).replace(".", ",")} Prozentpunkte daneben, ` +
      `„wie zuletzt" ${l.mae_s0.toFixed(2).replace(".", ",")}; Intervall traf in ${Math.round(l.abdeckung * 100)} %.`;
}

async function start() {
  let d;
  try {
    const antwort = await fetch("daten/intensiv.json", { cache: "no-store" });
    d = await antwort.json();
  } catch (f) {
    $("hauptsatz").innerHTML = `<span class="fehler">Die Daten ließen sich nicht laden: ${esc(f.message)}</span>`;
    return;
  }
  const a = d.aktuell;
  if (!a) {
    $("hauptsatz").textContent = "Noch keine Vorhersage.";
  } else {
    $("hauptsatz").innerHTML =
      `Am <b>${datum(a.zieltag)}</b> erwartet das Modell eine Auslastung der Intensivbetten von ` +
      `<span class="zahl wort">${prozent(a.prognose)}</span> — mit 80 % Wahrscheinlichkeit zwischen ` +
      `${prozent(a.unten)} und ${prozent(a.oben)}. Stand ${datum(a.ursprung)}: ${prozent(a.heute)}.`;
    $("urteil").textContent = a.urteil;
    if (veraltet(a.ursprung, heuteIso(), d.veraltet_nach_tagen)) {
      $("veraltet").hidden = false;
      $("veraltet").textContent = `Diese Vorhersage ist vom ${datum(a.ursprung)} und nicht mehr aktuell.`;
    }
  }
  const ausfall = ausfallSatz(d.live);
  if (ausfall) {
    $("ausfall").hidden = false;
    $("ausfall").textContent = ausfall;
  }
  $("quellen").innerHTML = d.quellen.map((q) =>
    `<li><a href="${esc(q.url)}">${esc(QUELLEN[q.quelle] ?? q.quelle)}</a> — Stand ${datum(q.tag)}</li>`).join("");
  const lib = Object.entries(d.bibliotheken ?? {}).map(([n, v]) => `${n} ${v}`).join(", ");
  $("stand").textContent = `Gebaut ${d.erzeugt} · Code ${d.commit.slice(0, 7)}` + (lib ? ` · ${lib}` : "");
  bilanzen(d);
  zeichne(d);
}
start();
