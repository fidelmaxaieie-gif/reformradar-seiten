// Schlaegt nach und zeichnet. Rechnet nichts — das ist in Python passiert
// (scripts/baue_seite.py). Braucht die Seite eine Zahl, die nicht in der JSON
// steht, gehoert die Rechnung dorthin, nicht hierher.
//
// Jeder Fehlschlag wird SICHTBAR gemeldet: fehlende Datei, fehlender Schluessel,
// fehlender Text. Ein leerer Hauptbereich waere ein stiller Ausfall.
import { hinweis, lies, schreibe, unbekannt } from "./permalink.js";
import { ZERLEGUNG_SCHLUESSEL, aussageZerlegung, prozentZerlegung, schemaZerlegung, schemaZerlegungOutcome } from "./seiten.js";
import { datenstand, quelleGenesis, zitierzeile } from "./zitat.js";
import { adresse, ersetzeAdresse, meldeDatenstand, verbirgZitat, zeigeZitat } from "./rahmen.js";

const $ = (id) => document.getElementById(id);

class Fehlt extends Error {}

function melde(meldung) {
  $("ergebnis").innerHTML = `<p class="fehler">${esc(meldung)}</p>`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g,
    (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);
}

async function laden(pfad) {
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Fehlt(`Datei ${pfad} fehlt (HTTP ${antwort.status}).`);
  return antwort.json();
}

// Ein Text aus texte.json; fehlt er, wird das gemeldet statt leer gezeichnet.
function text(pfad, ersetzungen = {}) {
  const wert = pfad.split(".").reduce((o, k) => (o == null ? o : o[k]), texte);
  if (typeof wert !== "string") throw new Fehlt(`Text „${pfad}“ fehlt in texte.json.`);
  return wert.replace(/\{(\w+)\}/g, (_, k) => {
    if (ersetzungen[k] == null) throw new Fehlt(`Für „${pfad}“ fehlt der Wert {${k}}.`);
    return ersetzungen[k];
  });
}

function fuelle(select, eintraege) {
  select.innerHTML = eintraege
    .map((e) => `<option value="${esc(e.wert)}">${esc(e.name)}</option>`).join("");
  select.hidden = eintraege.length < 2;
  select.nextElementSibling.textContent = eintraege.length < 2 ? (eintraege[0]?.name ?? "") : "";
}

function zeile(klasse, zahl, pfad, hilfe, ersetzungen) {
  const wort = typeof zahl === "string";
  return `<div class="zeile ${klasse === "rest" ? "ergebnis" : ""}">
    <div class="zahl ${klasse}${wort ? " wort" : ""}">${wort ? esc(zahl) : prozentZerlegung(zahl)}</div>
    <div class="text"><b>${esc(text(pfad + ".titel", ersetzungen))}</b>${esc(text(pfad + ".satz", ersetzungen))}
      <button type="button" class="hilfe" data-hilfe="${esc(hilfe)}"
              aria-label="Erklärung in Leichter Sprache" aria-expanded="false">?</button>
      <div class="leicht" hidden></div></div></div>`;
}

// Die Zeile „Zählweise" hat drei Fassungen (Spec-Nachtrag C). Bei
// nicht_geprueft SAGT sie das, samt Grund — sie darf keine Prüfung quittieren,
// die nie stattfand.
function pruefzeile(p, zeitraumName) {
  const zustand = p.zustand;
  if (!["geprueft", "bruch", "nicht_geprueft"].includes(zustand)) {
    throw new Fehlt(`Unbekannter Prüfzustand „${zustand}“.`);
  }
  const ersetzungen = { zeitraum: zeitraumName, bruchjahr: p.bruchjahr, grund: p.grund };
  const pfad = `zeilen.pruefung.${zustand}`;
  return zeile(`pruefung ${zustand}`, text(pfad + ".zahl", ersetzungen), pfad,
    `pruefung.${zustand}`, ersetzungen);
}

function personen(x) {
  const betrag = Math.round(Math.abs(x)).toLocaleString("de-DE");
  return `${x < 0 ? "−" : "+"}${betrag}`;
}

