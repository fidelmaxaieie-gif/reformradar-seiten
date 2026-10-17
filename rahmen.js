// Rahmen der Seiten (UX-Spec § 3, § 4): Kopieren mit Rückfall, Drucken, Datenstand, Handy-Leiste, Adresse.
// Rechnet nichts. Ein Kopieren, das nicht geht, sagt es — nie ein stummer Klick.
import { datenstand } from "./zitat.js";

const staende = new Map();
export function meldeDatenstand(quelle, text) {
  staende.set(quelle, text);
  const el = document.getElementById("datenstand");
  if (!el) return;
  try { el.textContent = `Datenstand ${datenstand([...staende.values()])}`; } catch { el.textContent = ""; }
}

export function zeigeZitat(feld, text) {
  feld.querySelector(".zitat-text").textContent = text;
  feld.querySelector(".kopier-status").textContent = "";
  feld.hidden = false;
}
export function verbirgZitat(feld) { feld.hidden = true; }

export function adresse(neueSuche, anker) {
  return `${location.origin}${location.pathname}${neueSuche}${anker ? `#${anker}` : ""}`;
}
export function ersetzeAdresse(neueSuche) {
  history.replaceState(history.state, "", `${location.pathname}${neueSuche}${location.hash}`);
}

function markiere(el) {
  const auswahl = window.getSelection();
  const bereich = document.createRange();
  bereich.selectNodeContents(el);
  auswahl.removeAllRanges();
  auswahl.addRange(bereich);
}

document.addEventListener("click", async (ev) => {
  const knopf = ev.target.closest("button.kopieren");
  if (knopf) {
    const feld = knopf.closest(".zitat");
    const text = feld.querySelector(".zitat-text");
    const status = feld.querySelector(".kopier-status");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("keine Zwischenablage");
      await navigator.clipboard.writeText(text.textContent);
      status.textContent = "kopiert";
    } catch {
      markiere(text);
      status.textContent = "Mit Strg+C kopieren";
    }
    return;
  }
  if (ev.target.closest("#drucken")) window.print();
});

const leisten = {};
let aktiv = null;
function zeichneLeiste() {
  const el = document.getElementById("leiste");
  if (!el) return;
  el.textContent = leisten[aktiv] ?? Object.values(leisten)[0] ?? "";
  // Die feste Leiste darf den Fußbereich (Lizenzvermerk) nie verdecken: unten so viel Platz lassen, wie sie hoch ist.
  document.body.style.paddingBottom = el.textContent && getComputedStyle(el).display !== "none"
    ? `${el.offsetHeight + 8}px` : "";
}
window.addEventListener("resize", zeichneLeiste);
export function setzeLeiste(abschnitt, text) { leisten[abschnitt] = text; zeichneLeiste(); }
export function beobachteAbschnitte(ids) {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) aktiv = e.target.id;
    zeichneLeiste();
  }, { rootMargin: "-35% 0px -60% 0px" });
  for (const id of ids) { const el = document.getElementById(id); if (el) io.observe(el); }
}
