/**
 * Ajustes de imagen de la cámara (brillo, contraste, saturación, gamma,
 * tono, balance rojo/verde/azul, nitidez).
 * Se persisten POR USUARIO en su perfil de Firestore
 * (configuraciones.videoAjustes — ver useVideoAjustes), igual que el resto
 * del módulo de configuración. Se aplican en dos capas:
 *  - CSS filter sobre el <video> (vista en vivo)
 *  - ctx.filter del canvas de grabación y capturas (quedan quemados en el
 *    video; la IA siempre recibe el frame original, sin ajustes)
 * "Gamma" no existe como filtro CSS; se aproxima con brightness+contrast.
 */

export interface VideoAjustes {
  brillo: number; // 100 = neutro
  contraste: number; // 100 = neutro
  saturacion: number; // 100 = neutro
  gamma: number; // 100 = neutro (aproximado)
  /** Tono / coloración en grados de hue-rotate; 0 = neutro (-180..180) */
  tono?: number;
  /** Nitidez 0..100; 0 = neutra. Requiere el filtro SVG #aim-nitidez montado
   *  en el documento (feConvolveMatrix) — ver FiltrosVideoSVG. */
  nitidez?: number;
  /** Ganancia del canal rojo; 100 = neutro (25..200). Requiere el filtro SVG
   *  #aim-canales montado en el documento — ver FiltrosVideoSVG. */
  rojo?: number;
  /** Ganancia del canal verde; 100 = neutro (25..200) */
  verde?: number;
  /** Ganancia del canal azul; 100 = neutro (25..200) */
  azul?: number;
  /** Resolución de captura preferida; "auto" = la máxima del dispositivo */
  resolucion?: ResolucionCaptura;
  /** Bitrate de grabación en Mbps; "auto" = calculado según la resolución */
  bitrate?: BitrateCaptura;
  /** Quemar el nombre del paciente y el estudio en el video grabado */
  overlayNombre?: boolean;
  /** Quemar la fecha y hora en el video grabado */
  overlayFechaHora?: boolean;
}

export type ResolucionCaptura = "auto" | "2160p" | "1080p" | "720p" | "480p";

/**
 * Opciones de resolución de captura. Se piden como "ideal" a getUserMedia:
 * el dispositivo negocia su modo real más cercano (no falla si no existe el
 * modo exacto). "auto" pide 4K para que gane el mejor modo disponible.
 */
export const RESOLUCIONES_CAPTURA: Array<{
  value: ResolucionCaptura;
  label: string;
  ancho: number;
  alto: number;
}> = [
  { value: "auto", label: "Automática (máxima del dispositivo)", ancho: 3840, alto: 2160 },
  { value: "2160p", label: "4K · 3840×2160", ancho: 3840, alto: 2160 },
  { value: "1080p", label: "Full HD · 1920×1080", ancho: 1920, alto: 1080 },
  { value: "720p", label: "HD · 1280×720", ancho: 1280, alto: 720 },
  { value: "480p", label: "SD · 640×480", ancho: 640, alto: 480 },
];

/** Dimensiones a solicitar para una resolución guardada (fallback: auto). */
export function dimensionesCaptura(r?: string) {
  return (
    RESOLUCIONES_CAPTURA.find((o) => o.value === r) ?? RESOLUCIONES_CAPTURA[0]
  );
}

/**
 * Opciones de resolución que el dispositivo actual realmente puede dar
 * (según track.getCapabilities). Sin capacidades conocidas, devuelve todas.
 * "auto" siempre se incluye; `seleccionada` también (p. ej. una preferencia
 * guardada desde otra computadora con mejor cámara).
 */
export function resolucionesDisponibles(
  maxAncho?: number,
  seleccionada?: string,
) {
  if (!maxAncho) return RESOLUCIONES_CAPTURA;
  return RESOLUCIONES_CAPTURA.filter(
    (o) =>
      o.value === "auto" || o.ancho <= maxAncho || o.value === seleccionada,
  );
}

function clampResolucion(valor: unknown): ResolucionCaptura {
  return RESOLUCIONES_CAPTURA.some((o) => o.value === valor)
    ? (valor as ResolucionCaptura)
    : "auto";
}

export type BitrateCaptura = "auto" | "4" | "8" | "16" | "25";

/** Opciones de bitrate de grabación (Mbps). */
export const BITRATES_CAPTURA: Array<{
  value: BitrateCaptura;
  label: string;
}> = [
  { value: "auto", label: "Automático (según resolución)" },
  { value: "4", label: "4 Mbps · estándar" },
  { value: "8", label: "8 Mbps · alta (Full HD)" },
  { value: "16", label: "16 Mbps · muy alta" },
  { value: "25", label: "25 Mbps · máxima (4K)" },
];

