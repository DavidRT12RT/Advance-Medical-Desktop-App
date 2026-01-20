# 🚀 Sistema de Versionado AIM Desktop - CRM

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura con Firebase Storage](#arquitectura-con-firebase-storage)
3. [Componentes del CRM](#componentes-del-crm)
4. [Flujo de Publicación](#flujo-de-publicación)
5. [Estructura de Archivos](#estructura-de-archivos)
6. [Seguridad y Permisos](#seguridad-y-permisos)

---

## 🎯 Visión General

### Sistema Integrado en CRM

El sistema de versionado estará integrado en el CRM como una nueva sección dentro de **"AIM System"**, junto con las demás configuraciones del sistema.

### Ventajas de Firebase Storage

✅ **Ya implementado**: Reutilizas la infraestructura existente
✅ **Sin costos adicionales**: No necesitas AWS S3 ni CDN
✅ **URLs firmadas**: Firebase genera URLs temporales seguras
✅ **Integración directa**: Mismo proyecto de Firebase
✅ **Fácil de usar**: API simple para subir/descargar archivos

---

## 🏗️ Arquitectura con Firebase Storage

### Estructura de Almacenamiento

```
Firebase Storage:
└── empresas/
    └── {empresaId}/
        └── aim-desktop-releases/
            ├── 1.5.0/
            │   ├── AIM-Setup-1.5.0.exe
            │   ├── AIM-1.5.0.dmg
            │   └── AIM-1.5.0.AppImage
            ├── 1.5.1/
            │   ├── AIM-Setup-1.5.1.exe
            │   ├── AIM-1.5.1.dmg
            │   └── AIM-1.5.1.AppImage
            └── 1.5.2/
                ├── AIM-Setup-1.5.2.exe
                ├── AIM-1.5.2.dmg
                └── AIM-1.5.2.AppImage
```

### Firestore (Metadata)

```
Firestore:
└── empresas/
    └── {empresaId}/
        └── actualizaciones-software-aim/
            ├── latest (documento especial)
            ├── v1.5.0
            ├── v1.5.1
            └── v1.5.2
```

---

## 💻 Componentes del CRM

### 1. Página Principal: `GestionVersionesAIM.tsx`

Vista principal con:
- Lista de versiones publicadas
- Botón "Publicar Nueva Versión"
- Estadísticas de descargas
- Estado de cada versión (activa, retirada)

### 2. Modal: `ModalPublicarVersion.tsx`

Formulario para publicar nueva versión:
- **Paso 1**: Información básica (versión, nombre, descripción)
- **Paso 2**: Subir binarios (Windows, macOS, Linux)
- **Paso 3**: Changelog (nuevas, mejoras, correcciones)
- **Paso 4**: Configuración (prioridad, obligatoria, canal)
- **Paso 5**: Revisión y publicación

### 3. Componente: `SubidaBinarios.tsx`

Maneja la subida de archivos:
- Drag & drop para cada plataforma
- Generación automática de checksum SHA256
- Validación de tamaño y tipo de archivo
- Barra de progreso por archivo
- Preview de archivos subidos

### 4. Componente: `HistorialVersiones.tsx`

Lista de versiones con:
- Timeline de versiones
- Estadísticas por versión
- Acciones (retirar, editar, ver detalles)

---

## 📝 Flujo de Publicación

### Paso a Paso

```
1. Usuario hace clic en "Publicar Nueva Versión"
   ↓
2. Modal se abre con formulario de 5 pasos
   ↓
3. PASO 1: Ingresa versión (1.5.2), nombre, descripción
   ↓
4. PASO 2: Sube binarios (.exe, .dmg, .AppImage)
   - Sistema genera checksum SHA256 automáticamente
   - Archivos se suben a Firebase Storage
   - Se obtienen URLs de descarga
   ↓
5. PASO 3: Completa changelog
   - Nuevas funciones
   - Mejoras
   - Correcciones
   - Breaking changes
   ↓
6. PASO 4: Configura opciones
   - Tipo: major/minor/patch/hotfix
   - Prioridad: crítica/alta/media/baja
   - Obligatoria: sí/no
   - Canal: stable/beta/alpha
   ↓
7. PASO 5: Revisa todo y publica
   - Crea documento en Firestore
   - Actualiza documento "latest"
   - Notifica a Desktop Apps
   ↓
8. Versión publicada exitosamente
```

---

## 🔒 Seguridad y Permisos

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Releases de AIM Desktop
    match /empresas/{empresaId}/aim-desktop-releases/{version}/{file} {
      // Lectura: Cualquier usuario autenticado de la empresa
      allow read: if request.auth != null 
                  && request.auth.token.empresaId == empresaId;
      
      // Escritura: Solo administradores del CRM
      allow write: if request.auth != null 
                   && request.auth.token.empresaId == empresaId
                   && request.auth.token.role == 'admin';
    }
  }
}
```

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Actualizaciones de software
    match /empresas/{empresaId}/actualizaciones-software-aim/{versionId} {
      // Lectura: Cualquier usuario autenticado de la empresa
      allow read: if request.auth != null 
                  && request.auth.token.empresaId == empresaId;
      
      // Escritura: Solo administradores del CRM
      allow write: if request.auth != null 
                   && request.auth.token.empresaId == empresaId
                   && request.auth.token.role == 'admin';
    }
  }
}
```

---

## 📊 Interfaz de Usuario

### Vista Principal

```
┌─────────────────────────────────────────────────────────────┐
│  AIM System > Gestión de Versiones Desktop                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Estadísticas Generales                                   │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Versión      │ Instalaciones│ Última       │            │
│  │ Actual       │ Activas      │ Actualización│            │
│  │ v1.5.2       │ 245          │ Hace 2 días  │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│  [+ Publicar Nueva Versión]                                 │
│                                                              │
│  📋 Historial de Versiones                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ● v1.5.2 - Actualización de Invierno 2026           │  │
│  │   Publicado: 19 Ene 2026 • Prioridad: Alta          │  │
│  │   Descargas: 245 • Instalaciones: 240 • Errores: 2  │  │
│  │   [Ver Detalles] [Retirar] [Editar]                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ v1.5.1 - Correcciones de Seguridad                │  │
│  │   Publicado: 10 Ene 2026 • Prioridad: Crítica       │  │
│  │   Descargas: 300 • Instalaciones: 298 • Errores: 1  │  │
│  │   [Ver Detalles]                                     │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ v1.5.0 - Nuevas Funciones                         │  │
│  │   Publicado: 1 Ene 2026 • Prioridad: Media          │  │
│  │   Descargas: 350 • Instalaciones: 345 • Errores: 3  │  │
│  │   [Ver Detalles]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Modal de Publicación

```
┌─────────────────────────────────────────────────────────────┐
│  Publicar Nueva Versión - AIM Desktop                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Paso 1 de 5: Información Básica                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                              │
│  Versión *                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1.5.3                                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  Formato: MAJOR.MINOR.PATCH (ej: 1.5.3)                    │
│                                                              │
│  Nombre de la Versión *                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Actualización de Primavera 2026                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Descripción                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Esta versión incluye mejoras significativas en...     │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│                                    [Cancelar] [Siguiente →] │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementación Técnica

### Generación de Checksum SHA256 en Frontend

```typescript
async function generateChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

### Subida a Firebase Storage

```typescript
async function uploadBinary(
  file: File,
  version: string,
  platform: 'windows' | 'mac' | 'linux',
  empresaId: string
): Promise<{ url: string; checksum: string; size: number }> {
  // Generar checksum
  const checksum = await generateChecksum(file);
  
  // Determinar extensión
  const extension = platform === 'windows' ? 'exe' 
                  : platform === 'mac' ? 'dmg' 
                  : 'AppImage';
  
  // Ruta en Storage
  const path = `empresas/${empresaId}/aim-desktop-releases/${version}/AIM-Setup-${version}.${extension}`;
  
  // Subir archivo
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  // Esperar a que termine
  await new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => reject(error),
      () => resolve(null)
    );
  });
  
  // Obtener URL de descarga
  const downloadURL = await getDownloadURL(storageRef);
  
  return {
    url: downloadURL,
    checksum,
    size: file.size
  };
}
```

### Publicar Versión en Firestore

```typescript
async function publishVersion(versionData: VersionData, empresaId: string) {
  const db = getFirestore();
  const versionId = `v${versionData.version}`;
  
  // Crear documento de versión
  const versionRef = doc(db, `empresas/${empresaId}/actualizaciones-software-aim/${versionId}`);
  await setDoc(versionRef, {
    ...versionData,
    id: uuidv4(),
    versionCode: parseInt(versionData.version.replace(/\./g, '')),
    fechaPublicacion: new Date().toISOString(),
    activa: true,
    retirada: false,
    estadisticas: {
      descargas: 0,
      instalaciones: 0,
      errores: 0,
      rollbacks: 0
    },
    creadoPor: auth.currentUser.email,
    fechaCreacion: new Date().toISOString()
  });
  
  // Actualizar documento "latest"
  const latestRef = doc(db, `empresas/${empresaId}/actualizaciones-software-aim/latest`);
  await setDoc(latestRef, {
    ...versionData,
    id: uuidv4(),
    versionCode: parseInt(versionData.version.replace(/\./g, '')),
    fechaPublicacion: new Date().toISOString(),
    activa: true,
    retirada: false,
    estadisticas: {
      descargas: 0,
      instalaciones: 0,
      errores: 0,
      rollbacks: 0
    },
    creadoPor: auth.currentUser.email,
    fechaCreacion: new Date().toISOString()
  });
}
```

---

## 📦 Estructura de Archivos del CRM

```
src/
├── pages/
│   └── aim-system/
│       └── GestionVersionesAIM.tsx          # Página principal
├── components/
│   └── aim-system/
│       ├── ModalPublicarVersion.tsx         # Modal de publicación
│       ├── SubidaBinarios.tsx               # Componente de subida
│       ├── FormularioVersionBasica.tsx      # Paso 1: Info básica
│       ├── FormularioChangelog.tsx          # Paso 3: Changelog
│       ├── FormularioConfiguracion.tsx      # Paso 4: Configuración
│       ├── RevisionPublicacion.tsx          # Paso 5: Revisión
│       ├── HistorialVersiones.tsx           # Lista de versiones
│       ├── CardEstadisticas.tsx             # Estadísticas generales
│       └── DetalleVersion.tsx               # Modal de detalles
└── services/
    └── versionadoAIM.ts                     # Lógica de negocio
