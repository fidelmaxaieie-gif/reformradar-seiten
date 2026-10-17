// Permalink (UX-Spec § 4.3): Reglerstellung <-> Adresse. Reine Funktionen. Ein ungültiger Wert fällt auf die
// Voreinstellung UND wird gemeldet — nie still verschluckt. Die Voreinstellung steht nie in der Adresse.
export function auswahl(werte, standard) {
  return { standard, text: (w) => String(w), lies: (s) => (werte.includes(s) ? s : undefined) };
}

export function zahl(min, max, schritt, standard) {
  const stellen = (String(schritt).split(".")[1] ?? "").length;
  return {
    standard,
    text: (w) => String(w),
    lies: (s) => {
      if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;              // kein Komma, kein Leerraum
      const w = Number(s);
      const k = (w - min) / schritt;
      if (w < min - 1e-9 || w > max + 1e-9 || Math.abs(k - Math.round(k)) > 1e-6) return undefined;
      return Number(w.toFixed(stellen));
    },
  };
}

export function schalter(standard) {
  return { standard, text: (w) => (w ? "1" : "0"), lies: (s) => (s === "1" ? true : s === "0" ? false : undefined) };
}

export function gesperrt(feld) {
  return { ...feld, lies: (s) => { const w = feld.lies(s); return w === feld.standard ? w : undefined; } };
}

export function lies(suche, schema, praefix = "") {
  const p = new URLSearchParams(suche);
  const zustand = {};
  const ungueltig = [];
  for (const [k, feld] of Object.entries(schema)) {
    const roh = p.get(praefix + k);
    if (roh === null) { zustand[k] = feld.standard; continue; }
    const w = feld.lies(roh);
    if (w === undefined) { zustand[k] = feld.standard; ungueltig.push(praefix + k); } else zustand[k] = w;
  }
  return { zustand, ungueltig };
}

// alle = true: auch Voreinstellungen schreiben (Zitierlinks, UX-Spec § 4.3: der Link garantiert die Einstellung,
// auch wenn ein späterer Bau eine Voreinstellung verschiebt). Die Adresszeile bleibt minimal (alle = false).
export function schreibe(suche, zustand, schema, praefix = "", alle = false) {
  const p = new URLSearchParams(suche);
  for (const [k, feld] of Object.entries(schema)) {
    if (!alle && zustand[k] === feld.standard) p.delete(praefix + k);
    else p.set(praefix + k, feld.text(zustand[k]));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function unbekannt(suche, erlaubt) {
  return [...new URLSearchParams(suche).keys()].filter((k) => !erlaubt.includes(k));
}

export function hinweis(schluessel) {
  return schluessel.length === 0 ? ""
    : `Der Link enthielt ungültige Werte (${schluessel.join(", ")}); dafür gilt die Voreinstellung.`;
}
