import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow, ipcMain } from 'electron';
import { machineId } from 'node-machine-id';
import { networkInterfaces, hostname, platform, release, arch, totalmem, freemem, cpus, userInfo } from 'os';
import * as electronStore from './services/electronStore.js';
import autoUpdater from './services/autoUpdater.js';
import { handleSquirrelEvent } from './squirrelEvents.js';
import { createRequire } from 'module';

// Para usar __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Para importar módulos CommonJS en ES modules
const require = createRequire(import.meta.url);

// Manejar eventos de Squirrel (instalación, actualización, desinstalación).
// Durante estos eventos squirrelEvents.js muestra su propia ventana; no debe
// ejecutarse el arranque normal (ventana principal, accesos directos, etc.).
// El quit ocurre vía 'window-all-closed' al cerrar la ventana de instalación.
const isSquirrelEvent = handleSquirrelEvent();

// Crear acceso directo en escritorio después de la instalación (solo Windows)
if (!isSquirrelEvent && process.platform === 'win32') {
  app.setAppUserModelId('com.scaleflow.aim-desktop');

  // En la primera ejecución después de instalar, crear acceso directo
  app.whenReady().then(() => {
    const desktopPath = path.join(app.getPath('home'), 'Desktop');
    const shortcutPath = path.join(desktopPath, 'AIM Desktop.lnk');

    // Crear acceso directo si no existe
    if (!require('fs').existsSync(shortcutPath)) {
      try {
        const success = require('electron').shell.writeShortcutLink(shortcutPath, {
          target: process.execPath,
          description: 'AIM Desktop - Sistema de Gestión Médica',
          appUserModelId: 'com.scaleflow.aim-desktop'
        });
        if (success) {
          console.log('[Main] Acceso directo creado en escritorio');
        }
      } catch (error) {
        console.error('[Main] Error creando acceso directo:', error);
      }
    }
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: 'assets/icon.ico',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Acceso a FS
      enableRemoteModule: true, //Senales desde React a Electron
      contextIsolation: false, // Permite acceso completo al contexto
      webSecurity: false, // Deshabilita CORS para desarrollo (permite SSE/WebSocket con localhost)
    },
    title: "Advance Desktop App",
  });

  //Ocultar barra de menu
  mainWindow.setMenuBarVisibility(false);

  // Configurar manejo de permisos (Cámara y Micrófono)
  // Esto es crucial para que funcione en la versión empaquetada
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'camera', 'microphone', 'display-capture'];
    if (allowedPermissions.includes(permission)) {
      // Aprobar permisos de medios automáticamente (el OS aún pedirá confirmación al usuario)
      callback(true);
    } else {
      callback(false);
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools solo en desarrollo
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // TEMPORAL (beta): permitir abrir la consola con F12 también en el build
  // empaquetado, para diagnosticar problemas de licencia/red en máquinas
  // externas. Quitar cuando el despliegue esté estable.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Configurar autoUpdater con la ventana principal
  autoUpdater.setMainWindow(mainWindow);

  return mainWindow;
};