```

---

## 🎨 Diseño de Componentes

### Colores y Estilo

- **Color principal**: Púrpura (#722ED1) - Representa tecnología
- **Color secundario**: Azul (#1890FF) - Información
- **Color éxito**: Verde (#52C41A) - Versión activa
- **Color advertencia**: Naranja (#FA8C16) - Prioridad alta
- **Color peligro**: Rojo (#F5222D) - Prioridad crítica

### Iconos

- 🚀 **RocketOutlined**: Publicar versión
- 📦 **InboxOutlined**: Binarios
- 📝 **FileTextOutlined**: Changelog
- ⚙️ **SettingOutlined**: Configuración
- 📊 **BarChartOutlined**: Estadísticas
- ✅ **CheckCircleOutlined**: Versión activa
- ❌ **CloseCircleOutlined**: Versión retirada
- 🔄 **ReloadOutlined**: Actualizar

---

## 📋 Validaciones

### Archivo Binario

- ✅ **Windows**: Solo `.exe`, máximo 500 MB
- ✅ **macOS**: Solo `.dmg`, máximo 500 MB
- ✅ **Linux**: Solo `.AppImage`, máximo 500 MB

### Versión

- ✅ Formato SemVer: `MAJOR.MINOR.PATCH`
- ✅ No puede ser menor que la última versión publicada
- ✅ No puede duplicarse

### Changelog

- ✅ Al menos 1 item en cualquier categoría
- ✅ Máximo 500 caracteres por item

---

## 🔔 Notificaciones

### Al Publicar

```typescript
// Notificación en CRM
message.success('Versión 1.5.3 publicada exitosamente');

