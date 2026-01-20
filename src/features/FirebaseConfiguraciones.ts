import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebaseConfig";

class FirebaseConfiguraciones {
  /**
   * Actualizar configuraciones del usuario directamente en el documento del usuario
   * @param idEmpresa ID de la empresa
   * @param idOrganizacion ID de la organización
   * @param idUsuario ID del usuario
   * @param configuraciones Objeto con las configuraciones
   */
  async actualizarConfiguracionesUsuario(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
    configuraciones: any
  ) {
    try {
      const userRef = doc(
        firestore,
        `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles/${idUsuario}`
      );

      await updateDoc(userRef, {
        configuraciones: configuraciones,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error actualizando configuraciones del usuario:", error);
      throw error;
    }
  }

  /**
   * Actualizar solo la configuración del reporte
   * @param idEmpresa ID de la empresa
   * @param idOrganizacion ID de la organización
   * @param idUsuario ID del usuario
   * @param configuracionReporte Objeto con la configuración del reporte
   */
  async actualizarConfiguracionReporte(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
    configuracionReporte: any
  ) {
    try {
      const userRef = doc(
        firestore,
        `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles/${idUsuario}`
      );

      await updateDoc(userRef, {
        "configuraciones.configuracionReporte": configuracionReporte,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error actualizando configuración del reporte:", error);
      throw error;
    }
  }

  /**
   * Actualizar datos médicos del doctor
   * @param idEmpresa ID de la empresa
   * @param idOrganizacion ID de la organización
   * @param idUsuario ID del usuario
   * @param datosMedicos Objeto con los datos médicos
   */
  async actualizarDatosMedicoDoctor(
    idEmpresa: string,
    idOrganizacion: string,
    idUsuario: string,
    datosMedicos: any
  ) {
    try {
      const userRef = doc(
        firestore,
        `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles/${idUsuario}`
      );

      const data = {
        cedula: datosMedicos.cedula,
        especialidad: datosMedicos.especialidad,
        numeroRegistro: datosMedicos.numeroRegistro,
        institucionFormacion: datosMedicos.institucionFormacion,
        aniosExperiencia: datosMedicos.aniosExperiencia,
        telefonoContacto: datosMedicos.telefonoContacto,
        emailProfesional: datosMedicos.emailProfesional,
        consultorio: datosMedicos.consultorio,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        "configuraciones.configuracionDatosMedicos": data,
      });

      return true;
    } catch (error) {
      console.error("Error actualizando datos médicos del doctor:", error);
      throw error;
    }
  }
}

export default new FirebaseConfiguraciones();
