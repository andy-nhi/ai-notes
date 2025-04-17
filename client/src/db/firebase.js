import { initializeApp } from "firebase/app";
import {
  setLogLevel,
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { localFirebaseConfig, isDev } from "../config/environment";

// setLogLevel("debug");
const app = initializeApp(localFirebaseConfig);
const db = getFirestore(app);

console.log("[client/srce/db/firebase] running in dev mode:", isDev());

if (isDev()) {
  console.log("[client/src/db/firebase.js] attempt to connect to fire store");
  connectFirestoreEmulator(db, "localhost", 8080);
}

export { db };
