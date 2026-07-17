# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

AIM Desktop: app Electron (Forge + Vite + React 19 + antd 5 + Tailwind) para gestión médica (pacientes, consultas, estudios) con detección de pólipos por IA en tiempo real. La IA corre en un proyecto aparte (`../AdvanceMedicalInteligentSystemAPI`, FastAPI + YOLO + Ollama, **no está en git**) al que la app se conecta por Socket.IO.

## Comandos

```bash
npm start          # desarrollo (Vite dev server + Electron con DevTools)
npm run package    # compila y empaqueta la app (sin instaladores) — úsalo para verificar builds
npm run make       # genera instaladores en out/make/ (Squirrel .exe en Windows, DMG/ZIP en macOS)
```

No hay tests ni linter configurados. El maker de Windows solo corre en Windows o CI (en macOS requiere mono+wine, no instalados). Existe workflow de GitHub Actions (`.github/workflows/build-windows.yml`, manual o tags `v*`) — pendiente: necesita un paso que genere `firebase.json` desde un Secret para funcionar.

## Setup obligatorio antes de compilar

- **`firebase.json` en la raíz** (gitignorado): copiar de `firebase.json.example` con los valores reales del proyecto `scaleflow-aee7f`. Sin él, `npm start` y `npm run make` fallan (lo importa `src/firebaseConfig.ts`). Es la config web pública de Firebase, no un secreto — pero se decidió mantenerla fuera del repo.
- **`.env` en la raíz** (opcional, gitignorado): solo `VITE_API_SERVER_URL` — la URL del servidor de IA que Vite embebe en el build. Sin él usa `http://localhost:8000`. Ver `.env.example`.

Ambos se leen en **build time** (Vite los embebe); el `.exe` instalado no lee archivos de configuración.

## Arquitectura — lo que hay que saber

### Firebase: proyecto y base de datos

Todo Firestore vive en el proyecto `scaleflow-aee7f`, base de datos con nombre **`suite`** (NO la `(default)`; esa contiene datos viejos de una migración y no debe usarse). La instancia está centralizada en `src/firebaseConfig.ts` — **nunca llamar `getFirestore()` directo** en componentes, porque apuntaría a `(default)`. La pantalla de licencia muestra `proyecto · db` al pie para auditar a qué apunta cualquier build instalado.

Las reglas de Firestore de `suite`: lectura pública, escritura con auth, **excepto** `licencias` que permite updates sin auth solo sobre `machineInfo/machineId/lastCheckAt` (la vinculación de licencia ocurre antes del login). Riesgo conocido/aceptado en beta: la vinculación debería migrar a Cloud Function con Admin SDK.

### Flujo de arranque (Root.jsx)

`LicenseGate` (licencia vinculada a la máquina) → `Login` (Firebase Auth + perfil en `empresas/{emp}/organizaciones/{org}/perfiles`) → `App`. Dos validaciones cruzadas: la licencia se vincula por `machineId` (node-machine-id), y el login exige que la **organización del usuario coincida con la de la licencia local** (claims `idEmpresa`/`idOrganizacion` en el JWT).

### Estado compartido: ElectronStoreProvider

`src/hooks/useElectronStore.jsx` es un **Context** montado en `renderer.jsx` — única fuente de verdad de auth/licencia, persistida vía IPC en electron-store (`src/services/electronStore.js`, disco en `%AppData%`). Historia: antes era un hook normal y cada componente creaba su propia copia del estado (el login no redirigía hasta Ctrl+R). No convertirlo de vuelta a hook suelto. `setLicenseData({})` con objeto vacío **limpia** la licencia local (reset a defaults, no merge).

La validación de licencia al arrancar es remota: si la licencia guardada ya no está vinculada a esta máquina en Firestore, se auto-limpia y vuelve a pedir clave. Consecuencia: la app requiere internet al arrancar (el período de gracia `isLicenseActiveWithGrace` existe pero el flujo no lo usa — decisión pendiente de negocio).

### React 19 + antd 5

Los métodos estáticos de antd (`message.*`, `Modal.confirm`, `notification.*`) **no funcionan con React 19** sin el parche `@ant-design/v5-patch-for-react-19` (importado en `renderer.jsx`). Fallan en silencio: la operación corre pero el aviso jamás aparece. Para modales de confirmación preferir `Modal.useModal()` + `contextHolder` (ver `Login.jsx`).

### Consultas a Firestore sensibles a red

El SDK de Firestore, sin conexión, **responde desde caché local vacío sin lanzar error** — un `getDocs` puede devolver vacío y parecer "el dato no existe" cuando en realidad no hay red. Para operaciones donde esa ambigüedad importa (búsqueda de licencia), usar `getDocsFromServer` y mensajear el error de red aparte (ver `FirebaseLicense.vincularComputadoraConLicencia`). La pantalla de licencia incluye botón "Diagnóstico de conexión" (`src/utils/diagnosticoConexion.js`) que prueba internet/Firestore/Auth con resultados visibles.

### Detección por IA (Detection.tsx)

Socket.IO a `SERVER_URL` (build-time, ver arriba) — eventos `detection` (YOLO, bounding boxes sobre canvas) y `llm_analysis` (Ollama). Captura frames con pólipos y los sube a Firebase Storage (máx. 20 por sesión, espaciados). La app funciona sin el servidor de IA (solo grabación).

### Auto-updates

Pipeline propio (no Squirrel remoto): se publica versión con binario en Firebase Storage + doc `latest` en `empresas/{emp}/actualizaciones-software-aim`; la página `/actualizacion` escucha ese doc en tiempo real, descarga con verificación SHA256 (`src/services/autoUpdater.js` en main process) y ejecuta el instalador. `compareVersions` soporta prereleases (`1.0.0-beta.2`) — los builds ≤beta.1 tienen ese comparador roto y no pueden auto-actualizarse (reinstalar a mano una vez). Gaps conocidos: la detección solo corre si el usuario visita la página; la UI de publicar (`GestionVersionesAIM`) no está montada en ninguna ruta.

### Versionado

`package.json` es la única fuente de verdad (ver `COMO_VERSIONAR.md`). Usar `npm version X --no-git-tag-version`. La versión se muestra en pantalla (`AppVersion`) — sirve para distinguir builds instalados en campo.

### Windows / Squirrel

`squirrelEvents.js` maneja los eventos de instalación con ventana propia; `main.js` NO debe ejecutar el arranque normal durante un evento Squirrel (guard `isSquirrelEvent`). DevTools con F12 está habilitado en builds empaquetados — **temporal para la beta**, quitar al estabilizar.

## Contexto operativo (estado del despliegue beta)

- Repo actual: `github.com/DavidRT12RT/Advance-Medical-Desktop-App` (el historial fue reescrito dos veces para purgar credenciales: clones anteriores a jul-2026 deben re-clonarse, nunca hacer push desde ellos).
- Las licencias se administran desde el panel web de la suite (proyecto aparte) y viven en `suite/licencias`. Organizaciones de prueba: Hospital San José (`tVt6AajUeFYJi9FGmHz3`) y Hospital Santa Clara (`ZHnvxp1tlZBR0gr2F5x0`). Una licencia solo sirve para usuarios de su misma organización.
- Máquinas externas con "La licencia no existe" en builds ≤beta.2: era el falso negativo por red/caché descrito arriba (o instalador viejo apuntando a `(default)`); los builds actuales lo distinguen y traen el diagnóstico en pantalla.