// Email a administradores (opcional)
sendEmail({
  to: 'admins@empresa.com',
  subject: 'Nueva versión de AIM Desktop publicada',
  body: `Se ha publicado la versión 1.5.3 de AIM Desktop...`
});

// Notificación push a Desktop Apps (automática por Firebase)
// Los listeners detectarán el cambio en Firestore
```

---

## 📈 Métricas y Analíticas

### Dashboard de Versiones

```typescript
interface VersionMetrics {
  version: string;
  descargas: number;
  instalaciones: number;
  errores: number;
  tasaExito: number; // %
  tiempoPromedioDescarga: number; // segundos
  plataformas: {
    windows: number;
    mac: number;
    linux: number;
  };
}
```

### Gráficas

- **Línea de tiempo**: Adopción de versiones
- **Barras**: Instalaciones por plataforma
- **Dona**: Distribución de canales (stable/beta/alpha)
- **Tabla**: Top errores por versión

---

## 🚨 Manejo de Errores

### Errores Comunes

1. **Archivo muy grande**
   - Mensaje: "El archivo excede el tamaño máximo de 500 MB"
   - Solución: Comprimir o optimizar el binario

2. **Formato incorrecto**
   - Mensaje: "Solo se permiten archivos .exe para Windows"
   - Solución: Verificar extensión del archivo

3. **Versión duplicada**
   - Mensaje: "La versión 1.5.2 ya existe"
   - Solución: Incrementar número de versión

4. **Error de subida**
   - Mensaje: "Error al subir archivo. Intenta nuevamente"
   - Solución: Reintentar automáticamente (3 intentos)

---

## ✅ Checklist de Implementación

### Fase 1: Componentes Base
- [ ] Crear `GestionVersionesAIM.tsx`
- [ ] Crear `ModalPublicarVersion.tsx`
- [ ] Crear `SubidaBinarios.tsx`
- [ ] Crear servicio `versionadoAIM.ts`

### Fase 2: Formularios
- [ ] Implementar paso 1: Información básica
- [ ] Implementar paso 2: Subida de binarios
- [ ] Implementar paso 3: Changelog
- [ ] Implementar paso 4: Configuración
- [ ] Implementar paso 5: Revisión

### Fase 3: Funcionalidades
- [ ] Generación de checksum SHA256
- [ ] Subida a Firebase Storage
- [ ] Publicación en Firestore
- [ ] Actualización de "latest"
- [ ] Validaciones de formulario

### Fase 4: Historial y Estadísticas
- [ ] Lista de versiones publicadas
- [ ] Estadísticas por versión
- [ ] Gráficas de adopción
- [ ] Acciones (retirar, editar)

### Fase 5: Testing
- [ ] Probar subida de archivos grandes
- [ ] Probar generación de checksums
- [ ] Probar publicación completa
- [ ] Probar retiro de versión
- [ ] Probar con múltiples usuarios

---

**Última actualización**: 19 de enero de 2026
**Versión del documento**: 1.0.0
**Autor**: Equipo de Desarrollo AIM
