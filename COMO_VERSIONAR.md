# 📝 CÓMO VERSIONAR LA APLICACIÓN

## 🎯 FUENTE ÚNICA DE VERDAD: package.json

La versión de la aplicación se controla desde un solo lugar: **`package.json`**

---

## 📦 VERSIÓN ESTÁNDAR

### **Editar package.json:**
```json
{
  "name": "advance-desktop-app",
  "productName": "AdvanceInteligentSystem",
  "version": "1.0.0",
  ...
}
```

**Resultado en la app:** `v1.0.0`

---

## 🧪 VERSIÓN BETA

### **Opción 1: Agregar sufijo "beta" (RECOMENDADO)**
```json
{
  "version": "1.0.0-beta"
}
```
**Resultado en la app:** `v1.0.0-beta`

### **Opción 2: Agregar número de beta**
```json
{
  "version": "1.0.0-beta.1"
}
```
**Resultado en la app:** `v1.0.0-beta.1`

### **Opción 3: Agregar RC (Release Candidate)**
```json
{
  "version": "1.0.0-rc.1"
}
```
**Resultado en la app:** `v1.0.0-rc.1`

---

## 🔢 VERSIONADO SEMÁNTICO (SemVer)

### **Formato: MAJOR.MINOR.PATCH[-PRERELEASE]**

```
1.0.0           → Versión estable
1.0.0-beta      → Beta
1.0.0-beta.1    → Beta 1
1.0.0-rc.1      → Release Candidate 1
1.0.1           → Parche (bug fix)
1.1.0           → Minor (nueva funcionalidad)
2.0.0           → Major (breaking changes)
```

### **Cuándo incrementar cada parte:**

- **PATCH (1.0.0 → 1.0.1)**: Bug fixes, correcciones menores
- **MINOR (1.0.1 → 1.1.0)**: Nuevas funcionalidades (compatible)
- **MAJOR (1.1.0 → 2.0.0)**: Cambios que rompen compatibilidad

---

## 🚀 FLUJO DE DESARROLLO

### **1. Desarrollo (Beta)**
```json
{ "version": "1.1.0-beta" }
```
```bash
npm run make
# Genera: AIM-Desktop-Setup.exe con versión 1.1.0-beta
```

### **2. Release Candidate**
```json
{ "version": "1.1.0-rc.1" }
```
```bash
npm run make
# Genera: AIM-Desktop-Setup.exe con versión 1.1.0-rc.1
```

### **3. Producción**
```json
{ "version": "1.1.0" }
```
```bash
npm run make
# Genera: AIM-Desktop-Setup.exe con versión 1.1.0
```

---

## 📍 DÓNDE SE MUESTRA LA VERSIÓN

La versión aparece automáticamente en:

1. ✅ **LicenseGate** - Abajo del Machine ID
2. ✅ **Login** - Abajo del formulario
3. ✅ **LayoutMain** - Esquina inferior derecha (todas las pantallas autenticadas)
4. ✅ **ActualizacionSoftware** - En el card de versión actual

---

## 🔄 PROCESO COMPLETO

### **Paso 1: Editar package.json**
```bash
vim package.json
# Cambiar: "version": "1.0.0" → "version": "1.1.0-beta"
```

### **Paso 2: Commit**
```bash
git add package.json
git commit -m "chore: bump version to 1.1.0-beta"
```

### **Paso 3: Build**
```bash
npm run make
```

### **Paso 4: Probar**
- Instalar la app
- Verificar que muestre `v1.1.0-beta` en todas las pantallas

### **Paso 5: Distribuir**
- Subir binario al CRM/ERP
- Publicar actualización en Firebase

---

## 💡 EJEMPLOS PRÁCTICOS

### **Desarrollo activo:**
```json
{ "version": "2.0.0-beta" }
```

### **Testing antes de release:**
```json
{ "version": "2.0.0-rc.1" }
```

### **Producción estable:**
```json
{ "version": "2.0.0" }
```

### **Hotfix urgente:**
```json
{ "version": "2.0.1" }
```

---

## ✅ RESUMEN

**Para agregar "beta" a la versión:**
1. Editar `package.json`
2. Cambiar `"version": "1.0.0"` → `"version": "1.0.0-beta"`
3. Ejecutar `npm run make`
4. La app mostrará `v1.0.0-beta` en todas las pantallas

**Eso es todo. Una sola edición en package.json controla todo.** 🎉
