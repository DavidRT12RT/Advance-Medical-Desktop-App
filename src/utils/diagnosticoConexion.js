import { FIREBASE_TARGET } from "../firebaseConfig";

/**
 * Batería de pruebas de conectividad para diagnosticar problemas al vincular
 * la licencia desde máquinas externas (hospitales con firewall/proxy).
 * Cada prueba devuelve { nombre, ok, detalle, ms }.
 */

const probar = async (nombre, fn) => {
  const inicio = Date.now();
  try {
    const detalle = await fn();
    return { nombre, ok: true, detalle: detalle || "OK", ms: Date.now() - inicio };
  } catch (error) {
    return {
      nombre,
      ok: false,
      detalle: error?.message || String(error),
      ms: Date.now() - inicio,
    };
  }
};

const conTimeout = (promesa, ms = 10000) =>
  Promise.race([
    promesa,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sin respuesta tras ${ms / 1000}s (timeout)`)), ms),
    ),
  ]);

export async function ejecutarDiagnostico() {
  const resultados = [];

  // 1. Internet en general (endpoint neutro de Google, respuesta 204 sin cuerpo)
  resultados.push(
    await probar("Internet (general)", async () => {
      const r = await conTimeout(
        fetch("https://www.gstatic.com/generate_204", { cache: "no-store" }),
      );
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
      return "Hay salida a internet";
    }),
  );

  // 2. Alcance a Firestore (el servicio que valida las licencias)
  resultados.push(
    await probar("Servidor de licencias (Firestore)", async () => {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_TARGET.projectId}/databases/${encodeURIComponent(FIREBASE_TARGET.database)}/documents/licencias?pageSize=1&key=${FIREBASE_TARGET.apiKey}`;
      const r = await conTimeout(fetch(url, { cache: "no-store" }));
      if (!r.ok) throw new Error(`HTTP ${r.status} — posible firewall/proxy bloqueando googleapis.com`);
      const data = await r.json();
      if (!data.documents?.length) throw new Error("Respondió pero sin datos de licencias");
      return "Firestore accesible y con licencias visibles";
    }),
  );

  // 3. Alcance a Firebase Auth (necesario para el login posterior)
  resultados.push(
    await probar("Servidor de autenticación (login)", async () => {
      const url = `https://identitytoolkit.googleapis.com/v1/projects?key=${FIREBASE_TARGET.apiKey}`;
      const r = await conTimeout(fetch(url, { cache: "no-store" }));
      // Cualquier respuesta HTTP (incluso 4xx) prueba que el host es alcanzable;
      // solo un fallo de red/bloqueo lanza excepción en fetch
      return `Host alcanzable (HTTP ${r.status})`;
    }),
  );

  // 4. Alcance a Firebase Storage (descarga de actualizaciones y subida de frames)
  resultados.push(
    await probar("Servidor de archivos (Storage)", async () => {
      const url = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_TARGET.projectId}.appspot.com/o?maxResults=1`;
      const r = await conTimeout(fetch(url, { cache: "no-store" }));
      return `Host alcanzable (HTTP ${r.status})`;
    }),
  );

  return resultados;
}

/**
 * Recopila el contexto de la máquina (versión, sistema, red local) vía IPC.
 * Tolerante a fallos: cada dato que no se pueda obtener queda como "n/d".
 */
export async function recopilarContexto(machineId) {
  const contexto = {
    fecha: new Date().toISOString(),
    version: "n/d",
    proyecto: `${FIREBASE_TARGET.projectId} · db: ${FIREBASE_TARGET.database}`,
    machineId: machineId || "n/d",
    online: typeof navigator !== "undefined" ? String(navigator.onLine) : "n/d",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/d",
    sistema: "n/d",
    ips: "n/d",
  };

  try {
    contexto.version = await window.updater?.getCurrentVersion?.();
  } catch { /* n/d */ }

  try {
    const info = await window.device?.getSystemInfo?.();
    if (info) {
      contexto.sistema = `${info.platform} ${info.release} (${info.arch}) — host: ${info.hostname} — RAM libre: ${info.freememGB}/${info.totalmemGB} GB`;
    }
  } catch { /* n/d */ }

  try {
    const ips = await window.device?.getIpAddresses?.();
    if (Array.isArray(ips) && ips.length) contexto.ips = ips.join(", ");
  } catch { /* n/d */ }

  return contexto;
}

/**
 * Genera el reporte completo en texto plano, listo para copiar y pegar
 * (WhatsApp, correo, ticket). Es la pieza que el personal externo nos envía.
 */
export function generarReporteTexto(contexto, resultados) {
  const lineas = [
    "=== DIAGNÓSTICO AIM DESKTOP ===",
    `Fecha:        ${contexto.fecha}`,
    `Versión app:  ${contexto.version}`,
    `Destino:      ${contexto.proyecto}`,
    `Machine ID:   ${contexto.machineId}`,
    `Sistema:      ${contexto.sistema}`,
    `IPs locales:  ${contexto.ips}`,
    `navigator.onLine: ${contexto.online}`,
    "",
    "--- Pruebas de conectividad ---",
    ...resultados.map(
      (r) => `[${r.ok ? "OK" : "FALLO"}] ${r.nombre} — ${r.detalle} (${r.ms}ms)`,
    ),
    "",
    `Resultado: ${resultados.every((r) => r.ok) ? "TODAS LAS PRUEBAS PASARON" : `${resultados.filter((r) => !r.ok).length} prueba(s) fallaron`}`,
    "=== FIN DEL DIAGNÓSTICO ===",
  ];
  return lineas.join("\n");
}