// Der Pflege-Rest nach Versorgungsart (Spec-Nachtrag K/L) — nur, wenn der Eintrag ihn traegt.
// Die Zahlen kommen fertig aus Python; hier wird nur gezeichnet.
function wegeblock(e) {
  if (!e.wege) return "";
  const zeilen = e.wege.map((w) =>
    `<li><span class="wegzahl">${personen(w.personen)}</span> ${esc(text(`wege.namen.${w.weg}`))}</li>`).join("");
  return `<section class="wege"><b>${esc(text("wege.titel"))}</b>
    <div>${esc(text("wege.satz"))}
      <button type="button" class="hilfe" data-hilfe="wege"
              aria-label="Erklärung in Leichter Sprache" aria-expanded="false">?</button>
      <div class="leicht" hidden></div></div>
    <ul>${zeilen}</ul><p class="hinweis">${esc(text("wege.hinweis"))}</p></section>`;
}

// Was am Outcome bewusst fehlt (Spec-Nachtrag N) — steht IMMER ueber dem Ergebnis, auch wenn
// keines gezeigt wird. Der Outcome traegt den Schluessel, der Text kommt aus texte.json.
function kennzeichnungsblock(o) {
  if (!o.kennzeichnung) return "";
  const k = o.kennzeichnung;
  return `<section class="kennzeichnung"><b>${esc(text(`kennzeichnung.${k}.titel`))}</b>
    <div>${esc(text(`kennzeichnung.${k}.satz`))}
      <button type="button" class="hilfe" data-hilfe="kennzeichnung.${esc(k)}"
              aria-label="Erklärung in Leichter Sprache" aria-expanded="false">?</button>
      <div class="leicht" hidden></div></div></section>`;
}

function zeichne(e, zeitraumName) {
  const urteil = kennzeichnungsblock(gewaehlterOutcome()) + `<p class="urteil">${esc(e.urteil)}</p>`;
  if (!e.zeigt_ergebnis) {
    $("ergebnis").innerHTML = urteil + pruefzeile(e.pruefung, zeitraumName) +
      `<p>${esc(text("bruch_hinweis", { bruchjahr: e.pruefung.bruchjahr }))}</p>`;
    verbirgZitat($("zitat")); $("druck-zerlegung").textContent = "";
    return;
  }
  $("ergebnis").innerHTML = urteil +
    zeile("beobachtet", e.beobachtet, "zeilen.beobachtet", "beobachtet") +
    pruefzeile(e.pruefung, zeitraumName) +
    zeile("einwohner", e.einwohner, "zeilen.einwohner", "einwohner") +
    zeile("alterung", e.alterung, "zeilen.alterung", "alterung") +
    zeile("rest", e.rest, "zeilen.rest", "rest") +
    wegeblock(e);
  const o = gewaehlterOutcome();
  const name = (id) => $(id).selectedOptions[0]?.textContent ?? "";
  const teile = { outcome: o.name, sache: o.sachachse === null ? null : name("sache"), gebiet: name("gebiet"),
                  zeitraum: zeitraumName };
  const datei = daten[o.wert];
  $("druck-zerlegung").textContent = `Auswahl: ${[teile.outcome, teile.sache, teile.gebiet, teile.zeitraum].filter((x) => x).join(", ")}`;
  try {
    zeigeZitat($("zitat"), zitierzeile({
      aussage: aussageZerlegung(teile, e), einstellungen: null, pflichtsatz: e.urteil,
      quelle: quelleGenesis(datei.beleg), stand: datenstand([datei.beleg.abrufdatum]),
      link: adresse(schreibe(schreibe("", { z: o.wert }, schemaZerlegungOutcome(katalog), "", true), zitatZustand(o), schemaZerlegung(katalog, o.wert), "", true), null),
    }));
  } catch (f) {
    verbirgZitat($("zitat"));
    melde(f.message);
  }
}

$("ergebnis").addEventListener("click", (ev) => {
  const knopf = ev.target.closest("button.hilfe");
  if (!knopf) return;
  const kasten = knopf.parentElement.querySelector(".leicht");
  try {
    kasten.textContent = text(`leichte_sprache.${knopf.dataset.hilfe}`);
  } catch (f) {
    kasten.textContent = f.message;
    kasten.classList.add("fehler");
  }
  kasten.hidden = !kasten.hidden;
  knopf.setAttribute("aria-expanded", String(!kasten.hidden));
});

