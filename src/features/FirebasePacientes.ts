import {
  collection,
  addDoc,
  doc,
  getDocs,
  where,
  query,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { firestore } from "../firebaseConfig";
import { Paciente } from "../types/Paciente";

class FirebasePacientes {
  // Metodos para pacientes
  async obtenerPacientes(
    empresa_id: string,
    userId?: string,
  ): Promise<Paciente[]> {
    if (!empresa_id) {
      console.error("empresa_id es undefined en obtenerPacientes");
      return [];
    }

    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
    );

    // Si se proporciona userId, filtrar por ese usuario
    let pacientesQuery;
    if (userId) {
      pacientesQuery = query(pacientesRef, where("doctorId", "==", userId));
    } else {
      pacientesQuery = pacientesRef;
    }

    const pacientesSnapshot = await getDocs(pacientesQuery);
    return pacientesSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Paciente,
    );
  }

  async obtenerPacientePorId(
    empresa_id: string,
    paciente_id: string,
  ): Promise<Paciente | null> {
    const pacienteDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
    );

    const snapshot = await getDoc(pacienteDocRef);
    if (!snapshot.exists()) {
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() } as Paciente;
  }

  async crearActualizarPaciente(
    empresa_id: string,
    pacienteInfo: Paciente,
    userId?: string,
  ): Promise<Paciente> {
    const { id, ...restoInformacion } = pacienteInfo;
    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
    );

    // Agregar doctorId al crear o actualizar
    const dataToSave = userId
      ? { ...restoInformacion, doctorId: userId }
      : restoInformacion;

    if (id) {
      await updateDoc(doc(pacientesRef, id), dataToSave);
      return { id, ...dataToSave } as Paciente;
    } else {
      const pacienteConDoctor = userId
        ? { ...pacienteInfo, doctorId: userId }
        : pacienteInfo;
      const docRef = await addDoc(pacientesRef, pacienteConDoctor);
      return { id: docRef.id, ...pacienteConDoctor } as Paciente;
    }
  }

  async eliminarPaciente(
    empresa_id: string,
    pacienteId: string,
  ): Promise<void> {
    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
    );
    await updateDoc(doc(pacientesRef, pacienteId), {
      activo: false,
    });
  }

  // Metodos para consultas
  async guardarConsulta(
    empresa_id: string,
    paciente_id: string,
    consultaInfo: any,
  ) {
    const consultaRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "consultas",
    );

    const consultaBody = {
      ...consultaInfo,
      paciente_id,
      empresa_id,
      fechaRegistro: new Date().toISOString(),
    };

    const consulta = await addDoc(consultaRef, consultaBody);
    return consulta.id;
  }
}

export default new FirebasePacientes();
