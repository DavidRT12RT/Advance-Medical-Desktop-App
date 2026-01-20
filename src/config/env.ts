/**
 * Obtener variables de entorno de forma segura
 * Compatible con Electron + Vite
 */
function getEnvVar(key: string, defaultValue: string = ""): string {
  try {
    // Intentar obtener de import.meta.env (Vite renderer)
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      return (import.meta as any).env[key] || defaultValue;
    }

    // Fallback a process.env si está disponible (Node/Electron main)
    if (typeof process !== "undefined" && process.env) {
      return process.env[key] || defaultValue;
    }

    return defaultValue;
  } catch (error) {
    console.warn(`Error al obtener variable de entorno ${key}:`, error);
    return defaultValue;
  }
}

// Variables de entorno exportadas
export const ENV = {
  API_URL: getEnvVar("VITE_API_URL", "http://localhost:8000"),
  API_URL_SCALY_MEDICO: getEnvVar(
    "VITE_API_URL_SCALY_MEDICO",
    "http://localhost:8080"
  ),
} as const;
