// Die Rechnung des Beitragssatz-Rechners. Rein: kein DOM, kein fetch.
// Rechnet GENAU wie rechner/modell.py — dieselben Schleifen in derselben Reihenfolge.
// Geprueft von tests/test_rechner_paritaet.py (1e-9). Wer hier etwas aendert, aendert
// es auch in modell.py — sonst wird der Test rot, und das ist gewollt.
//
// Nachtrag 24.09.2026 (Nachtrag J, siehe modell.py): Wasserfall je Versichertem statt in
// Totalen — summen() liefert zusaetzlich v (= Σ p·g), rechne() teilt a und basis durch v.
//
// Nachtrag 25.09.2026 (Nachtrag K, siehe modell.py): spaeterer Rentenbeginn nach Gesetz statt
// fester Statusanteile — verschiebung()/verschobeneZellen() ersetzen zeitanteil()/den alten
// schub-Block.

function verschiebung(band, jahr, w, k) {
  const ende = k.verschiebung_ende[String(band)];
  const d = w * k.verschiebung_je_jahr * Math.max(0, Math.min(jahr, ende) - k.statusjahr);
  return Math.min(d, 5) / 5;
}

function verschobeneZellen(zellen, jahr, w, k) {
  const ref = {};
  for (const z of zellen) ref[`${z.band}_${z.geschlecht}`] = z;
  const ergebnis = [];
  for (const z of zellen) {
    let e = z.e;
    let r = z.r;
    if (z.band === 60 || z.band === 65) {
      const unten = ref[`${z.band - 5}_${z.geschlecht}`];
      const s = verschiebung(z.band, jahr, w, k);
      e = e + s * (unten.e - e);
      r = r + s * (unten.r - r);
    }
    ergebnis.push({ band: z.band, geschlecht: z.geschlecht, e, r });
  }
  return ergebnis;
}

function summen(b, variante, jahr, regelalter) {
  const k = b.konstanten;
  const zellen = b.zellen;
  const p = b.bevoelkerung[variante][String(jahr)];
  const verschoben = verschobeneZellen(zellen, jahr, regelalter, k);
  let a = 0;
  let basis = 0;
  let v = 0;
  for (let i = 0; i < zellen.length; i++) {
    const z = zellen[i];
    const e = verschoben[i].e;
    const r = verschoben[i].r;
    const vz = p[i] * z.g;
    a = a + vz * z.c;
    basis = basis + vz * (e * z.lohn_basis + r * b.k_r);
    v = v + vz;
  }
  return [a, basis, v];
}

function pkv(b, variante, jahr, regler) {
  const k = b.konstanten;
  const q = b.pkv;
  const zellen = b.zellen;
  const nG = q.n.length;
  const p0 = b.bevoelkerung[variante][String(k.basisjahr)];
  const p = b.bevoelkerung[variante][String(jahr)];
  const g0 = new Array(nG).fill(0);
  const g1 = new Array(nG).fill(0);
  for (let i = 0; i < zellen.length; i++) {
    g0[zellen[i].gruppe] += p0[i];
    g1[zellen[i].gruppe] += p[i];
  }
  let ausgaben = 0;
  let koepfe0 = 0;
  let koepfe1 = 0;
  for (let j = 0; j < nG; j++) {
    const n = q.n[j] * g1[j] / g0[j];
    ausgaben = ausgaben + n * q.c[j];
    koepfe0 = koepfe0 + q.n[j];
    koepfe1 = koepfe1 + n;
  }
  ausgaben = ausgaben * regler.morbiditaet;
  const kopf = koepfe1 / koepfe0;
  const bbg = k.bbg_monat;
  let basis = 0;
  for (const kl of q.einkommen) {
    let monat;
    if (kl.mitte === null) {
      monat = regler.spitze === "bbg" ? bbg : Math.min(k.spitze_netto_vorsichtig * regler.faktor, bbg);
    } else {
      monat = Math.min(kl.mitte * regler.faktor, bbg);
    }
    basis = basis + kl.n * monat * 12.0;
  }
  basis = basis * kopf;
  const mehrumsatz = k.mehrumsatz === null ? 0 : k.mehrumsatz * kopf;
  return [ausgaben, basis, mehrumsatz];
}

function zahl(x, vorzeichen) {
  const s = Math.abs(x).toFixed(2).replace(".", ",");
  if (!vorzeichen) return s;
  return (x < 0 ? "−" : "+") + s;
}

export function urteilssatz(demografie, hebel, jahr, hebelAktiv) {
  if (!hebelAktiv) {
    // |x| < 0,005 wuerde als "0,00" gedruckt — dann gibt es keine Richtung (Review 24.09.2026).
    if (Math.abs(demografie) < 0.005) {
      return `Bis ${jahr} verändert die Demografie den nötigen Beitragssatz nicht.`;
    }
    if (demografie > 0) {
      return `Ohne Reform stiege der nötige Beitragssatz bis ${jahr} allein durch die ` +
        `Demografie um ${zahl(demografie, false)} Punkte.`;
    }
    return `Ohne Reform sänke der nötige Beitragssatz bis ${jahr} durch die Demografie ` +
      `um ${zahl(demografie, false)} Punkte.`;
  }
  if (demografie <= 0) {
    return `Bis ${jahr} erhöht die Demografie den nötigen Beitragssatz nicht; die gewählte ` +
      `Reform verändert ihn um ${zahl(hebel, true)} Punkte.`;
  }
  const anteil = -hebel / demografie;
  if (anteil > 1) return `Die gewählte Reform fängt den demografischen Anstieg bis ${jahr} mehr als auf.`;
  if (anteil >= 0.5) return `Die gewählte Reform fängt den demografischen Anstieg bis ${jahr} überwiegend auf.`;
  if (anteil >= 0) {
    return `Die gewählte Reform fängt nur einen kleineren Teil des demografischen ` +
      `Anstiegs bis ${jahr} auf.`;
  }
  return `Die gewählte Reform verstärkt den demografischen Anstieg bis ${jahr}.`;
}

export function rechne(b, regler) {
  const k = b.konstanten;
  const v = regler.variante;
  const jahr = regler.jahr;
  const [a0, b0, v0] = summen(b, v, k.basisjahr, regler.regelalter);
  const [a, basis, vz] = summen(b, v, jahr, regler.regelalter);
  const s0 = k.s0;
  const s1 = s0 * (a / vz) / (a0 / v0);
  const s2 = s1 * (b0 / v0) / (basis / vz);
  const zeilen = [
    { schluessel: "start", wert: s0 },
    { schluessel: "ausgaben", wert: s1 - s0 },
    { schluessel: "basis", wert: s2 - s1 },
  ];
  let satz = s2;
  const pkvAn = Boolean(regler.pkv);
  const honorar = (pkvAn && k.mehrumsatz !== null) ? regler.honorar : 0;
  if (pkvAn) {
    const [aP, bP, m] = pkv(b, v, jahr, regler);
    const s3 = s2 * ((a + aP) / a) / ((basis + bP) / basis);
    zeilen.push({ schluessel: "pkv", wert: s3 - s2 });
    satz = s3;
    if (honorar > 0) {
      const s4 = s3 * (a + aP + honorar * m) / (a + aP);
      zeilen.push({ schluessel: "honorar", wert: s4 - s3 });
      satz = s4;
    }
  }
  const demografie = s2 - s0;
  const hebel = satz - s2;
  return { satz, zeilen, demografie, hebel, urteil: urteilssatz(demografie, hebel, jahr, pkvAn) };
}
