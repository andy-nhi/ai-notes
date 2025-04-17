import { db } from "../db/firebase";
import { doc, setDoc } from "firebase/firestore";

export const controlRecording = async (isStarting) => {
  const docRef = doc(db, "controls", "recording");
  await setDoc(
    docRef,
    {
      command: isStarting ? "start" : "stop",
      timestamp: new Date(),
    },
    { merge: true }
  );
};
