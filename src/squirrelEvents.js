/**
 * Manejo de eventos de Squirrel.Windows
 * Documentación: https://github.com/electron/windows-installer#handling-squirrel-events
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ejecuta el Update.exe con los argumentos especificados
 */
function executeSquirrelCommand(args, callback) {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');

  console.log(`[Squirrel] Ejecutando: ${updateExe} ${args.join(' ')}`);

  const child = spawn(updateExe, args, { detached: true });

  child.on('close', (code) => {
    console.log(`[Squirrel] Comando completado con código: ${code}`);
    if (callback) callback();
  });

  child.on('error', (err) => {
    console.error(`[Squirrel] Error ejecutando comando:`, err);
    if (callback) callback();
  });
}

/**
 * Crea una ventana de instalación personalizada
 */
function createInstallWindow(title, message, isUninstall = false) {
  const installWindow = new BrowserWindow({
    width: 550,
    height: 450,
    frame: false,
    transparent: false,
    backgroundColor: '#f9fafb',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Asegurar que siempre esté al frente
  installWindow.setAlwaysOnTop(true, 'screen-saver');
  installWindow.focus();

  // Leer el logo desde assets
  const fs = require('fs');
  let logoBase64 = '';

  try {
    // En producción, __dirname apunta a resources/app.asar/dist
    // Necesitamos ir a resources/assets
    const logoPath = path.join(process.resourcesPath, 'assets', 'logo.png');
    console.log('[Squirrel] Intentando cargar logo desde:', logoPath);

    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString('base64');
      console.log('[Squirrel] Logo cargado exitosamente');
    } else {
      console.log('[Squirrel] Logo no encontrado en:', logoPath);
      // Fallback: intentar desde __dirname
      const fallbackPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(fallbackPath)) {
        logoBase64 = fs.readFileSync(fallbackPath).toString('base64');
        console.log('[Squirrel] Logo cargado desde fallback');
      }
    }
  } catch (error) {
    console.error('[Squirrel] Error cargando logo:', error);
  }

  // HTML con diseño idéntico a LicenseGate
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          padding: 24px;
          gap: 20px;
        }
        .logo {
          width: 200px;
          height: 200px;
          margin-bottom: 0;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .card {
          width: 100%;
          max-width: 28rem;
          background: white;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }
        .message {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 20px;
          line-height: 1.5;
          text-align: center;
        }
        .button {
          width: 100%;
          background: #1890ff;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
        }
        .button:hover {
          background: #40a9ff;
        }
        .button:active {
          background: #096dd9;
        }
      </style>
    </head>
    <body>
      ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" alt="Logo">` : ''}
      <div class="card">
        <div class="message">
          ${isUninstall ? 'Software de asistencia médica avanzada desinstalado' : 'Software de asistencia médica avanzada instalado'}
        </div>
        <button class="button" onclick="window.close()">Cerrar</button>
      </div>
    </body>
    </html>
  `;

  installWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return installWindow;
}

/**
 * Maneja los eventos de Squirrel
 * Retorna true si se manejó un evento de Squirrel (la app debe salir)
 * Retorna false si no es un evento de Squirrel (la app debe continuar)
 */
export function handleSquirrelEvent() {
  if (process.platform !== 'win32') {
    return false;
  }

  const squirrelCommand = process.argv[1];

  console.log('[Squirrel] Argumentos recibidos:', process.argv);
  console.log('[Squirrel] Comando detectado:', squirrelCommand);

  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Instalación o actualización completada
      console.log('[Squirrel] Instalación/Actualización completada');

      // Crear accesos directos
      executeSquirrelCommand(['--createShortcut', path.basename(process.execPath)]);

      // Mostrar ventana de instalación
      app.whenReady().then(() => {
        console.log('[Squirrel] App ready, creando ventana de instalación');

        const window = createInstallWindow('', '', false);

        // Cerrar cuando el usuario haga clic en el botón
        window.on('closed', () => {
          console.log('[Squirrel] Ventana cerrada por el usuario');
          app.quit();
        });
      });

      return true;

    case '--squirrel-uninstall':
      // Desinstalación
      console.log('[Squirrel] Desinstalando aplicación');

      // Eliminar accesos directos
      executeSquirrelCommand(['--removeShortcut', path.basename(process.execPath)]);

      // Mostrar ventana de desinstalación
      app.whenReady().then(() => {
        console.log('[Squirrel] App ready, creando ventana de desinstalación');

        const window = createInstallWindow('', '', true);

        // Cerrar cuando el usuario haga clic en el botón
        window.on('closed', () => {
          console.log('[Squirrel] Ventana cerrada por el usuario');
          app.quit();
        });
      });

      return true;

    case '--squirrel-obsolete':
      // Esta versión de la app está obsoleta (después de una actualización)
      console.log('[Squirrel] Versión obsoleta, cerrando');
      app.quit();
      return true;

    case '--squirrel-firstrun':
      // Primera ejecución después de la instalación
      console.log('[Squirrel] Primera ejecución después de instalación');

      // Aquí puedes mostrar un tutorial o configuración inicial
      // Por ahora, solo dejamos que la app continúe normalmente
      return false;

    default:
      // No es un evento de Squirrel, la app debe continuar normalmente
      console.log('[Squirrel] No es un evento de Squirrel, continuando normalmente');
      return false;
  }
}
