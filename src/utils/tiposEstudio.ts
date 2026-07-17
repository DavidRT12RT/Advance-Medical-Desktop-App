/**
 * Catálogo único de tipos de consulta / estudio (procedimientos).
 *
 * Lo consumen los modales de creación, los filtros de búsqueda y las
 * columnas de las tablas. Para agregar, quitar o renombrar un tipo basta
 * con editar esta lista — no hay que tocar ningún componente.
 *
 * OJO: los documentos ya guardados en Firestore conservan el string con el
 * que se crearon; renombrar un tipo aquí no migra los datos existentes.
 */
export const TIPOS_ESTUDIO = [
  "Colonoscopia",
  "Endoscopia",
  "Rectosigmoidoscopia",
  "Broncoscopia",
  "CPRE",
  "Enteroscopia",
  "Ultrasonido Endoscópico",
];

/** Opciones listas para un <Select options={...}> de antd. */
export const TIPOS_ESTUDIO_OPTIONS = TIPOS_ESTUDIO.map((tipo) => ({
  label: tipo,
  value: tipo,
}));

/** Filtros listos para una columna de <Table> de antd. */
export const TIPOS_ESTUDIO_FILTERS = TIPOS_ESTUDIO.map((tipo) => ({
  text: tipo,
  value: tipo,
}));

const TAG_COLORS: Record<string, string> = {
  Colonoscopia: "blue",
  Endoscopia: "green",
  Rectosigmoidoscopia: "cyan",
  Broncoscopia: "purple",
  CPRE: "gold",
  Enteroscopia: "magenta",
  "Ultrasonido Endoscópico": "geekblue",
};

/** Color del Tag de antd para un tipo dado (con fallback neutro). */
export function colorPorTipo(tipo?: string | null): string {
  return (tipo && TAG_COLORS[tipo]) || "default";
}
