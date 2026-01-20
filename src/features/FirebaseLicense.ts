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
        licencia.estado === "activa" &&
        (!licencia.fechaExpiracion || licencia.fechaExpiracion >= today);
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

  async obtenerInformacionDelUsuarioPorUIDFirebase(firebaseUID: string) {
    let finalData: any = {};

    //Buscar la coleccion del usuario
    const usuariosRef = collection(firestore, "usuarios");
    const q = query(usuariosRef, where("firebaseUID", "==", firebaseUID));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const docId = querySnapshot.docs[0].id;
      finalData = {
        ...userData,
        id: docId,
        uid: firebaseUID,
        firebaseUID: firebaseUID,
      };
    }

    // Buscar la empresa del usuario
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const empresaId = userData.idEmpresa;

      if (empresaId) {
        const empresaRef = doc(firestore, "empresas", empresaId);
        const empresaDoc = await getDoc(empresaRef);
        if (empresaDoc.exists()) {
          finalData = {
            ...finalData,
            empresa: {
              ...empresaDoc.data(),
              id: empresaId,
            },
          };
        }
      }
    }

    if (!querySnapshot.empty) {
      return finalData;
    }

    return null;
  }

  async obtenerPerfilDelUsuarioPorUID(
    firebaseUID: string,
    idEmpresa: string,
    idOrganizacion: string
  ) {
    try {
      // Ruta: empresas/{idEmpresa}/organizaciones/{idOrganizacion}/perfiles
      const perfilesRef = collection(
        firestore,
        `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles`
      );

      // Buscar el perfil que coincida con el firebaseUID
      const q = query(perfilesRef, where("firebaseUID", "==", firebaseUID));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const perfilData = querySnapshot.docs[0].data();
        const perfilId = querySnapshot.docs[0].id;

        return {
          ...perfilData,
          id: perfilId,
          firebaseUID: firebaseUID,
        };
      }

      return null;
    } catch (error) {
      console.error("Error obteniendo perfil del usuario:", error);
      return null;
    }
  }

  /**
   * Obtener datos completos de la organización
   * @param idEmpresa ID de la empresa
   * @param idOrganizacion ID de la organización
   * @returns Objeto con todos los datos de la organización
   */
  async obtenerOrganizacion(idEmpresa: string, idOrganizacion: string) {
    try {
      const organizacionRef = doc(
        firestore,
        `empresas/${idEmpresa}/organizaciones/${idOrganizacion}`
      );
      const organizacionSnap = await getDoc(organizacionRef);

      if (organizacionSnap.exists()) {
        return {
          id: organizacionSnap.id,
          ...organizacionSnap.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error obteniendo organización:", error);
      return null;
    }
  }

  /**
   * Obtener datos completos de la empresa
   * @param idEmpresa ID de la empresa
   * @returns Objeto con todos los datos de la empresa
   */
  async obtenerEmpresa(idEmpresa: string) {
    try {
      const empresaRef = doc(firestore, `empresas/${idEmpresa}`);
      const empresaSnap = await getDoc(empresaRef);

      if (empresaSnap.exists()) {
        return {
          id: empresaSnap.id,
          ...empresaSnap.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error obteniendo empresa:", error);
      return null;
    }
  }
}

export default new FirebaseLicense();
