const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  connectFirestoreEmulator,
} = require("firebase/firestore");
const { localFirebaseConfig, isDev } = require("./config");

const app = initializeApp(localFirebaseConfig);
const db = getFirestore(app);

if (isDev()) {
  console.log("[server/firebase/js] attempt to connect to firestore emulator");
  connectFirestoreEmulator(db, "localhost", 8080);
}

module.exports = { db };
