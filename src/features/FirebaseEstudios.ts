import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../firebaseConfig";

const RISK_WEIGHT_POLYP_COUNT = 0.4;
const RISK_WEIGHT_TAMANO = 0.2;
const RISK_WEIGHT_CLASIFICACION = 0.2;
const RISK_WEIGHT_LLM_SEVERITY = 0.15;
const RISK_WEIGHT_COMPLICACIONES = 0.05;

function normalizarNumero(valor: any): number | null {
  if (valor === null || valor === undefined) return null;
  const n = parseFloat(String(valor).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function calcularIndiceRiesgo(estudio: any): number {
  const secciones = Array.isArray(estudio?.secciones_ai)
    ? estudio.secciones_ai
    : [];
  const lastSession = secciones.length ? secciones[secciones.length - 1] : null;
  const cnnSummary = lastSession?.ia_cnn?.summary;
  const llmSession = lastSession?.ia_llm || estudio?.ia_llm;

  // Subscore 1: conteo de pólipos (0-1)
  let subPolyp = 0;
  const lastPolypCount = cnnSummary?.lastPolypCount ?? null;
  if (typeof lastPolypCount === "number") {
    if (lastPolypCount > 1) subPolyp = 1;
    else if (lastPolypCount === 1) subPolyp = 0.5;
  } else if (llmSession?.has_polyp) {
    subPolyp = 0.7;
  } else if (estudio?.polipo) {
    subPolyp = 0.5;
  }

  // Subscore 2: tamaño en mm (0-1)
  let subTamano = 0;
  const tamanoValor = normalizarNumero(estudio?.tamano ?? estudio?.tamaño);
  if (tamanoValor !== null) {
    if (tamanoValor >= 10) subTamano = 1;
    else if (tamanoValor >= 5) subTamano = 0.5;
    else if (tamanoValor > 0) subTamano = 0.2;
  }

  // Subscore 3: clasificación (NICE/JNET) (0-1)
  let subClasificacion = 0;
  if (estudio?.clasificacion) {
    const c = String(estudio.clasificacion).toUpperCase();
    if (c.includes("III") || c.includes("3")) {
      subClasificacion = 1;
    } else if (c.includes("II") || c.includes("2")) {
      subClasificacion = 0.7;
    } else if (c.includes("I") || c.includes("1")) {
      subClasificacion = 0.3;
    }
  }

  // Subscore 4: severidad LLM (0-1)
  let subLLM = 0;
  if (llmSession?.severity) {
    const s = String(llmSession.severity).toLowerCase();
    if (s.includes("malig") || s.includes("high") || s.includes("alto")) {
      subLLM = 1;
    } else if (s.includes("medium") || s.includes("med") || s.includes("unk")) {
      subLLM = 0.5;
    } else if (
      s.includes("low") ||
      s.includes("benign") ||
      s.includes("bajo")
    ) {
      subLLM = 0.1;
    }
  } else if (llmSession?.has_polyp) {
    subLLM = 0.5;
  }

  // Subscore 5: complicaciones (0-1)
  let subComp = 0;
  if (estudio?.complicaciones) {
    const comp = String(estudio.complicaciones).toLowerCase();
    if (
      comp.trim().length > 0 &&
      !comp.includes("ninguna") &&
      !comp.includes("sin complic")
    ) {
      subComp = 1;
    }
  }

  const risk =
    subPolyp * RISK_WEIGHT_POLYP_COUNT +
    subTamano * RISK_WEIGHT_TAMANO +
    subClasificacion * RISK_WEIGHT_CLASIFICACION +
    subLLM * RISK_WEIGHT_LLM_SEVERITY +
    subComp * RISK_WEIGHT_COMPLICACIONES;

  const normalized = Math.max(0, Math.min(100, Math.round(risk * 100)));
  return normalized;
}

class FirebaseEstudios {
  async crearEstudioBasico(
    empresa_id: string,
    paciente_id: string,
    estudioInfo: any,
    userId?: string,
  ) {
    const estudiosRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "estudios",
    );

    // Firestore rechaza valores `undefined`: sin doctorId el addDoc truena,
    // y sin este campo el estudio no aparece en las listas filtradas por doctor.
    const estudioBody = {
      ...estudioInfo,
      empresa_id,
      paciente_id,
      doctorId: userId || estudioInfo.doctorId || null,
      fechaRegistro: new Date().toISOString(),
    };

    const docRef = await addDoc(estudiosRef, estudioBody);
    return { id: docRef.id, ...estudioBody };
  }

  async obtenerEstudiosPorEstado(
    empresa_id: string,
    paciente_id: string,
    estado: string,
    userId?: string,
  ) {
    const estudiosRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "estudios",
    );

    let q;
    if (userId) {
      q = query(
        estudiosRef,
        where("estado", "==", estado),
        where("doctorId", "==", userId),
      );
    } else {
      q = query(estudiosRef, where("estado", "==", estado));
    }
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async obtenerEstudiosDePaciente(
    empresa_id: string,
    paciente_id: string,
    userId?: string,
  ) {
    const estudiosRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "estudios",
    );

    let estudiosQuery;
    if (userId) {
      estudiosQuery = query(estudiosRef, where("doctorId", "==", userId));
    } else {
      estudiosQuery = estudiosRef;
    }

    const snapshot = await getDocs(estudiosQuery);
    return snapshot.docs.map((docSnap) => {
      const data: any = { id: docSnap.id, ...docSnap.data() };
      const indiceRiesgo = calcularIndiceRiesgo(data);
      return { ...data, indiceRiesgo };
    });
  }

  async obtenerEstudioPorId(
    empresa_id: string,
    paciente_id: string,
    estudio_id: string,
  ) {
    const estudioDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "estudios",
      estudio_id,
    );

    const snapshot = await getDoc(estudioDocRef);
    if (!snapshot.exists()) {
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() };
  }

  async actualizarEstudio(
    empresa_id: string,
    paciente_id: string,
    estudio_id: string,
    data: any,
  ) {
    const estudioDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "estudios",
      estudio_id,
    );

    await updateDoc(estudioDocRef, data);
  }

  async obtenerTodosLosEstudios(empresa_id: string, userId?: string) {
    try {
      const pacientesRef = collection(
        firestore,
        "empresas",
        empresa_id,
        "pacientes",
      );

      // Filtrar pacientes por doctorId si se proporciona userId
      let pacientesQuery;
      if (userId) {
        pacientesQuery = query(pacientesRef, where("doctorId", "==", userId));
      } else {
        pacientesQuery = pacientesRef;
      }

      const pacientesSnapshot = await getDocs(pacientesQuery);

      const todosLosEstudios: any[] = [];

      for (const pacienteDoc of pacientesSnapshot.docs) {
        const pacienteData = pacienteDoc.data();
        const pacienteId = pacienteDoc.id;

        const estudiosRef = collection(
          firestore,
          "empresas",
          empresa_id,
          "pacientes",
          pacienteId,
          "estudios",
        );

        // Filtrar estudios por doctorId si se proporciona userId
        let estudiosQuery;
        if (userId) {
          estudiosQuery = query(estudiosRef, where("doctorId", "==", userId));
        } else {
          estudiosQuery = estudiosRef;
        }

        const estudiosSnapshot = await getDocs(estudiosQuery);

        estudiosSnapshot.docs.forEach((estudioDoc) => {
          const estudioData: any = { id: estudioDoc.id, ...estudioDoc.data() };
          const indiceRiesgo = calcularIndiceRiesgo(estudioData);

          todosLosEstudios.push({
            ...estudioData,
            indiceRiesgo,
            paciente: {
              id: pacienteId,
              nombre: pacienteData.nombre || "",
              apellido: pacienteData.apellido || "",
              fechaNacimiento: pacienteData.fechaNacimiento || "",
              sexo: pacienteData.sexo || "",
            },
          });
        });
      }

      return todosLosEstudios;
    } catch (error) {
      console.error("Error obteniendo todos los estudios:", error);
      throw error;
    }
  }
}

export default new FirebaseEstudios();
