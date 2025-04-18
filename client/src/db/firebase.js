import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { localFirebaseConfig, isDev } from "../config/environment";

const app = initializeApp(localFirebaseConfig);
const db = getFirestore(app);

if (isDev()) {
  console.log("[client/src/db/firebase.js] attempt to connect to fire store");
  connectFirestoreEmulator(db, "localhost", 8080);
}

export { db };
