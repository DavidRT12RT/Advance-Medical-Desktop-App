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
    height: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff',
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

  // HTML de la ventana de instalación con diseño profesional
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
        }
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px;
          text-align: center;
          color: white;
          flex-shrink: 0;
        }
        .icon-container {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          backdrop-filter: blur(10px);
        }
        .icon {
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 8px;
          position: relative;
        }
        .icon::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 8px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 15px;
          opacity: 0.95;
          font-weight: 400;
        }
        .content {
          flex: 1;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .message {
          font-size: 16px;
          color: #4a5568;
          text-align: center;
          margin-bottom: 30px;
          line-height: 1.6;
          max-width: 400px;
        }
        .status {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
          padding: 16px 24px;
          background: ${isUninstall ? '#fff5f5' : '#f0fdf4'};
          border-radius: 12px;
          border: 1px solid ${isUninstall ? '#fed7d7' : '#bbf7d0'};
        }
        .status-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${isUninstall ? '#fc8181' : '#4ade80'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        .status-text {
          color: ${isUninstall ? '#c53030' : '#166534'};
          font-weight: 500;
          font-size: 15px;
        }
        .button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          outline: none;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        .button:active {
          transform: translateY(0);
        }
        .footer {
          padding: 20px;
          text-align: center;
          color: #a0aec0;
          font-size: 13px;
          border-top: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .company {
          font-weight: 600;
          color: #667eea;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon-container">
            <div class="icon"></div>
          </div>
          <h1>${title}</h1>
          <div class="subtitle">AdvanceInteligentSystem</div>
        </div>
        
        <div class="content">
          <div class="message">${message}</div>
          
          <div class="status">
            <div class="status-icon">${isUninstall ? '!' : '✓'}</div>
            <div class="status-text">${isUninstall ? 'Proceso completado' : 'Instalación completada exitosamente'}</div>
          </div>
          
          <button class="button" onclick="window.close()">Aceptar</button>
        </div>
        
        <div class="footer">
          Desarrollado por <span class="company">ScaleFlow</span> © 2026
        </div>
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

        const window = createInstallWindow(
          'Instalación Completada',
          'El sistema ha sido instalado correctamente en tu equipo. Ya puedes comenzar a utilizarlo.',
          false
        );

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

        const window = createInstallWindow(
          'Desinstalación Completada',
          'El sistema ha sido eliminado correctamente de tu equipo. Gracias por utilizar nuestros servicios.',
          true
        );

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
