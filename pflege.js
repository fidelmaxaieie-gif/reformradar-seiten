// Pflegebedarf je Land (Spec 2026-10-03-pflegebedarf, Nachtraege O, P) — dieselbe Rechnung wie
// rechner/pflege.py, rein, ohne DOM. Paritaet: tests/test_pflege_paritaet.py.
// ⚠️ Reihenfolge der Schleifen und Summen wie in Python halten.
const AUSGANGSJAHR = 2023;
const H_MIN = 2;
const GESCHLECHTER = ["m", "w"];

export function wachstum(s, tau, w, h) {
  let g = 1.0;
  for (let u = 0; u < s; u++) g *= 1.0 + w * tau * Math.pow(2.0, -u / h);
  return g;
}

export function tausender(x) {
  const n = Math.floor(Math.abs(x) + 0.5);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function urteilssatzPflege(land, jahr, demografie, haeufigkeit, w) {
  if (w === 0) {
    if (demografie >= 0) {
      return `Allein durch die Demografie gäbe es in ${land} ${jahr} ${tausender(demografie)} `
        + "Pflegebedürftige mit Leistung mehr als 2023.";
    }
    return `Allein durch die Demografie gäbe es in ${land} ${jahr} ${tausender(demografie)} `
      + "Pflegebedürftige mit Leistung weniger als 2023.";
  }
  if (Math.abs(haeufigkeit) > Math.abs(demografie)) {
    return `Setzt sich die Häufigkeit wie 2019–2023 fort – abklingend –, wiegt sie bis ${jahr} `
      + "schwerer als die Demografie.";
  }
  return `Auch wenn sich die Häufigkeit wie 2019–2023 fortsetzt – abklingend –, bleibt bis ${jahr} `
    + "die Demografie der größere Teil.";
}

function teileDemografie(eVon, eBis, pVon, pBis) {
  if (pVon <= 0 || pBis <= 0) throw new Error(`Bevoelkerung nicht positiv (${pVon} -> ${pBis}).`);
  const einwohner = eVon * (pBis / pVon - 1.0);
  return { einwohner, alterung: (eBis - eVon) - einwohner };
}

export function rechnePflege(b, r) {
  const land = r.land, v = r.variante, jahr = Number(r.jahr);
  const w = Number(r.trend), h = Number(r.halbwertszeit);
  const namen = Object.fromEntries(b.laender.map((x) => [x.code, x.name]));
  if (!Object.hasOwn(namen, land)) throw new Error(`Land ${land} unbekannt.`);
  if (!Object.hasOwn(b.bev, v)) throw new Error(`Variante ${v} unbekannt.`);
  if (!b.jahre.includes(jahr)) throw new Error(`Zieljahr ${jahr} ausserhalb ${b.jahre[0]}–${b.jahre[b.jahre.length - 1]}.`);
  if (!(w >= 0 && w <= 1)) throw new Error(`Trend-Anteil ${w} ausserhalb 0–1.`);
  if (!(h >= H_MIN && h <= b.h_max)) throw new Error(`Halbwertszeit ${h} ausserhalb ${H_MIN}–${b.h_max}.`);
  const s = jahr - AUSGANGSJAHR;
  const nT = b.bev[v][land][String(jahr)], n0 = b.bev_2023[land];
  const ziel = Object.fromEntries(b.wege.map((k) => [k, 0.0]));
  let erwartet = 0.0;
  let erwartet0 = 0.0;
  for (const g of GESCHLECHTER) {
    b.gruppe_je_band.forEach((grp, i) => {
      let zelle = 0.0;
      for (const k of b.wege) {
        const rate = b.raten[land][k][g][i];
        const fak = wachstum(s, b.tau[k][g][grp], w, h);
        zelle += rate * fak;
        ziel[k] += rate * fak * nT[g][i];
        erwartet += rate * nT[g][i];
        erwartet0 += rate * n0[g][i];
      }
      if (!(zelle <= 1.0)) {
        throw new Error(`In einer Zelle (${g}, ab ${b.baender[i]}) liefen `
          + `${Math.round(zelle * 100)} % in die Pflege — mehr als 100 %.`);
      }
    });
  }
  let gesamtZiel = 0.0;
  for (const k of b.wege) gesamtZiel += ziel[k];
  let gesamtAusgang = 0.0;
  for (const k of b.wege) gesamtAusgang += b.faelle_2023[land][k];
  let p0 = 0.0;
  let pT = 0.0;
  for (const g of GESCHLECHTER) {
    for (let i = 0; i < b.baender.length; i++) { p0 += n0[g][i]; pT += nT[g][i]; }
  }
  const t = teileDemografie(erwartet0, erwartet, p0, pT);
  const haeufigkeit = gesamtZiel - erwartet;
  return {
    wege: b.wege.map((k) => ({ weg: k, ausgang: b.faelle_2023[land][k], ziel: ziel[k] })),
    gesamt_ausgang: gesamtAusgang,
    gesamt_ziel: gesamtZiel,
    zeilen: [{ schluessel: "einwohner", wert: t.einwohner },
      { schluessel: "alterung", wert: t.alterung },
      { schluessel: "haeufigkeit", wert: haeufigkeit }],
    urteil: urteilssatzPflege(namen[land], jahr, erwartet - erwartet0, haeufigkeit, w),
  };
}
