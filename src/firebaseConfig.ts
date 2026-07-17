import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import firebaseConfig from "../firebase.json";

// La suite de ScaleFlow administra los datos en la base de datos "suite" (no la "(default)")
const FIRESTORE_DATABASE = "suite";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app, FIRESTORE_DATABASE);
export const storage = getStorage(app);

// Info de diagnóstico: a qué proyecto/base apunta este build (se muestra en
// la pantalla de licencia para distinguir builds viejos de nuevos).
// La apiKey web es pública por diseño (viaja dentro de cualquier build);
// se expone aquí para las pruebas de conectividad del diagnóstico.
export const FIREBASE_TARGET = {
  projectId: firebaseConfig.projectId,
  database: FIRESTORE_DATABASE,
  apiKey: firebaseConfig.apiKey,
};
