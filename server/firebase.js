const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  connectFirestoreEmulator,
  setLogLevel,
} = require("firebase/firestore");
const { localFirebaseConfig, isDev } = require("./config");
setLogLevel("debug");
const app = initializeApp(localFirebaseConfig);
const db = getFirestore(app);

console.log("[server/firebase] running in dev mode:", isDev());
if (isDev()) {
  console.log("[server/firebase/js] attempt to connect to firestore emulator");
  connectFirestoreEmulator(db, "localhost", 8080);
}

module.exports = { db };
