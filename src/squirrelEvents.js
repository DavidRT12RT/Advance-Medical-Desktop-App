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
function executeSquirrelCommand(args) {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');

  spawn(updateExe, args, { detached: true })
    .on('close', () => {
      app.quit();
    });
}

/**
 * Crea una ventana de instalación personalizada
 */
function createInstallWindow(title, message) {
  const installWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // HTML de la ventana de instalación
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
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          color: white;
          width: 450px;
        }
        .logo {
          font-size: 60px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        p {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 30px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-top: 5px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏥</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="spinner"></div>
        <div class="footer">ScaleFlow © 2026</div>
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
    case '--squirrel-install':
    case '--squirrel-updated':
      // Instalación o actualización completada
      console.log('[Squirrel] Instalación/Actualización completada');

      // Crear accesos directos
      executeSquirrelCommand(['--createShortcut', path.basename(process.execPath)]);

      // Mostrar ventana de instalación
      app.whenReady().then(() => {
        const window = createInstallWindow(
          '¡Instalación Exitosa!',
          'AdvanceInteligentSystem se ha instalado correctamente'
        );

        // Cerrar después de 3 segundos
        setTimeout(() => {
          window.close();
          app.quit();
        }, 3000);
      });

      return true;

    case '--squirrel-uninstall':
      // Desinstalación
      console.log('[Squirrel] Desinstalando aplicación');

      // Eliminar accesos directos
      executeSquirrelCommand(['--removeShortcut', path.basename(process.execPath)]);

      // Mostrar ventana de desinstalación
      app.whenReady().then(() => {
        const window = createInstallWindow(
          'Desinstalando...',
          'Eliminando AdvanceInteligentSystem de tu sistema'
        );

        setTimeout(() => {
          window.close();
          app.quit();
        }, 2000);
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
      return false;
  }
}
