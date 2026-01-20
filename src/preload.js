const { ipcRenderer } = require('electron');

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