/**
 * Bitrate real a usar en la grabación (bits/segundo). En "auto" se calcula
 * ~3 bits/pixel sobre la resolución negociada: 1080p ≈ 6 Mbps, 4K ≈ 25 Mbps
 * (mínimo 3, tope 30 — el video se sube completo a Firebase Storage).
 */
export function bitrateEfectivo(
  bitrate: string | undefined,
  ancho: number,
  alto: number,
): number {
  const fijo = BITRATES_CAPTURA.find(
    (o) => o.value === bitrate && o.value !== "auto",
  );
  if (fijo) return Number(fijo.value) * 1_000_000;
  return Math.min(30_000_000, Math.max(3_000_000, ancho * alto * 3));
}

function clampBitrate(valor: unknown): BitrateCaptura {
  return BITRATES_CAPTURA.some((o) => o.value === valor)
    ? (valor as BitrateCaptura)
    : "auto";
}

export const AJUSTES_NEUTROS: VideoAjustes = {
  brillo: 100,
  contraste: 100,
  saturacion: 100,
  gamma: 100,
  tono: 0,
  nitidez: 0,
  rojo: 100,
  verde: 100,
  azul: 100,
  resolucion: "auto",
  bitrate: "auto",
  overlayNombre: true,
  overlayFechaHora: true,
};

/** Sanea un objeto de ajustes de origen externo (Firestore). */
export function validarAjustes(parsed: unknown): VideoAjustes {
  const p = (parsed ?? {}) as Record<string, unknown>;
  return {
    brillo: clamp(p.brillo),
    contraste: clamp(p.contraste),
    saturacion: clamp(p.saturacion),
    gamma: clamp(p.gamma),
    tono: clampTono(p.tono),
    nitidez: clampNitidez(p.nitidez),
    rojo: clamp(p.rojo),
    verde: clamp(p.verde),
    azul: clamp(p.azul),
    resolucion: clampResolucion(p.resolucion),
    bitrate: clampBitrate(p.bitrate),
    overlayNombre: p.overlayNombre !== false,
    overlayFechaHora: p.overlayFechaHora !== false,
  };
}

function clamp(valor: unknown): number {
  const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 100;
  return Math.min(200, Math.max(25, Math.round(n)));
}

function clampTono(valor: unknown): number {
  const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
  return Math.min(180, Math.max(-180, Math.round(n)));
}

function clampNitidez(valor: unknown): number {
  const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Construye el string de filtro (mismo formato para CSS y ctx.filter).
 * La "gamma" se aproxima: gamma > 100 aclara medios tonos (más brightness,
 * menos contrast) y gamma < 100 los oscurece.
 */
export function construirFiltro(a: VideoAjustes): string {
  const gammaFactor = a.gamma / 100;
  const brilloEfectivo = (a.brillo / 100) * Math.pow(gammaFactor, 0.5);
  const contrasteEfectivo = (a.contraste / 100) * Math.pow(gammaFactor, -0.25);
  let filtro = `brightness(${brilloEfectivo.toFixed(3)}) contrast(${contrasteEfectivo.toFixed(3)}) saturate(${(a.saturacion / 100).toFixed(3)})`;
  if (a.tono) {
    filtro += ` hue-rotate(${a.tono}deg)`;
  }
  if (!canalesNeutros(a)) {
    filtro += " url(#aim-canales)";
  }
  if (a.nitidez) {
    filtro += " url(#aim-nitidez)";
  }
  return filtro;
}

/** ¿Las ganancias rojo/verde/azul están en su valor neutro (100)? */
export function canalesNeutros(a: VideoAjustes): boolean {
  return (
    (a.rojo ?? 100) === 100 &&
    (a.verde ?? 100) === 100 &&
    (a.azul ?? 100) === 100
  );
}

/**
 * Matriz del feColorMatrix del filtro SVG #aim-canales: escala cada canal
 * primario de forma independiente (balance de color rojo/verde/azul).
 */
export function matrizCanales(a: VideoAjustes): string {
  const r = ((a.rojo ?? 100) / 100).toFixed(3);
  const g = ((a.verde ?? 100) / 100).toFixed(3);
  const b = ((a.azul ?? 100) / 100).toFixed(3);
  return `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
}

/** Valor k del kernel de enfoque para el feConvolveMatrix del filtro SVG. */
export function kernelNitidez(nitidez: number | undefined): string {
  const k = ((nitidez ?? 0) / 100) * 0.8;
  return `0 ${-k} 0 ${-k} ${1 + 4 * k} ${-k} 0 ${-k} 0`;
}

export function esNeutro(a: VideoAjustes): boolean {
  return (
    a.brillo === 100 &&
    a.contraste === 100 &&
    a.saturacion === 100 &&
    a.gamma === 100 &&
    !a.tono &&
    !a.nitidez &&
    canalesNeutros(a)
  );
}
