const { ipcRenderer, webFrame } = require('electron');

// Sin contextIsolation, exponemos directamente en window
window.device = {
  getMachineId: () => ipcRenderer.invoke('device:getMachineId'),
  getMacAddresses: () => ipcRenderer.invoke('device:getMacAddresses'),
  getIpAddresses: () => ipcRenderer.invoke('device:getIpAddresses'),
  getSystemInfo: () => ipcRenderer.invoke('device:getSystemInfo'),
  getAllDeviceInfo: async () => {
    try {
      const [id, macs, ips, sys] = await Promise.all([
        ipcRenderer.invoke('device:getMachineId').catch(() => null),
        ipcRenderer.invoke('device:getMacAddresses').catch(() => []),
        ipcRenderer.invoke('device:getIpAddresses').catch(() => []),
        ipcRenderer.invoke('device:getSystemInfo').catch(() => ({})),
      ]);
      const browser = (() => {
        try {
          const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();
          return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screen: {
              width: window.screen?.width,
              height: window.screen?.height,
              availWidth: window.screen?.availWidth,
              availHeight: window.screen?.availHeight,
              colorDepth: window.screen?.colorDepth,
              pixelRatio: window.devicePixelRatio,
            },
            timezone: tz,
          };
        } catch {
          return {};
        }
      })();
      return {
        machineId: id,
        macAddresses: Array.isArray(macs) ? macs : [],
        ipAddresses: Array.isArray(ips) ? ips : [],
        system: sys || {},
        browser,
      };
    } catch (e) {
      console.error('Error composing device info:', e);
      return {};
    }
  },
};

window.electronStore = {
  // Auth methods
  setUser: (user) => ipcRenderer.invoke('store:setUser', user),
  getAuthData: () => ipcRenderer.invoke('store:getAuthData'),
  setMachineId: (machineId) => ipcRenderer.invoke('store:setMachineId', machineId),
  logout: () => ipcRenderer.invoke('store:logout'),

  // License methods
  setLicenseData: (licenseData) => ipcRenderer.invoke('store:setLicenseData', licenseData),
  getLicenseData: () => ipcRenderer.invoke('store:getLicenseData'),
  setLicenseValid: (isValid, expiryDate, features) => ipcRenderer.invoke('store:setLicenseValid', isValid, expiryDate, features),

  // Utility methods
  getAllData: () => ipcRenderer.invoke('store:getAllData'),
  isLicenseActiveWithGrace: () => ipcRenderer.invoke('store:isLicenseActiveWithGrace'),
};

window.estudioExport = {
  // Exportar carpeta del estudio (PDF + fotos + video) a USB/disco
  exportarCarpeta: (payload) => ipcRenderer.invoke('estudio:exportarCarpeta', payload),
  // Guardado local en tiempo real de fotos/video del estudio
  guardarArchivoLocal: (payload) => ipcRenderer.invoke('estudio:guardarArchivoLocal', payload),
  leerArchivoLocal: (payload) => ipcRenderer.invoke('estudio:leerArchivoLocal', payload),
  exportarArchivosLocales: (payload) => ipcRenderer.invoke('estudio:exportarArchivosLocales', payload),
  // Mostrar un archivo local en el explorador del sistema
  mostrarEnCarpeta: (payload) => ipcRenderer.invoke('estudio:mostrarEnCarpeta', payload),
};

window.appZoom = {
  // Zoom de accesibilidad de toda la aplicación (1 = 100%). Se aplica
  // directo en el renderer con webFrame (síncrono); el IPC queda de respaldo.
  setZoomFactor: async (factor) => {
    const f = Math.min(1.6, Math.max(0.75, Number(factor) || 1));
    try {
      webFrame.setZoomFactor(f);
      return { success: true, factor: f };
    } catch (e) {
      return ipcRenderer.invoke('app:setZoomFactor', f);
    }
  },
};

window.updater = {
  getCurrentVersion: () => ipcRenderer.invoke('update:getCurrentVersion'),
  checkForUpdates: () => ipcRenderer.invoke('update:checkForUpdates'),
  downloadUpdate: (updateInfo) => ipcRenderer.invoke('update:downloadUpdate', updateInfo),
  installUpdate: () => ipcRenderer.invoke('update:installUpdate'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', () => callback()),
  onDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (_, error) => callback(error)),
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('update:available');
    ipcRenderer.removeAllListeners('update:not-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update:error');
  },
};