function gewaehlterOutcome() {
  return katalog.daten.outcomes.find((x) => x.wert === $("outcome").value);
}
// Die aktuelle Auswahl der Regler (Zitierlink und Adresszeile).
function zitatZustand(o) {
  return { g: $("gebiet").value, t: $("zeitraum").value, ...(o.sachachse === null ? {} : { s: $("sache").value }) };
}

async function aktualisiere() {
  const o = gewaehlterOutcome();
  try {
    if (!daten[o.wert]) daten[o.wert] = await laden(`daten/${o.wert}.json`);
    const datei = daten[o.wert];
    // Der Lizenzvermerk steht IMMER da, auch wenn kein Ergebnis gezeigt wird.
    $("quellenvermerk").textContent = datei.beleg.quellenvermerk;
    meldeDatenstand("zerlegung", datei.beleg.abrufdatum);
    const sache = o.sachachse === null ? katalog.daten.keine_sache : $("sache").value;
    const schluessel = `${sache}|${$("gebiet").value}|${$("zeitraum").value}`;
    const eintrag = datei.daten[schluessel];
    if (!eintrag) {
      throw new Fehlt(`Für diese Auswahl liegt kein Ergebnis vor (Schlüssel ${schluessel}). ` +
        "Das ist ein Fehler im Bau der Seite.");
    }
    const zeitraumName = o.zeitraeume.find((z) => z.wert === $("zeitraum").value).name;
    const sz = schemaZerlegung(katalog, o.wert);
    ersetzeAdresse(schreibe(schreibe("", { z: o.wert }, schemaZerlegungOutcome(katalog)), zitatZustand(o), sz));
    zeichne(eintrag, zeitraumName);
  } catch (f) {
    verbirgZitat($("zitat")); $("druck-zerlegung").textContent = "";
    melde(f instanceof Fehlt ? f.message : `Unerwarteter Fehler: ${f.message}`);
  }
}

function outcomeGewechselt(start = null) {
  const o = gewaehlterOutcome();
  $("sache-feld").hidden = o.sachachse === null;
  if (o.sachachse !== null) {
    $("sache-name").textContent = o.sachachse;
    fuelle($("sache"), o.sachen);
  }
  $("gebiet-name").textContent = o.gebiet_bezeichnung;
  fuelle($("gebiet"), o.gebiete);
  fuelle($("zeitraum"), o.zeitraeume);
  if (start) {
    if (start.s !== undefined) $("sache").value = start.s;
    $("gebiet").value = start.g;
    $("zeitraum").value = start.t;
  }
  aktualisiere();
}

const daten = {};
let katalog, texte;
try {
  [katalog, texte] = await Promise.all([laden("daten/katalog.json"), laden("texte.json")]);
  fuelle($("outcome"), katalog.daten.outcomes);
  const erst = lies(location.search, schemaZerlegungOutcome(katalog));
  $("outcome").value = erst.zustand.z;
  const zweit = lies(location.search, schemaZerlegung(katalog, erst.zustand.z));
  // `s` ist als Schluessel erlaubt, gilt aber nur mit Sachachse; sonst nicht still verschlucken.
  const ohneSache = !("s" in schemaZerlegung(katalog, erst.zustand.z)) && new URLSearchParams(location.search).has("s") ? ["s"] : [];
  const satz = hinweis([...erst.ungueltig, ...zweit.ungueltig, ...ohneSache, ...unbekannt(location.search, ZERLEGUNG_SCHLUESSEL)]);
  if (satz) { $("link-hinweis").textContent = satz; $("link-hinweis").hidden = false; }
  $("outcome").addEventListener("change", () => outcomeGewechselt());
  for (const id of ["sache", "gebiet", "zeitraum"]) $(id).addEventListener("change", aktualisiere);
  outcomeGewechselt(zweit.zustand);
} catch (f) {
  melde(f instanceof Fehlt ? f.message : `Unerwarteter Fehler: ${f.message}`);
}