if (!isSquirrelEvent) {
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for device information
ipcMain.handle('device:getMachineId', async () => {
  try {
    return await machineId();
  } catch (error) {
    console.error('Error getting machine ID:', error);
    return null;
  }
});

ipcMain.handle('device:getMacAddresses', async () => {
  try {
    const interfaces = networkInterfaces();
    const macAddresses = [];

    for (const interfaceName in interfaces) {
      const networkInterface = interfaces[interfaceName];
      if (networkInterface) {
        networkInterface.forEach((details) => {
          if (details.mac && details.mac !== '00:00:00:00:00:00') {
            macAddresses.push(details.mac);
          }
        });
      }
    }

    return [...new Set(macAddresses)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting MAC addresses:', error);
    return [];
  }
});

ipcMain.handle('device:getIpAddresses', async () => {
  try {
    const interfaces = networkInterfaces();
    const ips = [];
    // Debug: list interface names
    try { console.debug('[device:getIpAddresses] interfaces keys:', Object.keys(interfaces || {})); } catch { }
    for (const name in interfaces) {
      const list = interfaces[name];
      if (!list) continue;
      list.forEach((details) => {
        const isValid = !details.internal && details.address;
        if (!isValid) return;
        if (details.family === 'IPv4' || details.family === 4) {
          ips.push(details.address);
        } else if (details.family === 'IPv6' || details.family === 6) {
          // incluir IPv6 globales (no link-local fe80::)
          if (!details.address.startsWith('fe80')) ips.push(details.address);
        }
      });
    }
    let unique = [...new Set(ips)];
    // Fallback: include internal IPv4 if we didn't find any external
    if (unique.length === 0) {
      for (const name in interfaces) {
        const list = interfaces[name];
        if (!list) continue;
        list.forEach((details) => {
          if ((details.family === 'IPv4' || details.family === 4) && details.address) {
            unique.push(details.address);
          }
        });
      }
      unique = [...new Set(unique)];
    }
    try { console.debug('[device:getIpAddresses] result:', unique); } catch { }
    return unique;
  } catch (error) {
    console.error('Error getting IP addresses:', error);
    return [];
  }
});

ipcMain.handle('device:getNetworkSummary', async () => {
  try {
    const interfaces = networkInterfaces();
    const summary = [];
    for (const name in interfaces) {
      const list = interfaces[name];
      if (!list) continue;
      list.forEach((details) => {
        summary.push({
          interface: name,
          address: details.address,
          family: typeof details.family === 'string' ? details.family : details.family === 4 ? 'IPv4' : 'IPv6',
          internal: details.internal,
          mac: details.mac,
          netmask: details.netmask,
          cidr: details.cidr,
          scopeid: details.scopeid,
        });
      });
    }
    try { console.debug('[device:getNetworkSummary] result count:', summary.length); } catch { }
    return summary;
  } catch (error) {
    console.error('Error getting network summary:', error);
    return [];
  }
});

ipcMain.handle('device:getSystemInfo', async () => {
  try {
    const cpuList = (() => { try { return cpus() || []; } catch { return []; } })();
    const primaryCpu = cpuList[0] || { model: undefined, speed: undefined };
    const totalBytes = (() => { try { return totalmem(); } catch { return undefined; } })();
    const freeBytes = (() => { try { return freemem(); } catch { return undefined; } })();
    const toGB = (n) => Math.round((n / (1024 ** 3)) * 100) / 100;
    const getSystemVersion = () => {
      try {
        return typeof process.getSystemVersion === 'function' ? process.getSystemVersion() : undefined;
      } catch {
        return undefined;
      }
    };
    const info = {
      hostname: (() => { try { return hostname(); } catch { return undefined; } })(),
      platform: (() => { try { return platform(); } catch { return process.platform; } })(),
      release: (() => { try { return release(); } catch { return undefined; } })(),
      arch: (() => { try { return arch(); } catch { return process.arch; } })(),
      osVersion: getSystemVersion(),
      totalmemBytes: totalBytes,
      freememBytes: freeBytes,
      totalmemGB: typeof totalBytes === 'number' ? toGB(totalBytes) : undefined,
      freememGB: typeof freeBytes === 'number' ? toGB(freeBytes) : undefined,
      cpuModel: primaryCpu.model,
      cpuCores: cpuList.length,
      cpuSpeedMHz: primaryCpu.speed,
      username: (() => { try { return userInfo().username; } catch { return undefined; } })(),
      nodeVersion: process.version,
      electron: process.versions?.electron,
      chrome: process.versions?.chrome,
      appVersion: (() => { try { return app.getVersion(); } catch { return undefined; } })(),
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })(),
      locale: (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return undefined; } })(),
    };
    try { console.debug('[device:getSystemInfo] result:', info); } catch { }
    return info;
  } catch (error) {
    console.error('Error getting system info:', error);
    return {};
  }
});

