import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import firebaseConfig from "./config/firebase.json";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// La suite de ScaleFlow administra los datos en la base de datos "suite" (no la "(default)")
export const firestore = getFirestore(app, "suite");
export const storage = getStorage(app);
