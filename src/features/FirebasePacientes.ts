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
  async obtenerPacientes(empresa_id: string): Promise<Paciente[]> {
    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes"
    );
    const pacientesSnapshot = await getDocs(pacientesRef);
    return pacientesSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Paciente)
    );
  }

  async obtenerPacientePorId(
    empresa_id: string,
    paciente_id: string
  ): Promise<Paciente | null> {
    const pacienteDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id
    );

    const snapshot = await getDoc(pacienteDocRef);
    if (!snapshot.exists()) {
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() } as Paciente;
  }

  async crearActualizarPaciente(
    empresa_id: string,
    pacienteInfo: Paciente
  ): Promise<Paciente> {
    const { id, ...restoInformacion } = pacienteInfo;
    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes"
    );

    if (id) {
      await updateDoc(doc(pacientesRef, id), restoInformacion);
      return { id, ...restoInformacion } as Paciente;
    } else {
      const docRef = await addDoc(pacientesRef, pacienteInfo);
      return { id: docRef.id, ...pacienteInfo } as Paciente;
    }
  }

  async eliminarPaciente(
    empresa_id: string,
    pacienteId: string
  ): Promise<void> {
    const pacientesRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes"
    );
    await updateDoc(doc(pacientesRef, pacienteId), {
      activo: false,
    });
  }

  // Metodos para consultas
  async guardarConsulta(
    empresa_id: string,
    paciente_id: string,
    consultaInfo: any
  ) {
    const consultaRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "consultas"
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
