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
