/**
 * Manejo SIMPLIFICADO de eventos de Squirrel.Windows
 * Basado en: https://github.com/electron/windows-installer#handling-squirrel-events
 */

import { app } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Escribe logs en un archivo para debug
 */
function logToFile(message) {
  const logPath = path.join(app.getPath('temp'), 'aim-squirrel.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  console.log(message);
}

/**
 * Ejecuta Update.exe con argumentos
 */
function runSquirrelCommand(args) {
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  logToFile(`Ejecutando: ${updateExe} ${args.join(' ')}`);

  const child = spawn(updateExe, args, { detached: true });
  child.unref();
}

/**
 * Maneja eventos de Squirrel
 */
export function handleSquirrelEvent() {
  if (process.platform !== 'win32') {
    return false;
  }

  const target = path.basename(process.execPath);
  const squirrelEvent = process.argv[1];

  logToFile(`=== SQUIRREL EVENT ===`);
  logToFile(`Argumentos: ${JSON.stringify(process.argv)}`);
  logToFile(`Evento: ${squirrelEvent}`);
  logToFile(`Target: ${target}`);
  logToFile(`ExecPath: ${process.execPath}`);

  switch (squirrelEvent) {
    case '--squirrel-install':
      logToFile('EVENTO: Instalación');
      runSquirrelCommand(['--createShortcut', target]);
      setTimeout(() => app.quit(), 1000);
      return true;

    case '--squirrel-updated':
      logToFile('EVENTO: Actualización');
      runSquirrelCommand(['--createShortcut', target]);
      setTimeout(() => app.quit(), 1000);
      return true;

    case '--squirrel-uninstall':
      logToFile('EVENTO: Desinstalación');
      runSquirrelCommand(['--removeShortcut', target]);
      setTimeout(() => app.quit(), 1000);
      return true;

    case '--squirrel-obsolete':
      logToFile('EVENTO: Obsoleto');
      setTimeout(() => app.quit(), 1000);
      return true;

    default:
      logToFile('No es evento de Squirrel, continuando...');
      return false;
  }
}