ipcMain.handle('device:getAllDeviceInfo', async () => {
  try {
    const [id, macs, ips, sys] = await Promise.all([
      machineId().catch(() => null),
      (async () => {
        const interfaces = networkInterfaces();
        const macs = [];
        for (const name in interfaces) {
          const list = interfaces[name];
          if (!list) continue;
          list.forEach((details) => {
            if (details.mac && details.mac !== '00:00:00:00:00:00') macs.push(details.mac);
          });
        }
        return [...new Set(macs)];
      })(),
      (async () => {
        const interfaces = networkInterfaces();
        const ips = [];
        for (const name in interfaces) {
          const list = interfaces[name];
          if (!list) continue;
          list.forEach((details) => {
            if (details.family === 'IPv4' && !details.internal && details.address) ips.push(details.address);
          });
        }
        return [...new Set(ips)];
      })(),
      (async () => {
        const cpuList = cpus() || [];
        const primaryCpu = cpuList[0] || { model: undefined, speed: undefined };
        return {
          hostname: hostname(),
          platform: platform(),
          release: release(),
          arch: arch(),
          totalmemBytes: totalmem(),
          freememBytes: freemem(),
          cpuModel: primaryCpu.model,
          cpuCores: cpuList.length,
          cpuSpeedMHz: primaryCpu.speed,
          username: (() => { try { return userInfo().username; } catch { return undefined; } })(),
          nodeVersion: process.version,
          versions: process.versions,
          appVersion: app.getVersion(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: Intl.DateTimeFormat().resolvedOptions().locale,
        };
      })(),
    ]);

    return {
      machineId: id,
      macAddresses: macs,
      ipAddresses: ips,
      system: sys,
      capturedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting full device info:', error);
    return {};
  }
});

// IPC handlers for Electron Store
ipcMain.handle('store:setUser', async (event, user) => {
  electronStore.setUser(user);
});

ipcMain.handle('store:getAuthData', async () => {
  return electronStore.getAuthData();
});

ipcMain.handle('store:setMachineId', async (event, machineId) => {
  electronStore.setMachineId(machineId);
});

ipcMain.handle('store:logout', async () => {
  electronStore.logout();
});

ipcMain.handle('store:setLicenseData', async (event, licenseData) => {
  electronStore.setLicenseData(licenseData);
});

ipcMain.handle('store:getLicenseData', async () => {
  return electronStore.getLicenseData();
});

ipcMain.handle('store:setLicenseValid', async (event, isValid, expiryDate, features) => {
  electronStore.setLicenseValid(isValid, expiryDate, features);
});

ipcMain.handle('store:getAllData', async () => {
  return electronStore.getAllData();
});

ipcMain.handle('store:isLicenseActiveWithGrace', async () => {
  return electronStore.isLicenseActiveWithGrace();
});

// ============================================
// IPC handlers for Auto Updates
// ============================================

ipcMain.handle('update:getCurrentVersion', async () => {
  return autoUpdater.getCurrentVersion();
});

ipcMain.handle('update:checkForUpdate', async (event, updateInfo) => {
  try {
    return autoUpdater.checkForUpdate(updateInfo);
  } catch (error) {
    console.error('[IPC] Error checking for update:', error);
    return false;
  }
});

ipcMain.handle('update:downloadUpdate', async (event, updateInfo) => {
  try {
    console.log("[IPC] Downloading update:", updateInfo);
    const downloadPath = await autoUpdater.downloadUpdate(updateInfo);
    return { success: true, path: downloadPath };
  } catch (error) {
    console.error('[IPC] Error downloading update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:installUpdate', async () => {
  try {
    await autoUpdater.installUpdate();
    return { success: true };
  } catch (error) {
    console.error('[IPC] Error installing update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:cancelDownload', async () => {
  autoUpdater.cancelDownload();
  return { success: true };
});

ipcMain.handle('update:getDownloadProgress', async () => {
  return autoUpdater.downloadProgress;
});

