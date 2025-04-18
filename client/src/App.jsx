import { useEffect, useState } from "react";
import { db } from "./db/firebase";
import { doc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import Transcript from "./components/transcripts";
import Notes from "./components/notes";

export default function App() {
  const [notes, setNotes] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [formattedTranscript, setFormattedTranscript] = useState("");
  const [activeTranscript, setActiveTranscript] = useState("formatted");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const toggleRecording = async () => {
    try {
      setIsLoading(true);
      const docRef = doc(db, "controls", "recording");
      await setDoc(
        docRef,
        {
          command: isRecording ? "stop" : "start",
          timestamp: new Date(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Recording control error:", err);
      setError("Failed to control recording");
    } finally {
      setIsLoading(false);
    }
  };

  const clearTranscripts = async () => {
    try {
      setIsLoading(true);
      setRawTranscript("");
      setFormattedTranscript("");
      setNotes("");

      const meetingRef = doc(db, "meetings", "current");
      const controlRef = doc(db, "controls", "recording");

      await deleteDoc(meetingRef);
      await deleteDoc(controlRef);

      await setDoc(
        controlRef,
        {
          status: "idle",
          command: "stop",
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to clear transcripts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeFunctions = [];
    setIsLoading(true);

    const meetingUnsub = onSnapshot(
      doc(db, "meetings", "current"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setRawTranscript(data.rawTranscript || "");
          setFormattedTranscript(data.formattedTranscript || "");
          setNotes(data.meetingNotes || "");
        }
        setIsLoading(false);
      },
      (err) => {
        setError("Failed to load meeting data");
        console.error("Firestore error:", err);
      }
    );
    unsubscribeFunctions.push(meetingUnsub);

    const controlUnsub = onSnapshot(
      doc(db, "controls", "recording"),
      (doc) => {
        if (doc.exists()) {
          setIsRecording(doc.data().status === "recording");
        }
      },
      (err) => {
        setError("Failed to load recording status");
        console.error("Firestore error:", err);
      }
    );
    unsubscribeFunctions.push(controlUnsub);

    return () => unsubscribeFunctions.forEach((unsub) => unsub());
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl font-bold">Meeting Assistant</h1>
        <div className="flex gap-2 md:gap-4 w-full md:w-auto">
          <button
            onClick={clearTranscripts}
            className="px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 disabled:opacity-50 flex-1 md:flex-none"
            disabled={isLoading || !rawTranscript}
          >
            Restart
          </button>
          <button
            onClick={toggleRecording}
            disabled={isLoading}
            className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-50 flex-1 md:flex-none`}
          >
            {isLoading ? "Loading..." : isRecording ? "Stop" : "Start"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-800 text-white rounded-lg flex justify-between">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 h-full">
          <Transcript
            rawTranscript={rawTranscript}
            formattedTranscript={formattedTranscript}
            activeTranscript={activeTranscript}
            setActiveTranscript={setActiveTranscript}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-3 h-full">
          <Notes notes={notes} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
