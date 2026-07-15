/**
 * Auto Updater Service
 * Maneja las actualizaciones automáticas de la aplicación usando archivos binarios desde Firebase Storage
 */

import { app } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, exec } from 'child_process';

class AutoUpdater {
  constructor() {
    this.updateInfo = null;
    this.downloadPath = null;
    this.mainWindow = null;
    this.isDownloading = false;
    this.downloadProgress = {
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    };
  }

  /**
   * Establece la ventana principal para enviar eventos
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Envía un evento a la ventana del renderer
   */
  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Obtiene la versión actual de la aplicación
   */
  getCurrentVersion() {
    return app.getVersion();
  }

  /**
   * Compara dos versiones (semver, incluyendo prereleases como 1.0.0-beta.1)
   */
  compareVersions(v1, v2) {
    const parse = (version) => {
      const [core, ...preParts] = String(version).split('-');
      const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
      while (nums.length < 3) nums.push(0);
      return { nums, pre: preParts.join('-') || null };
    };

    const a = parse(v1);
    const b = parse(v2);

    for (let i = 0; i < 3; i++) {
      if (a.nums[i] > b.nums[i]) return 1;
      if (a.nums[i] < b.nums[i]) return -1;
    }

    // Misma versión base: la versión sin prerelease es mayor (1.0.0 > 1.0.0-beta.1)
    if (!a.pre && !b.pre) return 0;
    if (!a.pre) return 1;
    if (!b.pre) return -1;

    // Comparar identificadores de prerelease segmento por segmento (beta.2 > beta.1)
    const aSegs = a.pre.split('.');
    const bSegs = b.pre.split('.');
    for (let i = 0; i < Math.max(aSegs.length, bSegs.length); i++) {
      const x = aSegs[i];
      const y = bSegs[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const xn = parseInt(x, 10);
      const yn = parseInt(y, 10);
      if (!isNaN(xn) && !isNaN(yn)) {
        if (xn !== yn) return xn > yn ? 1 : -1;
      } else if (x !== y) {
        return x > y ? 1 : -1;
      }
    }
    return 0;
  }

  /**
   * Verifica si hay una actualización disponible
   */
  checkForUpdate(updateInfo) {
    const currentVersion = this.getCurrentVersion();
    const newVersion = updateInfo.version;

    console.log(`[AutoUpdater] Versión actual: ${currentVersion}`);
    console.log(`[AutoUpdater] Nueva versión: ${newVersion}`);

    if (this.compareVersions(newVersion, currentVersion) > 0) {
      this.updateInfo = updateInfo;
      return true;
    }

    return false;
  }

  /**
   * Obtiene la URL de descarga según la plataforma
   */
  getDownloadUrl() {
    if (!this.updateInfo || !this.updateInfo.descargas) {
      throw new Error('No hay información de actualización disponible');
    }

    const platform = process.platform;
    let downloadInfo = null;

    if (platform === 'win32' && this.updateInfo.descargas.windows) {
      downloadInfo = this.updateInfo.descargas.windows;
    } else if (platform === 'darwin' && this.updateInfo.descargas.mac) {
      downloadInfo = this.updateInfo.descargas.mac;
    } else if (platform === 'linux' && this.updateInfo.descargas.linux) {
      downloadInfo = this.updateInfo.descargas.linux;
    }

    if (!downloadInfo) {
      throw new Error(`No hay descarga disponible para la plataforma: ${platform}`);
    }

    return downloadInfo;
  }

  /**
   * Calcula el checksum SHA256 de un archivo
   */
  calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Descarga el archivo de actualización
   */
  async downloadUpdate(updateInfo) {
    if (this.isDownloading) {
      throw new Error('Ya hay una descarga en progreso');
    }

    // Si se proporciona updateInfo, actualizarlo
    if (updateInfo) {
      this.updateInfo = updateInfo;
    }

    const downloadInfo = this.getDownloadUrl();
    const url = downloadInfo.url;
    const expectedChecksum = downloadInfo.checksum;

    // Determinar la extensión del archivo según la plataforma
    let extension = '.exe';
    if (process.platform === 'darwin') extension = '.dmg';
    if (process.platform === 'linux') extension = '.AppImage';

    // Crear directorio temporal
    const tempDir = path.join(app.getPath('temp'), 'aim-updates');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    this.downloadPath = path.join(
      tempDir,
      `AIM-Setup-${this.updateInfo.version}${extension}`
    );

    console.log(`[AutoUpdater] Descargando desde: ${url}`);
    console.log(`[AutoUpdater] Guardando en: ${this.downloadPath}`);

    this.isDownloading = true;
    this.sendToRenderer('update-download-started', { version: this.updateInfo.version });

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(this.downloadPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      let startTime = Date.now();
      let lastProgressTime = Date.now();

      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Error al descargar: ${response.statusCode}`));
          return;
        }

        totalBytes = parseInt(response.headers['content-length'], 10);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          const elapsed = (now - startTime) / 1000;
          const bytesPerSecond = downloadedBytes / elapsed;
          const percent = (downloadedBytes / totalBytes) * 100;

          // Enviar progreso cada 500ms
          if (now - lastProgressTime > 500) {
            this.downloadProgress = {
              percent,
              transferred: downloadedBytes,
              total: totalBytes,
              bytesPerSecond,
            };

            this.sendToRenderer('update-download-progress', this.downloadProgress);
            lastProgressTime = now;
          }
        });

        response.pipe(file);

        file.on('finish', async () => {
          file.close();
          this.isDownloading = false;

          console.log('[AutoUpdater] Descarga completada');
          console.log('[AutoUpdater] Verificando checksum...');

          try {
            // Verificar checksum
            const actualChecksum = await this.calculateChecksum(this.downloadPath);

            if (actualChecksum !== expectedChecksum) {
              fs.unlinkSync(this.downloadPath);
              reject(new Error('El checksum no coincide. Archivo corrupto.'));
              return;
            }

            console.log('[AutoUpdater] Checksum verificado correctamente');
            this.sendToRenderer('update-downloaded', {
              version: this.updateInfo.version,
              path: this.downloadPath,
            });

            resolve(this.downloadPath);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', (error) => {
        this.isDownloading = false;
        fs.unlink(this.downloadPath, () => { });
        reject(error);
      });
    });
  }

  /**
   * Instala la actualización descargada
   */
  async installUpdate() {
    if (!this.downloadPath || !fs.existsSync(this.downloadPath)) {
      throw new Error('No hay actualización descargada para instalar');
    }

    console.log('[AutoUpdater] Instalando actualización...');
    this.sendToRenderer('update-installing', { version: this.updateInfo.version });

    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: Ejecutar el instalador .exe
      // El instalador debe ser silencioso y reemplazar la aplicación actual
      spawn(this.downloadPath, ['/S'], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      // Cerrar la aplicación actual
      setTimeout(() => {
        app.quit();
      }, 1000);
    } else if (platform === 'darwin') {
      // macOS: Instalación automática del DMG
      await this.installMacOSUpdate();
    } else if (platform === 'linux') {
      // Linux: Hacer ejecutable el .AppImage y ejecutarlo
      fs.chmodSync(this.downloadPath, '755');

      spawn(this.downloadPath, [], {
        detached: true,
        stdio: 'ignore',
      }).unref();

      // Cerrar la aplicación actual
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  }

  /**
   * Instala la actualización en macOS de forma automática
   */
  async installMacOSUpdate() {
    return new Promise((resolve, reject) => {

      console.log('[AutoUpdater] Iniciando instalación automática en macOS...');

      // Paso 1: Montar el DMG
      const mountCommand = `hdiutil attach "${this.downloadPath}" -nobrowse -mountpoint /Volumes/AIM-Update`;

      exec(mountCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('[AutoUpdater] Error montando DMG:', error);
          reject(new Error('Error al montar el DMG'));
          return;
        }

        console.log('[AutoUpdater] DMG montado correctamente');

        // Paso 2: Encontrar el archivo .app en el volumen montado
        const volumePath = '/Volumes/AIM-Update';
        let appName = null;

        try {
          const files = fs.readdirSync(volumePath);
          appName = files.find(file => file.endsWith('.app'));

          if (!appName) {
            throw new Error('No se encontró archivo .app en el DMG');
          }

          console.log(`[AutoUpdater] Aplicación encontrada: ${appName}`);
        } catch (err) {
          console.error('[AutoUpdater] Error leyendo volumen:', err);
          // Desmontar DMG
          exec(`hdiutil detach /Volumes/AIM-Update`, () => { });
          reject(new Error('No se pudo leer el contenido del DMG'));
          return;
        }

        const sourcePath = path.join(volumePath, appName);
        const destPath = `/Applications/${appName}`;

        // Paso 3: Eliminar la versión anterior si existe
        if (fs.existsSync(destPath)) {
          console.log('[AutoUpdater] Eliminando versión anterior...');
          const removeCommand = `rm -rf "${destPath}"`;

          exec(removeCommand, (removeError) => {
            if (removeError) {
              console.error('[AutoUpdater] Error eliminando versión anterior:', removeError);
              // Continuar de todos modos
            }

            // Paso 4: Copiar la nueva versión a Applications
            this.copyAppToApplications(sourcePath, destPath, resolve, reject);
          });
        } else {
          // Paso 4: Copiar la nueva versión a Applications
          this.copyAppToApplications(sourcePath, destPath, resolve, reject);
        }
      });
    });
  }

  /**
   * Copia la aplicación a la carpeta Applications
   */
  copyAppToApplications(sourcePath, destPath, resolve, reject) {

    console.log(`[AutoUpdater] Copiando aplicación de ${sourcePath} a ${destPath}...`);

    const copyCommand = `cp -R "${sourcePath}" "${destPath}"`;

    exec(copyCommand, (copyError) => {
      // Paso 5: Desmontar el DMG
      exec('hdiutil detach /Volumes/AIM-Update', (detachError) => {
        if (detachError) {
          console.error('[AutoUpdater] Error desmontando DMG:', detachError);
        }

        if (copyError) {
          console.error('[AutoUpdater] Error copiando aplicación:', copyError);
          reject(new Error('Error al copiar la aplicación a Applications'));
          return;
        }

        console.log('[AutoUpdater] Aplicación instalada correctamente');

        // Paso 6: Abrir la nueva versión
        const openCommand = `open "${destPath}"`;

        exec(openCommand, (openError) => {
          if (openError) {
            console.error('[AutoUpdater] Error abriendo nueva versión:', openError);
          }

          // Paso 7: Cerrar la aplicación actual
          setTimeout(() => {
            console.log('[AutoUpdater] Cerrando aplicación actual...');
            app.quit();
            resolve();
          }, 1000);
        });
      });
    });
  }

  /**
   * Cancela la descarga actual
   */
  cancelDownload() {
    if (this.isDownloading) {
      this.isDownloading = false;
      if (this.downloadPath && fs.existsSync(this.downloadPath)) {
        fs.unlinkSync(this.downloadPath);
      }
      this.sendToRenderer('update-download-cancelled', {});
    }
  }

  /**
   * Limpia archivos temporales
   */
  cleanup() {
    const tempDir = path.join(app.getPath('temp'), 'aim-updates');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Exportar instancia singleton
const autoUpdater = new AutoUpdater();
export default autoUpdater;
