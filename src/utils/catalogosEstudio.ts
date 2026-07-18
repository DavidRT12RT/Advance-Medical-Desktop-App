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
  | "anestesiologos"
  | "tiposSedacion"
  | "enfermeras"
  | "asistentes";

export const CATALOGOS_ESTUDIO_DEFAULTS: Record<ClaveCatalogo, string[]> = {
  tiposProcedimiento: [...TIPOS_ESTUDIO, "Panendoscopia"],
  motivosEstudio: [
    "Sangrado de Tubo Digestivo Alto (STDA)",
    "Gastritis",
    "Dolor Abdominal",
  ],
  equiposMarca: ["Olympus", "Fujifilm", "Pentax"],
  equiposModelo: [],
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
