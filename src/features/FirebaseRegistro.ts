import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { app, firestore } from "../firebaseConfig";

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  especialidad?: string;
}

/**
 * Registro self-service desde una máquina con licencia vinculada.
 *
 * Replica el alta que hace la suite (cuenta de Auth + perfil en
 * empresas/{emp}/organizaciones/{org}/perfiles) tomando la empresa y la
 * organización de la LICENCIA de la máquina. Diferencia con la suite: aquí
 * no se pueden establecer custom claims (eso requiere Admin SDK), por lo que
 * el login tiene un fallback que resuelve empresa/organización desde la
 * licencia local cuando el JWT no trae claims.
 */
export async function registrarUsuarioDesdeMaquina(
  datos: DatosRegistro,
  licenseData: any,
): Promise<any> {
  const idEmpresa = licenseData?.idEmpresa;
  const idOrganizacion = licenseData?.organizacion;

  if (!idEmpresa || !idOrganizacion) {
    throw new Error(
      "La licencia de esta máquina no tiene organización asignada. Contacta al administrador.",
    );
  }

  const email = datos.email.trim().toLowerCase();

  // Evitar perfiles duplicados en la organización
  const perfilesRef = collection(
    firestore,
    `empresas/${idEmpresa}/organizaciones/${idOrganizacion}/perfiles`,
  );
  const existente = await getDocs(query(perfilesRef, where("email", "==", email)));
  if (!existente.empty) {
    throw new Error("Ya existe un perfil con ese correo en la organización.");
  }

  // Crear la cuenta de Firebase Auth (deja al usuario autenticado)
  const auth = getAuth(app);
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, datos.password);
  } catch (e: any) {
    if (e?.code === "auth/email-already-in-use") {
      throw new Error("Ese correo ya tiene una cuenta. Intenta iniciar sesión.");
    }
    if (e?.code === "auth/weak-password") {
      throw new Error("La contraseña es muy débil (mínimo 6 caracteres).");
    }
    if (e?.code === "auth/invalid-email") {
      throw new Error("El correo no es válido.");
    }
    throw e;
  }

  // Crear el perfil con la misma estructura que genera la suite
  const perfil = {
    email,
    nombre: datos.nombre.trim(),
    telefono: datos.telefono?.trim() || "0000000000",
    especialidad: datos.especialidad?.trim() || "General",
    cargo: "Medico",
    departamento: "Endoscopia",
    nivel: "junior",
    turno: "matutino",
    tipoUsuario: "perfil",
    cuentaCreada: true,
    fechaCreacionCuenta: serverTimestamp(),
    firebaseUID: cred.user.uid,
    creadoDesde: "aim-desktop",
  };

  const ref = await addDoc(perfilesRef, perfil);
  return { id: ref.id, ...perfil, idEmpresa, idOrganizacion };
}
