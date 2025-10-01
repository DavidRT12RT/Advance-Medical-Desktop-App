import {
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  collection,
  getDocs,
} from "firebase/firestore";
import { firestore } from "../firebaseConfig";

// Declare electronStore on the global window object for TypeScript
declare global {
  interface Window {
    electronStore: any;
  }
}

class FirebaseLicense {
  /**
   * Validate license data locally and remotely.
   * @param license The license object stored in electron store.
   * @returns true if the license is still valid and linked to this machine.
   */
  async validateLicenseData(license: any): Promise<boolean> {
    // If no license or already marked invalid, consider it invalid
    console.log("Lo que recibo", license);
    if (!license || !license.isValid) {
      return false;
    }

    try {
      const licenciaCollection = collection(firestore, "licencias");
      const licenciaQuery = query(
        licenciaCollection,
        where("claveLicencia", "==", license.claveLicencia)
      );
      const licenciaSnapshot = await getDocs(licenciaQuery);

      const licencia = {
        id: licenciaSnapshot.docs[0].id,
        ...licenciaSnapshot.docs[0].data(),
      } as any;

      if (!licencia) {
        return false;
      }

      // Verificar estado y expiración
      const today = new Date().toISOString().slice(0, 10);
      const isActive =
        licencia.estado === "activa" && (!licencia.fechaExpiracion || licencia.fechaExpiracion >= today);
      if (!isActive) {
        return false;
      }

      // Verificar que exista machineInfo.machineId en remoto y que coincida con el local; no auto-vincular aquí
      const localMachineId = license?.machineInfo?.machineId;
      const remoteMachineId = licencia?.machineInfo?.machineId;

      if (!localMachineId || !remoteMachineId) {
        return false;
      }

      if (localMachineId !== remoteMachineId) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async vincularComputadoraConLicencia(
    license: string,
    machineId: string,
    machineInformation: Record<string, any>
  ): Promise<any> {
    // Buscar licencia en Firestore
    const licenciaCollection = collection(firestore, "licencias");
    const licenciaQuery = query(
      licenciaCollection,
      where("claveLicencia", "==", license)
    );
    const licenciaSnapshot = await getDocs(licenciaQuery);
    if (licenciaSnapshot.empty) throw new Error("La licencia no existe");
    const firstDoc = licenciaSnapshot.docs[0];
    const licencia = { id: firstDoc.id, ...firstDoc.data() } as any;

    const today = new Date().toISOString().slice(0, 10);
    if (licencia.fechaExpiracion < today)
      throw new Error("La licencia ha expirado");

    if (licencia.machineId && licencia.machineId !== machineId)
      throw new Error("La licencia ya está vinculada a otra computadora");

    // Guardar informacion de la computadora junto con el machineId
    await updateDoc(doc(firestore, "licencias", licencia.id), {
      machineInfo: { ...(machineInformation || {}), machineId },
      lastCheckAt: new Date().toISOString(),
    });

    return licencia;
  }
}

export default new FirebaseLicense();
