/**
 * Utilidad para extraer la versión de un archivo binario de Electron
 * basándose en el nombre del archivo.
 * 
 * Esta es la implementación más simple y confiable para mantener
 * package.json como única fuente de verdad.
 */

/**
 * Extrae la versión del nombre del archivo usando regex
 * 
 * Ejemplos de nombres soportados:
 * - AIM-Desktop-Setup-1.0.1.exe → "1.0.1"
 * - AdvanceInteligentSystem-1.0.1.dmg → "1.0.1"
 * - advanceintelligentsystem_1.0.1_amd64.deb → "1.0.1"
 * - AIM-Desktop-Setup-2.5.10.exe → "2.5.10"
 * 
 * @param {string} filename - Nombre del archivo (con o sin ruta)
 * @returns {string|null} - Versión en formato semver (X.Y.Z) o null si no se encuentra
 */
export function extractVersionFromFilename(filename) {
  // Extraer solo el nombre del archivo si viene con ruta
  const basename = filename.split('/').pop().split('\\').pop();

  // Regex para capturar versión semántica (X.Y.Z)
  // Busca 3 números separados por puntos
  const versionRegex = /(\d+\.\d+\.\d+)/;
  const match = basename.match(versionRegex);

  return match ? match[1] : null;
}

/**
 * Valida que una versión tenga formato semver válido
 * 
 * @param {string} version - Versión a validar
 * @returns {boolean} - true si es válida, false si no
 */
export function isValidVersion(version) {
  if (!version || typeof version !== 'string') return false;

  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

/**
 * Extrae información completa del archivo
 * 
 * @param {File} file - Objeto File del navegador
 * @returns {Object} - Objeto con información del archivo
 */
export function extractFileInfo(file) {
  const version = extractVersionFromFilename(file.name);

  // Detectar plataforma basándose en la extensión
  let platform = 'unknown';
  if (file.name.endsWith('.exe')) platform = 'windows';
  else if (file.name.endsWith('.dmg')) platform = 'mac';
  else if (file.name.endsWith('.deb') || file.name.endsWith('.rpm')) platform = 'linux';

  return {
    filename: file.name,
    version: version,
    isValidVersion: isValidVersion(version),
    platform: platform,
    size: file.size,
    type: file.type,
  };
}

/**
 * Formatea el tamaño del archivo en formato legible
 * 
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado (ej: "150 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Exportar todas las funciones
export default {
  extractVersionFromFilename,
  isValidVersion,
  extractFileInfo,
  formatFileSize,
};
