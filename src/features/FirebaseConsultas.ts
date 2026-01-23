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

function calcularIndiceRiesgo(consulta: any): number {
  const secciones = Array.isArray(consulta?.secciones_ai)
    ? consulta.secciones_ai
    : [];
  const lastSession = secciones.length ? secciones[secciones.length - 1] : null;
  const cnnSummary = lastSession?.ia_cnn?.summary;
  const llmSession = lastSession?.ia_llm || consulta?.ia_llm;

  // Subscore 1: conteo de pólipos (0-1)
  let subPolyp = 0;
  const lastPolypCount = cnnSummary?.lastPolypCount ?? null;
  if (typeof lastPolypCount === "number") {
    if (lastPolypCount > 1) subPolyp = 1;
    else if (lastPolypCount === 1) subPolyp = 0.5;
  } else if (llmSession?.has_polyp) {
    subPolyp = 0.7;
  } else if (consulta?.polipo) {
    subPolyp = 0.5;
  }

  // Subscore 2: tamaño en mm (0-1)
  let subTamano = 0;
  const tamanoValor = normalizarNumero(consulta?.tamano ?? consulta?.tamaño);
  if (tamanoValor !== null) {
    if (tamanoValor >= 10) subTamano = 1;
    else if (tamanoValor >= 5) subTamano = 0.5;
    else if (tamanoValor > 0) subTamano = 0.2;
  }

  // Subscore 3: clasificación (NICE/JNET) (0-1)
  let subClasificacion = 0;
  if (consulta?.clasificacion) {
    const c = String(consulta.clasificacion).toUpperCase();
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
  if (consulta?.complicaciones) {
    const comp = String(consulta.complicaciones).toLowerCase();
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

class FirebaseConsultas {
  async crearConsultaBasica(
    empresa_id: string,
    paciente_id: string,
    consultaInfo: any,
    userId?: string,
  ) {
    const consultasRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "consultas",
    );

    const consultaBody = {
      ...consultaInfo,
      empresa_id,
      paciente_id,
      doctorId: userId || consultaInfo.doctorId,
      fechaRegistro: new Date().toISOString(),
    };

    const docRef = await addDoc(consultasRef, consultaBody);
    return { id: docRef.id, ...consultaBody };
  }

  async obtenerConsultasPorEstado(
    empresa_id: string,
    paciente_id: string,
    estado: string,
    userId?: string,
  ) {
    const consultasRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "consultas",
    );

    let q;
    if (userId) {
      q = query(
        consultasRef,
        where("estado", "==", estado),
        where("doctorId", "==", userId),
      );
    } else {
      q = query(consultasRef, where("estado", "==", estado));
    }
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async obtenerConsultasDePaciente(
    empresa_id: string,
    paciente_id: string,
    userId?: string,
  ) {
    const consultasRef = collection(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "consultas",
    );

    let consultasQuery;
    if (userId) {
      consultasQuery = query(consultasRef, where("doctorId", "==", userId));
    } else {
      consultasQuery = consultasRef;
    }

    const snapshot = await getDocs(consultasQuery);
    return snapshot.docs.map((docSnap) => {
      const data: any = { id: docSnap.id, ...docSnap.data() };
      const indiceRiesgo = calcularIndiceRiesgo(data);
      return { ...data, indiceRiesgo };
    });
  }

  async obtenerConsultaPorId(
    empresa_id: string,
    paciente_id: string,
    consulta_id: string,
  ) {
    const consultaDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "consultas",
      consulta_id,
    );

    const snapshot = await getDoc(consultaDocRef);
    if (!snapshot.exists()) {
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() };
  }

  async actualizarConsulta(
    empresa_id: string,
    paciente_id: string,
    consulta_id: string,
    data: any,
  ) {
    console.log("data", data);
    const consultaDocRef = doc(
      firestore,
      "empresas",
      empresa_id,
      "pacientes",
      paciente_id,
      "consultas",
      consulta_id,
    );

    const response = await updateDoc(consultaDocRef, data);
    console.log("response", response);
    return response;
  }
}

export default new FirebaseConsultas();
