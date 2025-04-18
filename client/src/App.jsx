import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "./db/firebase";
import { doc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";

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

  const clearTranscripts = () => {
    setRawTranscript("");
    setFormattedTranscript("");
    setNotes("");
    deleteDoc(db, "meetings", "current");
    deleteDoc(db, "controls", "recording");
  };

  // Firebase listeners
  useEffect(() => {
    const unsubscribeFunctions = [];
    setIsLoading(true);

    // Meeting data listener
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

    // Recording status listener
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

  // Get current transcript view
  const getCurrentTranscript = () => {
    switch (activeTranscript) {
      case "raw":
        return rawTranscript;
      default:
        return formattedTranscript;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Meeting Assistant</h1>
        <div className="flex gap-4">
          <button
            onClick={clearTranscripts}
            className="px-4 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
            disabled={isLoading || !rawTranscript}
          >
            Restart
          </button>
          <button
            onClick={toggleRecording}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-50`}
          >
            {isLoading
              ? "Loading..."
              : isRecording
              ? "Stop Recording"
              : "Start Recording"}
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

      <div className="grid gap-6">
        {/* Transcript Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Live Transcript</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTranscript("formatted")}
                className={`px-3 py-1 text-sm rounded ${
                  activeTranscript === "formatted"
                    ? "bg-blue-600"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                Formatted
              </button>
              <button
                onClick={() => setActiveTranscript("raw")}
                className={`px-3 py-1 text-sm rounded ${
                  activeTranscript === "raw"
                    ? "bg-blue-600"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                Raw
              </button>
            </div>
          </div>

          <div className="h-64 overflow-y-auto bg-gray-700 p-4 rounded whitespace-pre-wrap">
            {getCurrentTranscript() || (
              <p className="text-gray-400">
                {isLoading ? "Loading..." : "No transcript available"}
              </p>
            )}
          </div>
        </div>

        {/* Notes Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="prose max-w-none text-gray-100">
            {isLoading ? (
              <p className="text-gray-400">Loading notes...</p>
            ) : (
              <Markdown remarkPlugins={[remarkGfm]}>
                {notes || "No notes generated yet"}
              </Markdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
