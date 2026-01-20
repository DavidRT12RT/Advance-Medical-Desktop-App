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
    width: 450,
    height: 280,
    frame: false,
    transparent: false,
    backgroundColor: '#f8fafc',
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
  const logoPath = path.join(__dirname, '../assets/logo.png');
  const fs = require('fs');
  const logoBase64 = fs.readFileSync(logoPath).toString('base64');

  // HTML compacto con logo de Advance
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 380px;
        }
        .logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          border-radius: 12px;
          overflow: hidden;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .message {
          font-size: 16px;
          color: #334155;
          margin-bottom: 24px;
          line-height: 1.5;
          font-weight: 500;
        }
        .button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          outline: none;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }
        .button:active {
          transform: translateY(0);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="data:image/png;base64,${logoBase64}" alt="Advance Logo">
        </div>
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
