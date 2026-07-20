import { TIPOS_ESTUDIO } from "./tiposEstudio";

/**
 * Catálogos editables por usuario para los datos del estudio.
 *
 * Cada clave es un listado que el médico puede personalizar (agregar/borrar
 * entradas) desde los selects del detalle del estudio. Se persisten en su
 * perfil bajo `configuraciones.catalogosEstudio.<clave>`; mientras el usuario
 * no haya guardado nada para una clave, se usan estos valores por defecto.
 */
export type ClaveCatalogo =
  | "tiposProcedimiento"
  | "motivosEstudio"
  | "equiposMarca"
  | "equiposModelo"
  | "medicosTratantes"
  | "anestesiologos"
  | "tiposSedacion"
  | "enfermeras"
  | "asistentes";

/** Etiquetas para la pantalla de administración de listados. */
export const CATALOGOS_ESTUDIO_LABELS: Record<ClaveCatalogo, string> = {
  tiposProcedimiento: "Tipos de procedimiento",
  motivosEstudio: "Motivos del estudio",
  equiposMarca: "Marcas de equipo",
  equiposModelo: "Modelos de equipo",
  medicosTratantes: "Médicos tratantes",
  anestesiologos: "Anestesiólogos",
  tiposSedacion: "Tipos de sedación",
  enfermeras: "Enfermería",
  asistentes: "Asistentes",
};

/**
 * Claves cuyas entradas guardan además cédula y especialidad (personal
 * médico). El valor es la clave hermana en `catalogosEstudio` donde vive el
 * arreglo de detalles `{ nombre, cedula, especialidad }`.
 */
export const CLAVES_CON_DETALLES: Partial<Record<ClaveCatalogo, string>> = {
  medicosTratantes: "medicosTratantesDetalles",
  anestesiologos: "anestesiologosDetalles",
};

export const CATALOGOS_ESTUDIO_DEFAULTS: Record<ClaveCatalogo, string[]> = {
  tiposProcedimiento: [...TIPOS_ESTUDIO, "Panendoscopia"],
  motivosEstudio: [
    "Sangrado de Tubo Digestivo Alto (STDA)",
    "Gastritis",
    "Dolor Abdominal",
  ],
  equiposMarca: ["Olympus", "Fujifilm", "Pentax"],
  equiposModelo: [],
  medicosTratantes: [],
  anestesiologos: [],
  tiposSedacion: [
    "Sedación consciente",
    "Sedación profunda",
    "Anestesia general",
    "Sin sedación",
    "Sedación con Propofol",
    "Sedación con Midazolam",
  ],
  enfermeras: [],
  asistentes: [],
};
