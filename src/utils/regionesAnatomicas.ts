/**
 * Regiones anatómicas por tipo de estudio.
 *
 * Cada región tiene la etiqueta que se guarda en `estudio.ubicacion` (el
 * Select del detalle de estudio) y las coordenadas (cx, cy) del marcador
 * sobre la ilustración correspondiente del reporte PDF (viewBox 200x180 en
 * las tres ilustraciones: colon, estómago y pulmones).
 *
 * El match del marcador se hace por etiqueta normalizada, así los estudios
 * viejos con ubicaciones ya guardadas ("Ciego", "Recto"...) también pintan
 * su marcador sin migración de datos.
 */

export type OrganoTipo = "colon" | "estomago" | "pulmon";

export interface RegionAnatomica {
  etiqueta: string;
  cx: number;
  cy: number;
}

export function organoPorTipoEstudio(tipo: string): OrganoTipo {
  const t = (tipo || "").toLowerCase();
  if (t.includes("colon") || t.includes("colonoscopia")) return "colon";
  if (t.includes("bronco") || t.includes("pulmon") || t.includes("pulmón"))
    return "pulmon";
  if (
    t.includes("gastro") ||
    t.includes("endoscopia") ||
    t.includes("endoscopía") ||
    t.includes("estomago") ||
    t.includes("estómago")
  )
    return "estomago";
  return "colon";
}

export const REGIONES_ANATOMICAS: Record<OrganoTipo, RegionAnatomica[]> = {
  colon: [
    { etiqueta: "Ciego", cx: 35, cy: 150 },
    { etiqueta: "Apéndice", cx: 30, cy: 178 },
    { etiqueta: "Colon Ascendente", cx: 35, cy: 90 },
    { etiqueta: "Flexura Hepática", cx: 40, cy: 45 },
    { etiqueta: "Transverso", cx: 100, cy: 40 },
    { etiqueta: "Flexura Esplénica", cx: 160, cy: 45 },
    { etiqueta: "Descendente", cx: 165, cy: 90 },
    { etiqueta: "Sigmoides", cx: 140, cy: 150 },
    { etiqueta: "Recto", cx: 108, cy: 160 },
  ],
  estomago: [
    { etiqueta: "Esófago", cx: 100, cy: 35 },
    { etiqueta: "Cardias", cx: 100, cy: 58 },
    { etiqueta: "Fundus", cx: 68, cy: 72 },
    { etiqueta: "Cuerpo Gástrico", cx: 85, cy: 115 },
    { etiqueta: "Antro", cx: 112, cy: 157 },
    { etiqueta: "Píloro", cx: 135, cy: 140 },
    { etiqueta: "Duodeno", cx: 155, cy: 140 },
  ],
  pulmon: [
    { etiqueta: "Tráquea", cx: 100, cy: 32 },
    { etiqueta: "Carina", cx: 100, cy: 52 },
    { etiqueta: "Bronquio Principal Derecho", cx: 112, cy: 60 },
    { etiqueta: "Bronquio Principal Izquierdo", cx: 88, cy: 60 },
    { etiqueta: "Lóbulo Superior Derecho", cx: 130, cy: 85 },
    { etiqueta: "Lóbulo Medio Derecho", cx: 133, cy: 112 },
    { etiqueta: "Lóbulo Inferior Derecho", cx: 128, cy: 142 },
    { etiqueta: "Lóbulo Superior Izquierdo", cx: 70, cy: 90 },
    { etiqueta: "Lóbulo Inferior Izquierdo", cx: 72, cy: 140 },
  ],
};

const normalizar = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Busca la región cuya etiqueta coincida con la ubicación guardada. */
export function regionPorEtiqueta(
  organo: OrganoTipo,
  ubicacion?: string | null,
): RegionAnatomica | undefined {
  if (!ubicacion) return undefined;
  const buscada = normalizar(ubicacion);
  return REGIONES_ANATOMICAS[organo].find(
    (r) =>
      normalizar(r.etiqueta) === buscada ||
      // tolerancia a variantes tipo "colon transverso" vs "transverso"
      normalizar(r.etiqueta).includes(buscada) ||
      buscada.includes(normalizar(r.etiqueta)),
  );
}
