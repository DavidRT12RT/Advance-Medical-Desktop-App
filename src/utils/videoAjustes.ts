/**
 * Ajustes de imagen de la cámara (brillo, contraste, saturación, gamma).
 * Se persisten por máquina en localStorage y se aplican en dos capas:
 *  - CSS filter sobre el <video> (vista en vivo)
 *  - ctx.filter del canvas de grabación (quedan quemados en el video y
 *    en los frames que analiza la IA)
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
   *  en el documento (feConvolveMatrix) — ver FiltroNitidezSVG. */
  nitidez?: number;
}

export const AJUSTES_NEUTROS: VideoAjustes = {
  brillo: 100,
  contraste: 100,
  saturacion: 100,
  gamma: 100,
  tono: 0,
  nitidez: 0,
};

const STORAGE_KEY = "aim-video-ajustes";

export function cargarAjustes(): VideoAjustes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...AJUSTES_NEUTROS };
    const parsed = JSON.parse(raw);
    return {
      brillo: clamp(parsed.brillo),
      contraste: clamp(parsed.contraste),
      saturacion: clamp(parsed.saturacion),
      gamma: clamp(parsed.gamma),
      tono: clampTono(parsed.tono),
      nitidez: clampNitidez(parsed.nitidez),
    };
  } catch {
    return { ...AJUSTES_NEUTROS };
  }
}

export function guardarAjustes(ajustes: VideoAjustes): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ajustes));
  } catch {
    /* almacenamiento no disponible: los ajustes solo viven en memoria */
  }
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
  if (a.nitidez) {
    filtro += " url(#aim-nitidez)";
  }
  return filtro;
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
    !a.nitidez
  );
}
