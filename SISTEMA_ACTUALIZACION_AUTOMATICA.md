# 🚀 Sistema de Actualización Automática - AIM Desktop App

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Datos Firebase](#estructura-de-datos-firebase)
4. [Implementación Técnica](#implementación-técnica)
5. [Proceso de Publicación (CRM)](#proceso-de-publicación-crm)
6. [Flujo de Usuario](#flujo-de-usuario)
7. [Seguridad y Verificación](#seguridad-y-verificación)
8. [Rollback y Recuperación](#rollback-y-recuperación)

---

## 🎯 Visión General

### ¿Qué hacen las grandes empresas?

**Slack, Discord, VS Code, Spotify** usan:
- ✅ **electron-updater** (biblioteca oficial de Electron)
- ✅ **Servidor de releases** (GitHub Releases, AWS S3, CDN)
- ✅ **Versionado semántico** (SemVer: MAJOR.MINOR.PATCH)
- ✅ **Actualizaciones silenciosas** en segundo plano
- ✅ **Verificación de integridad** (checksums SHA256)
- ✅ **Canales de distribución** (stable, beta, alpha)
- ✅ **Rollback automático** si falla la actualización

### Nuestra Estrategia

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   CRM Web    │ ───> │   Firebase   │ ───> │ Desktop App  │
│  (Publish)   │      │  (Metadata)  │      │  (Install)   │
└──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ↓
                      ┌──────────────┐
                      │  AWS S3/CDN  │
                      │  (Binaries)  │
                      └──────────────┘
```

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

#### 1. **Firebase Firestore** (Metadata)
- Ruta: `empresas/{idEmpresa}/actualizaciones-software-aim`
- Almacena información de versiones
- Listener en tiempo real para detectar actualizaciones

#### 2. **AWS S3 / CDN** (Binarios)
- Almacena archivos `.exe`, `.dmg`, `.AppImage`
- URLs públicas con firma temporal
- Distribución global con CDN

#### 3. **electron-updater** (Cliente)
- Descarga e instala actualizaciones
- Verifica integridad (SHA256)
- Maneja el proceso de instalación

#### 4. **CRM Web** (Publicación)
- Interfaz para subir nuevas versiones
- Genera checksums automáticamente
- Publica en Firebase y S3

---

## 🗄️ Estructura de Datos Firebase

### Documento: `actualizaciones-software-aim/{versionId}`

```typescript
interface ActualizacionSoftware {
  // ═══════════════════════════════════════════════════════
  // IDENTIFICACIÓN
  // ═══════════════════════════════════════════════════════
  id: string;                    // UUID único: "550e8400-e29b-41d4-a716-446655440000"
  version: string;               // SemVer: "1.5.2"
  versionCode: number;           // Numérico: 152 (para comparación)
  
  // ═══════════════════════════════════════════════════════
  // METADATOS
  // ═══════════════════════════════════════════════════════
  nombre: string;                // "Actualización de Invierno 2026"
  descripcion: string;           // "Mejoras de rendimiento y nuevas funciones"
  fechaPublicacion: string;      // ISO: "2026-01-19T22:00:00.000Z"
  
  // ═══════════════════════════════════════════════════════
  // TIPO Y PRIORIDAD
  // ═══════════════════════════════════════════════════════
  tipo: "major" | "minor" | "patch" | "hotfix";
  prioridad: "critica" | "alta" | "media" | "baja";
  obligatoria: boolean;          // Si true, fuerza actualización
  
  // ═══════════════════════════════════════════════════════
  // CHANGELOG (Notas de la versión)
  // ═══════════════════════════════════════════════════════
  changelog: {
    nuevas: string[];            // ["Nueva función de reportes PDF mejorados"]
    correcciones: string[];      // ["Corregido bug en login"]
    mejoras: string[];           // ["Optimización de carga de imágenes"]
    breaking: string[];          // ["Cambio en estructura de base de datos"]
  };
  
  // ═══════════════════════════════════════════════════════
  // DESCARGAS POR PLATAFORMA
  // ═══════════════════════════════════════════════════════
  descargas: {
    windows: {
      url: string;               // "https://cdn.aim.com/releases/1.5.2/AIM-Setup-1.5.2.exe"
      checksum: string;          // SHA256: "a3d5f6..."
      tamano: number;            // Bytes: 85000000
      arquitectura: "x64" | "arm64";
    };
    mac: {
      url: string;               // "https://cdn.aim.com/releases/1.5.2/AIM-1.5.2.dmg"
      checksum: string;
      tamano: number;
      arquitectura: "x64" | "arm64" | "universal";
    };
    linux: {
      url: string;               // "https://cdn.aim.com/releases/1.5.2/AIM-1.5.2.AppImage"
      checksum: string;
      tamano: number;
      arquitectura: "x64" | "arm64";
    };
  };
  
  // ═══════════════════════════════════════════════════════
  // CONTROL DE DISTRIBUCIÓN
  // ═══════════════════════════════════════════════════════
  canal: "stable" | "beta" | "alpha";
  disponiblePara: string[];      // ["all"] o ["org1", "org2"] (IDs de organizaciones)
  regionesDisponibles: string[]; // ["MX", "US", "ES"] o ["all"]
  
  // ═══════════════════════════════════════════════════════
  // REQUISITOS
  // ═══════════════════════════════════════════════════════
  versionMinimaRequerida: string; // "1.0.0" - No puede actualizar desde versiones anteriores
  requiereReinicio: boolean;      // true = reiniciar app, false = hot reload
  requiereMigracionDatos: boolean; // Si necesita migrar base de datos local
  
  // ═══════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════
  activa: boolean;               // Si está disponible para descarga
  retirada: boolean;             // Si se retiró por problemas críticos
  motivoRetiro?: string;         // "Bug crítico detectado en módulo X"
  
  // ═══════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════
  estadisticas: {
    descargas: number;           // Cuántas veces se descargó
    instalaciones: number;       // Cuántas instalaciones exitosas
    errores: number;             // Cuántos errores de instalación
    rollbacks: number;           // Cuántas veces se hizo rollback
  };
  
  // ═══════════════════════════════════════════════════════
  // AUDITORÍA
  // ═══════════════════════════════════════════════════════
  creadoPor: string;             // Usuario del CRM que publicó
  emailCreador: string;
  fechaCreacion: string;         // ISO timestamp
  modificadoPor?: string;
  fechaModificacion?: string;
  
  // ═══════════════════════════════════════════════════════
  // CONFIGURACIÓN AVANZADA
  // ═══════════════════════════════════════════════════════
  configuracion: {
    descargarEnSegundoPlano: boolean;
    notificarUsuario: boolean;
    permitirPosponer: boolean;    // Si el usuario puede posponer
    diasMaximoPosponer: number;   // Días antes de forzar actualización
    horaPreferidaInstalacion: string; // "02:00" - Instalar a las 2 AM
  };
}
```

### Ejemplo Real de Documento

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "version": "1.5.2",
  "versionCode": 152,
  "nombre": "Actualización de Invierno 2026",
  "descripcion": "Mejoras significativas en reportes PDF y correcciones de bugs",
  "fechaPublicacion": "2026-01-19T22:00:00.000Z",
  "tipo": "minor",
  "prioridad": "alta",
  "obligatoria": false,
  "changelog": {
    "nuevas": [
      "Ilustraciones anatómicas mejoradas en reportes PDF",
      "Sistema de actualización automática",
      "Campos de médico tratante bloqueados"
    ],
    "correcciones": [
      "Corregido problema de pérdida de datos al reabrir estudios",
      "Solucionado bug en login con credenciales especiales"
    ],
    "mejoras": [
      "Optimización de carga de imágenes en estudios",
      "Mejora de rendimiento en lista de pacientes"
    ],
    "breaking": []
  },
  "descargas": {
    "windows": {
      "url": "https://cdn.aim-medical.com/releases/1.5.2/AIM-Setup-1.5.2.exe",
      "checksum": "a3d5f6e8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
      "tamano": 85000000,
      "arquitectura": "x64"
    },
    "mac": {
      "url": "https://cdn.aim-medical.com/releases/1.5.2/AIM-1.5.2.dmg",
      "checksum": "b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
      "tamano": 90000000,
      "arquitectura": "universal"
    },
    "linux": {
      "url": "https://cdn.aim-medical.com/releases/1.5.2/AIM-1.5.2.AppImage",
      "checksum": "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
      "tamano": 88000000,
      "arquitectura": "x64"
    }
  },
  "canal": "stable",
  "disponiblePara": ["all"],
  "regionesDisponibles": ["all"],
  "versionMinimaRequerida": "1.0.0",
  "requiereReinicio": true,
  "requiereMigracionDatos": false,
  "activa": true,
  "retirada": false,
  "estadisticas": {
    "descargas": 0,
    "instalaciones": 0,
    "errores": 0,
    "rollbacks": 0
  },
  "creadoPor": "admin@aim-medical.com",
  "emailCreador": "admin@aim-medical.com",
  "fechaCreacion": "2026-01-19T20:00:00.000Z",
  "configuracion": {
    "descargarEnSegundoPlano": true,
    "notificarUsuario": true,
    "permitirPosponer": true,
    "diasMaximoPosponer": 7,
    "horaPreferidaInstalacion": "02:00"
  }
}
```

---

## 💻 Implementación Técnica

### 1. Instalación de Dependencias

```bash
npm install electron-updater
npm install electron-log
npm install semver
```

### 2. Configuración en `package.json`

```json
{
  "name": "aim-desktop-app",
  "version": "1.5.2",
  "description": "AIM Medical Desktop Application",
  "main": "electron/main.js",
  "build": {
    "appId": "com.aim.medical.desktop",
    "productName": "AIM Medical",
    "publish": {
      "provider": "generic",
      "url": "https://cdn.aim-medical.com/releases"
    },
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "build/icon.icns",
      "category": "public.app-category.medical"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "build/icon.png",
      "category": "Medical"
    }
  }
}
```

### 3. Archivo `electron/updater.js`

```javascript
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { app, BrowserWindow } = require('electron');

// Configurar logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configurar autoUpdater
autoUpdater.autoDownload = false; // No descargar automáticamente
autoUpdater.autoInstallOnAppQuit = true; // Instalar al cerrar app

class UpdaterService {
  constructor() {
    this.mainWindow = null;
    this.updateInfo = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  init() {
    // Eventos del autoUpdater
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.updateInfo = info;
      this.sendToRenderer('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.sendToRenderer('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater:', err);
      this.sendToRenderer('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      log.info('Download progress:', progressObj);
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendToRenderer('update-downloaded', info);
    });
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }

  downloadUpdate() {
    autoUpdater.downloadUpdate();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }
}

module.exports = new UpdaterService();
```

### 4. Integración en `electron/main.js`

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const updaterService = require('./updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL('http://localhost:3000');
  
  // Configurar updater
  updaterService.setMainWindow(mainWindow);
  updaterService.init();
}

app.whenReady().then(() => {
  createWindow();
  
  // Verificar actualizaciones al iniciar (después de 5 segundos)
  setTimeout(() => {
    updaterService.checkForUpdates();
  }, 5000);
});

// IPC Handlers para actualizaciones
ipcMain.on('check-for-updates', () => {
  updaterService.checkForUpdates();
});

ipcMain.on('download-update', () => {
  updaterService.downloadUpdate();
});

ipcMain.on('install-update', () => {
  updaterService.quitAndInstall();
});
```

---

## 🎨 Componente React: Tab de Actualización

### Archivo: `src/pages/ActualizacionSoftware.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { Card, Button, Progress, Tag, Timeline, Alert, Spin } from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useElectronStore } from "../services/electronStore";
import semver from "semver";

const { ipcRenderer } = window.require("electron");
const app = window.require("electron").remote.app;

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string[];
  downloadURL: string;
}

const ActualizacionSoftware: React.FC = () => {
  const { user } = useElectronStore();
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    // Obtener versión actual
    setCurrentVersion(app.getVersion());

    // Escuchar eventos de actualización
    ipcRenderer.on("update-checking", () => {
      setChecking(true);
    });

    ipcRenderer.on("update-available", (event, info) => {
      setChecking(false);
      setUpdateAvailable(true);
      setUpdateInfo(info);
    });

    ipcRenderer.on("update-not-available", () => {
      setChecking(false);
      setUpdateAvailable(false);
    });

    ipcRenderer.on("update-download-progress", (event, progress) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    ipcRenderer.on("update-downloaded", () => {
      setDownloading(false);
      setUpdateDownloaded(true);
    });

    ipcRenderer.on("update-error", (event, error) => {
      setChecking(false);
      setDownloading(false);
      console.error("Update error:", error);
    });

    return () => {
      ipcRenderer.removeAllListeners("update-checking");
      ipcRenderer.removeAllListeners("update-available");
      ipcRenderer.removeAllListeners("update-not-available");
      ipcRenderer.removeAllListeners("update-download-progress");
      ipcRenderer.removeAllListeners("update-downloaded");
      ipcRenderer.removeAllListeners("update-error");
    };
  }, []);

  // Listener de Firebase para actualizaciones
  useEffect(() => {
    if (!user?.empresa?.id) return;

    const db = getFirestore();
    const updatesRef = doc(
      db,
      `empresas/${user.empresa.id}/actualizaciones-software-aim/latest`
    );

    const unsubscribe = onSnapshot(updatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.activa && !data.retirada) {
          // Comparar versiones
          if (semver.gt(data.version, currentVersion)) {
            setUpdateAvailable(true);
            setUpdateInfo({
              version: data.version,
              releaseDate: data.fechaPublicacion,
              releaseNotes: [
                ...data.changelog.nuevas,
                ...data.changelog.correcciones,
                ...data.changelog.mejoras,
              ],
              downloadURL: data.descargas[process.platform]?.url,
            });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, currentVersion]);

  const handleCheckForUpdates = () => {
    ipcRenderer.send("check-for-updates");
  };

  const handleDownloadUpdate = () => {
    setDownloading(true);
    ipcRenderer.send("download-update");
  };

  const handleInstallUpdate = () => {
    ipcRenderer.send("install-update");
  };

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <RocketOutlined className="text-purple-600" />
            <span>Actualización de Software</span>
          </div>
        }
      >
        {/* Versión actual */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Versión Actual</h3>
          <Tag color="blue" className="text-lg px-4 py-2">
            v{currentVersion}
          </Tag>
        </div>

        {/* Estado de actualización */}
        {checking && (
          <Alert
            message="Buscando actualizaciones..."
            type="info"
            icon={<Spin />}
            className="mb-4"
          />
        )}

        {updateAvailable && updateInfo && !updateDownloaded && (
          <Alert
            message={`Nueva versión disponible: v${updateInfo.version}`}
            description={
              <div className="mt-2">
                <Timeline
                  items={updateInfo.releaseNotes.map((note) => ({
                    children: note,
                  }))}
                />
              </div>
            }
            type="success"
            icon={<CheckCircleOutlined />}
            className="mb-4"
          />
        )}

        {!updateAvailable && !checking && (
          <Alert
            message="Tu aplicación está actualizada"
            type="success"
            icon={<CheckCircleOutlined />}
            className="mb-4"
          />
        )}

        {/* Progreso de descarga */}
        {downloading && (
          <div className="mb-4">
            <h4 className="mb-2">Descargando actualización...</h4>
            <Progress percent={downloadProgress} status="active" />
          </div>
        )}

        {/* Actualización descargada */}
        {updateDownloaded && (
          <Alert
            message="Actualización lista para instalar"
            description="La actualización se instalará al reiniciar la aplicación"
            type="success"
            icon={<CheckCircleOutlined />}
            className="mb-4"
            action={
              <Button type="primary" onClick={handleInstallUpdate}>
                Reiniciar e Instalar
              </Button>
            }
          />
        )}

        {/* Botones de acción */}
        <div className="flex gap-4">
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleCheckForUpdates}
            loading={checking}
            disabled={downloading}
          >
            Buscar Actualizaciones
          </Button>

          {updateAvailable && !downloading && !updateDownloaded && (
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={handleDownloadUpdate}
            >
              Descargar Actualización
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ActualizacionSoftware;
```

---

## 📤 Proceso de Publicación desde el CRM

### Pasos para el Equipo CRM

#### 1. **Compilar la aplicación**

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

#### 2. **Generar checksums**

```bash
# Windows
certutil -hashfile AIM-Setup-1.5.2.exe SHA256

# macOS/Linux
shasum -a 256 AIM-1.5.2.dmg
```

#### 3. **Subir binarios a S3/CDN**

```bash
aws s3 cp AIM-Setup-1.5.2.exe s3://aim-releases/1.5.2/ --acl public-read
aws s3 cp AIM-1.5.2.dmg s3://aim-releases/1.5.2/ --acl public-read
aws s3 cp AIM-1.5.2.AppImage s3://aim-releases/1.5.2/ --acl public-read
```

#### 4. **Crear documento en Firebase**

```javascript
// Desde el CRM
const db = getFirestore();
const updateRef = doc(db, `empresas/${empresaId}/actualizaciones-software-aim/latest`);

await setDoc(updateRef, {
  id: uuidv4(),
  version: "1.5.2",
  versionCode: 152,
  nombre: "Actualización de Invierno 2026",
  descripcion: "Mejoras significativas...",
  fechaPublicacion: new Date().toISOString(),
  tipo: "minor",
  prioridad: "alta",
  obligatoria: false,
  changelog: {
    nuevas: ["..."],
    correcciones: ["..."],
    mejoras: ["..."],
    breaking: []
  },
  descargas: {
    windows: {
      url: "https://cdn.aim-medical.com/releases/1.5.2/AIM-Setup-1.5.2.exe",
      checksum: "a3d5f6e8...",
      tamano: 85000000,
      arquitectura: "x64"
    },
    // ... mac, linux
  },
  canal: "stable",
  disponiblePara: ["all"],
  regionesDisponibles: ["all"],
  versionMinimaRequerida: "1.0.0",
  requiereReinicio: true,
  requiereMigracionDatos: false,
  activa: true,
  retirada: false,
  estadisticas: {
    descargas: 0,
    instalaciones: 0,
    errores: 0,
    rollbacks: 0
  },
  creadoPor: "admin@aim-medical.com",
  emailCreador: "admin@aim-medical.com",
  fechaCreacion: new Date().toISOString(),
  configuracion: {
    descargarEnSegundoPlano: true,
    notificarUsuario: true,
    permitirPosponer: true,
    diasMaximoPosponer: 7,
    horaPreferidaInstalacion: "02:00"
  }
});
```

---

## 👤 Flujo de Usuario

### Escenario 1: Actualización Disponible

```
1. Usuario abre la app
   ↓
2. App verifica actualizaciones automáticamente
   ↓
3. Detecta nueva versión en Firebase
   ↓
4. Muestra notificación: "Nueva versión disponible"
   ↓
5. Usuario hace clic en "Ver detalles"
   ↓
6. Se abre tab "Actualización de Software"
   ↓
7. Usuario ve changelog y hace clic en "Descargar"
   ↓
8. Descarga en segundo plano con barra de progreso
   ↓
9. Al terminar: "Actualización lista para instalar"
   ↓
10. Usuario hace clic en "Reiniciar e Instalar"
    ↓
11. App se cierra, instala actualización y se reinicia
    ↓
12. Usuario ve la nueva versión instalada
```

### Escenario 2: Actualización Obligatoria

```
1. Usuario abre la app
   ↓
2. App detecta actualización obligatoria
   ↓
3. Muestra modal bloqueante: "Actualización requerida"
   ↓
4. Usuario NO puede cerrar el modal
   ↓
5. Descarga automática comienza
   ↓
6. Al terminar, instala automáticamente
   ↓
7. App se reinicia con nueva versión
```

---

## 🔒 Seguridad y Verificación

### 1. Verificación de Integridad (SHA256)

```javascript
const crypto = require('crypto');
const fs = require('fs');

function verifyChecksum(filePath, expectedChecksum) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const hex = hashSum.digest('hex');
  
  return hex === expectedChecksum;
}
```

### 2. Firma de Código (Code Signing)

**Windows**: Usar certificado EV (Extended Validation)
```bash
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 AIM-Setup.exe
```

**macOS**: Usar Apple Developer ID
```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" AIM.app
```

### 3. URLs Firmadas (S3 Presigned URLs)

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const signedUrl = s3.getSignedUrl('getObject', {
  Bucket: 'aim-releases',
  Key: '1.5.2/AIM-Setup-1.5.2.exe',
  Expires: 3600 // 1 hora
});
```

---

## 🔄 Rollback y Recuperación

### Estrategia de Rollback

#### 1. **Detección de Problemas**

```javascript
// En el CRM, monitorear estadísticas
const updateRef = doc(db, `empresas/${empresaId}/actualizaciones-software-aim/latest`);
const updateDoc = await getDoc(updateRef);

if (updateDoc.data().estadisticas.errores > 100) {
  // Retirar actualización automáticamente
  await updateDoc(updateRef, {
    retirada: true,
    motivoRetiro: "Demasiados errores de instalación detectados",
    activa: false
  });
}
```

#### 2. **Rollback Manual desde CRM**

```javascript
// Publicar versión anterior como "latest"
await setDoc(doc(db, `empresas/${empresaId}/actualizaciones-software-aim/latest`), {
  // ... datos de versión anterior (1.5.1)
  version: "1.5.1",
  versionCode: 151,
  // ...
});
```

#### 3. **Backup Automático**

```javascript
// Antes de instalar, hacer backup
const backupPath = path.join(app.getPath('userData'), 'backups', currentVersion);
fs.copyFileSync(app.getPath('exe'), backupPath);
```

---

## 📊 Monitoreo y Analíticas

### Dashboard en CRM

```typescript
interface UpdateAnalytics {
  version: string;
  totalDescargas: number;
  instalacionesExitosas: number;
  errores: number;
  tasaExito: number; // %
  tiempoPromedioDescarga: number; // segundos
  plataformas: {
    windows: number;
    mac: number;
    linux: number;
  };
  regiones: {
    [key: string]: number;
  };
}
```

### Eventos a Trackear

1. **update_check_started** - Usuario busca actualizaciones
2. **update_available** - Nueva versión detectada
3. **update_download_started** - Comienza descarga
4. **update_download_completed** - Descarga completa
5. **update_install_started** - Comienza instalación
6. **update_install_completed** - Instalación exitosa
7. **update_install_failed** - Error en instalación
8. **update_rollback** - Rollback ejecutado

---

## 🚀 Comandos de Build

### package.json scripts

```json
{
  "scripts": {
    "build:win": "electron-builder --win --x64",
    "build:mac": "electron-builder --mac --universal",
    "build:linux": "electron-builder --linux --x64",
    "build:all": "electron-builder -mwl",
    "publish": "electron-builder --publish always"
  }
}
```

---

## ✅ Checklist de Implementación

### Fase 1: Infraestructura
- [ ] Configurar AWS S3 bucket para releases
- [ ] Configurar CloudFront CDN
- [ ] Crear estructura en Firebase
- [ ] Obtener certificados de firma de código

### Fase 2: Código
- [ ] Instalar electron-updater
- [ ] Crear updater.js
- [ ] Integrar en main.js
- [ ] Crear componente ActualizacionSoftware.tsx
- [ ] Agregar tab en menú principal

### Fase 3: CRM
- [ ] Crear interfaz de publicación
- [ ] Implementar generación de checksums
- [ ] Integrar subida a S3
- [ ] Crear flujo de publicación en Firebase

### Fase 4: Testing
- [ ] Probar actualización en Windows
- [ ] Probar actualización en macOS
- [ ] Probar actualización en Linux
- [ ] Probar rollback
- [ ] Probar actualización obligatoria

### Fase 5: Producción
- [ ] Documentar proceso para equipo
- [ ] Configurar monitoreo
- [ ] Publicar primera versión
- [ ] Monitorear métricas

---

## 📚 Referencias

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Electron Builder](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Semantic Versioning](https://semver.org/)

---

**Última actualización**: 19 de enero de 2026
**Versión del documento**: 1.0.0
**Autor**: Equipo de Desarrollo AIM
