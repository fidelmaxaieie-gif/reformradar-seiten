// Pflegepersonal je Land (Spec 2026-10-03-pflegepersonal) — dieselbe Rechnung wie
// rechner/personal.py, rein, ohne DOM. Paritaet: tests/test_personal_paritaet.py.
// ⚠️ Reihenfolge der Schleifen und Summen wie in Python halten.
const AUSGANGSJAHR = 2023;
const SEKTOREN = ["ambulant", "stationaer"];
const HUERDE_Q1 = 1.0;

export function tausender(x) {
  const n = Math.floor(Math.abs(x) + 0.5);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function altere(jahre, n, vJahr) {
  let jetzt = jahre.slice();
  for (let k = 0; k < n; k++) {
    const neu = new Array(jetzt.length).fill(0.0);
    for (let i = 0; i < jetzt.length - 1; i++) neu[i + 1] = jetzt[i] * vJahr[i + 1];
    jetzt = neu;
  }
  return jetzt;
}

export function urteilssatzPersonal(land, jahr, neu, abgang, mehrbedarf) {
  if (neu <= 0) return `Der Bestand von 2023 reicht in ${land} bis ${jahr} rechnerisch aus.`;
  if (abgang > mehrbedarf) {
    return `In ${land} müssen bis ${jahr} ${tausender(neu)} Beschäftigte neu dazukommen – `
      + "der größere Teil, um Ausscheidende zu ersetzen.";
  }
  return `In ${land} müssen bis ${jahr} ${tausender(neu)} Beschäftigte neu dazukommen – `
    + "der größere Teil für zusätzliche Pflegebedürftige.";
}

export function rechnePersonal(bp, pflege, land, jahr, landName) {
  if (!Object.hasOwn(bp.bestand_2023, land)) throw new Error(`Land '${land}' unbekannt.`);
  const n = jahr - AUSGANGSJAHR;
  if (n <= 0) throw new Error(`Zieljahr ${jahr} liegt nicht nach ${AUSGANGSJAHR}.`);
  const zielJeWeg = Object.fromEntries(pflege.wege.map((w) => [w.weg, w.ziel]));
  const ausgangJeWeg = Object.fromEntries(pflege.wege.map((w) => [w.weg, w.ausgang]));
  const sektoren = [];
  let bestand0 = 0.0;
  let bestandT = 0.0;
  let bedarf0 = 0.0;
  let bedarfT = 0.0;
  for (const s of SEKTOREN) {
    const start = bp.bestand_2023[land][s];
    let b0 = 0.0;
    for (const x of start) b0 += x;
    let bt = 0.0;
    for (const x of altere(start, n, bp.v_jahr[s])) bt += x;
    const q = bp.quote[land][s];
    if (!(Math.abs(ausgangJeWeg[s] - bp.faelle_2023[land][s]) <= HUERDE_Q1)) {
      throw new Error("Pflege- und Personaldaten stammen aus verschiedenen Bau-Läufen.");
    }
    const d0 = q * bp.faelle_2023[land][s];
    const dt = q * zielJeWeg[s];
    sektoren.push({ sektor: s, bestand_2023: b0, bestand_ziel: bt, bedarf_ziel: dt, neu: dt - bt });
    bestand0 += b0;
    bestandT += bt;
    bedarf0 += d0;
    bedarfT += dt;
  }
  const veraenderung = bestandT - bestand0;
  const mehrbedarf = bedarfT - bedarf0;
  const neu = bedarfT - bestandT;
  return { sektoren, bestand_2023: bestand0, bestand_ziel: bestandT, bedarf_ziel: bedarfT,
    veraenderung, mehrbedarf, neu, je_jahr: neu / n,
    urteil: urteilssatzPersonal(landName, jahr, neu, -veraenderung, mehrbedarf) };
}
