import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import firebaseConfig from "./config/firebase.json";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
