/**
 * Firebase Updates Service
 * Maneja las estadísticas y tracking de actualizaciones de software
 */

import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { firestore as db } from "../firebaseConfig";

/**
 * Incrementa el contador de descargas para una versión
 */
export async function incrementarDescargas(
  empresaId: string,
  version: string,
  versionId: string,
): Promise<void> {
  console.log("[FirebaseUpdates] Incrementando descargas:", {
    version,
    versionId,
  });

  try {
    // Usar el path del documento directamente (ej: "v1.1.0")
    const docId = `v${version}`;
    const versionRef = doc(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
      docId,
    );

    // Verificar que el campo 'id' interno coincida
    const docSnap = await getDocs(
      query(
        collection(db, `empresas/${empresaId}/actualizaciones-software-aim`),
        where("__name__", "==", docId),
      ),
    );

    if (docSnap.empty) {
      throw new Error(`No se encontró el documento ${docId}`);
    }

    const docData = docSnap.docs[0].data();
    if (docData.id !== versionId) {
      throw new Error(
        `El documento ${docId} no tiene el id esperado. Esperado: ${versionId}, Encontrado: ${docData.id}`,
      );
    }

    await updateDoc(versionRef, {
      "estadisticas.descargas": increment(1),
    });

    console.log("[FirebaseUpdates] Descarga registrada:", {
      version,
      versionId,
    });
  } catch (error) {
    console.error("[FirebaseUpdates] Error al incrementar descargas:", error);
    throw error;
  }
}

/**
 * Incrementa el contador de instalaciones para una versión
 */
export async function incrementarInstalaciones(
  empresaId: string,
  version: string,
  versionId: string,
): Promise<void> {
  console.log("[FirebaseUpdates] Incrementando instalaciones:", {
    version,
    versionId,
  });

  try {
    // Usar el path del documento directamente (ej: "v1.1.0")
    const docId = `v${version}`;
    const versionRef = doc(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
      docId,
    );

    // Verificar que el campo 'id' interno coincida
    const docSnap = await getDocs(
      query(
        collection(db, `empresas/${empresaId}/actualizaciones-software-aim`),
        where("__name__", "==", docId),
      ),
    );

    if (docSnap.empty) {
      throw new Error(`No se encontró el documento ${docId}`);
    }

    const docData = docSnap.docs[0].data();
    if (docData.id !== versionId) {
      throw new Error(
        `El documento ${docId} no tiene el id esperado. Esperado: ${versionId}, Encontrado: ${docData.id}`,
      );
    }

    await updateDoc(versionRef, {
      "estadisticas.instalaciones": increment(1),
    });

    console.log("[FirebaseUpdates] Instalación registrada:", {
      version,
      versionId,
    });
  } catch (error) {
    console.error(
      "[FirebaseUpdates] Error al incrementar instalaciones:",
      error,
    );
    throw error;
  }
}

/**
 * Incrementa el contador de errores para una versión
 */
export async function incrementarErrores(
  empresaId: string,
  version: string,
  versionId: string,
): Promise<void> {
  console.log("[FirebaseUpdates] Incrementando errores:", {
    version,
    versionId,
  });

  try {
    // Usar el path del documento directamente (ej: "v1.1.0")
    const docId = `v${version}`;
    const versionRef = doc(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
      docId,
    );

    // Verificar que el campo 'id' interno coincida
    const docSnap = await getDocs(
      query(
        collection(db, `empresas/${empresaId}/actualizaciones-software-aim`),
        where("__name__", "==", docId),
      ),
    );

    if (docSnap.empty) {
      throw new Error(`No se encontró el documento ${docId}`);
    }

    const docData = docSnap.docs[0].data();
    if (docData.id !== versionId) {
      throw new Error(
        `El documento ${docId} no tiene el id esperado. Esperado: ${versionId}, Encontrado: ${docData.id}`,
      );
    }

    await updateDoc(versionRef, {
      "estadisticas.errores": increment(1),
    });

    console.log("[FirebaseUpdates] Error registrado:", { version, versionId });
  } catch (error) {
    console.error("[FirebaseUpdates] Error al incrementar errores:", error);
    throw error;
  }
}

/**
 * Registra una instalación exitosa en la subcolección
 */
export async function registrarInstalacion(
  empresaId: string,
  version: string,
  versionId: string,
  instalacionData: {
    machineId: string;
    macAddresses: string[];
    ipAddresses: string[];
    systemInfo: any;
    versionAnterior?: string;
  },
): Promise<void> {
  console.log("[FirebaseUpdates] Registrando instalación:", {
    version,
    versionId,
  });

  try {
    // Usar el path del documento directamente (ej: "v1.1.0")
    const docId = `v${version}`;
    const versionRef = doc(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
      docId,
    );

    // Verificar que el campo 'id' interno coincida
    const docSnap = await getDocs(
      query(
        collection(db, `empresas/${empresaId}/actualizaciones-software-aim`),
        where("__name__", "==", docId),
      ),
    );

    if (docSnap.empty) {
      throw new Error(`No se encontró el documento ${docId}`);
    }

    const docData = docSnap.docs[0].data();
    if (docData.id !== versionId) {
      throw new Error(
        `El documento ${docId} no tiene el id esperado. Esperado: ${versionId}, Encontrado: ${docData.id}`,
      );
    }

    const instalacionesRef = collection(versionRef, "instalaciones");

    await addDoc(instalacionesRef, {
      ...instalacionData,
      fechaInstalacion: serverTimestamp(),
      timestamp: new Date().toISOString(),
    });

    console.log("[FirebaseUpdates] Instalación registrada en subcolección:", {
      version,
      versionId,
      machineId: instalacionData.machineId,
    });
  } catch (error) {
    console.error("[FirebaseUpdates] Error al registrar instalación:", error);
    throw error;
  }
}

/**
 * Registra una descarga exitosa en la subcolección (opcional)
 */
export async function registrarDescarga(
  empresaId: string,
  version: string,
  versionId: string,
  descargaData: {
    machineId: string;
    macAddresses: string[];
    ipAddresses: string[];
    systemInfo: any;
  },
): Promise<void> {
  console.log("[FirebaseUpdates] Registrando descarga:", {
    version,
    versionId,
  });

  try {
    // Usar el path del documento directamente (ej: "v1.1.0")
    const docId = `v${version}`;
    const versionRef = doc(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
      docId,
    );

    // Verificar que el campo 'id' interno coincida
    const docSnap = await getDocs(
      query(
        collection(db, `empresas/${empresaId}/actualizaciones-software-aim`),
        where("__name__", "==", docId),
      ),
    );

    if (docSnap.empty) {
      throw new Error(`No se encontró el documento ${docId}`);
    }

    const docData = docSnap.docs[0].data();
    if (docData.id !== versionId) {
      throw new Error(
        `El documento ${docId} no tiene el id esperado. Esperado: ${versionId}, Encontrado: ${docData.id}`,
      );
    }

    const descargasRef = collection(versionRef, "descargas");

    await addDoc(descargasRef, {
      ...descargaData,
      fechaDescarga: serverTimestamp(),
      timestamp: new Date().toISOString(),
    });

    console.log("[FirebaseUpdates] Descarga registrada en subcolección:", {
      version,
      versionId,
      machineId: descargaData.machineId,
    });
  } catch (error) {
    console.error("[FirebaseUpdates] Error al registrar descarga:", error);
    throw error;
  }
}
