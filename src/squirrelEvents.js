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
    width: 600,
    height: 500,
    frame: false,
    transparent: false,
    backgroundColor: '#f9fafb',
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  installWindow.setAlwaysOnTop(true, 'screen-saver');

  const fs = require('fs');
  let logoBase64 = '';
  try {
    const logoPath = path.join(process.resourcesPath, 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath).toString('base64');
    } else {
      const fallbackPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(fallbackPath)) {
        logoBase64 = fs.readFileSync(fallbackPath).toString('base64');
      }
    }
  } catch (error) {
    console.error('[Squirrel] Error cargando logo:', error);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f9fafb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 24px;
        }
        .logo {
          width: 180px;
          height: 180px;
          object-fit: contain;
          margin-bottom: 20px;
        }
        .card {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          padding: 32px;
          text-align: center;
        }
        h2 {
          color: #111827;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        p {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .button {
          display: inline-block;
          width: 100%;
          background-color: #009b9b;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .button:hover {
          background-color: #008181;
        }
      </style>
    </head>
    <body>
      ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}">` : ''}
      <div class="card">
        <h2>${isUninstall ? 'Desinstalación exitosa' : '¡Instalación completa!'}</h2>
        <p>
          ${isUninstall
      ? 'El software de asistencia médica avanzada ha sido eliminado de este equipo.'
      : 'El software de asistencia médica avanzada se ha instalado correctamente y está listo para usarse.'}
        </p>
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

  switch (squirrelCommand) {
    // En tu archivo de eventos de Squirrel
    case '--squirrel-install':
    case '--squirrel-updated':
      // 1. Crear accesos directos primero
      executeSquirrelCommand(['--createShortcut', path.basename(process.execPath)], () => {
        // 2. Mostrar la ventana solo después de que Squirrel termine su trabajo
        app.whenReady().then(() => {
          const window = createInstallWindow('', '', false);

          // Cerrar la app cuando el usuario cierre la ventana de instalación
          window.on('closed', () => {
            app.quit();
          });
        });
      });
      return true;

    case '--squirrel-uninstall':
      // Desinstalación
      // Eliminar accesos directos
      executeSquirrelCommand(['--removeShortcut', path.basename(process.execPath)]);

      // Mostrar ventana de desinstalación
      app.whenReady().then(() => {
        const window = createInstallWindow('', '', true);

        // Cerrar cuando el usuario haga clic en el botón
        window.on('closed', () => {
          app.quit();
        });
      });

      return true;

    case '--squirrel-obsolete':
      // Esta versión de la app está obsoleta (después de una actualización)
      app.quit();
      return true;

    case '--squirrel-firstrun':
      // Primera ejecución después de la instalación

      // Aquí puedes mostrar un tutorial o configuración inicial
      // Por ahora, solo dejamos que la app continúe normalmente
      return false;

    default:
      // No es un evento de Squirrel, la app debe continuar normalmente
      return false;
  }
}
