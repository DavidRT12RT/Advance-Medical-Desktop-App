import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebaseConfig";

/**
 * Catálogos editables por usuario (tipos de procedimiento, motivos de
 * estudio, personal, equipo, etc.). Viven en el perfil del usuario bajo
 * `configuraciones.catalogosEstudio.<clave>` como arreglos de strings.
 */
class FirebaseCatalogos {
  private perfilRef(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
  ) {
    return doc(
      firestore,
      `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles/${idUsuario}`,
    );
  }

  async obtenerCatalogos(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
  ): Promise<Record<string, string[]>> {
    const snapshot = await getDoc(
      this.perfilRef(idEmpresa, idOrganizacion, idUsuario),
    );
    if (!snapshot.exists()) return {};
    const data: any = snapshot.data();
    return data?.configuraciones?.catalogosEstudio || {};
  }

  async guardarCatalogo(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
    clave: string,
    items: string[],
  ) {
    await updateDoc(this.perfilRef(idEmpresa, idOrganizacion, idUsuario), {
      [`configuraciones.catalogosEstudio.${clave}`]: items,
      updatedAt: new Date().toISOString(),
    });
  }
}

export default new FirebaseCatalogos();
