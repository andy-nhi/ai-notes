import { useEffect, useState, useRef } from "react";
import { db } from "./db/firebase";
import { doc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import Transcript from "./components/transcripts";
import Notes from "./components/notes";

export default function App() {
  const [notes, setNotes] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastCommandSent = useRef(null);

  const toggleRecording = async () => {
    const newCommand = isRecording ? "stop" : "start";

    // Prevent duplicate commands
    if (lastCommandSent.current === newCommand) return;

    try {
      setIsLoading(true);
      lastCommandSent.current = newCommand;

      const docRef = doc(db, "controls", "recording");
      await setDoc(
        docRef,
        {
          command: newCommand,
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
      setNotes("");

      const meetingRef = doc(db, "meetings", "current");
      const recordingRef = doc(db, "controls", "recording");
      const clearRef = doc(db, "controls", "clear");

      await deleteDoc(meetingRef);
      await setDoc(
        recordingRef,
        { status: "idle", command: "stop" },
        { merge: true }
      );
      await setDoc(clearRef, { command: "clear" }, { merge: true });
    } catch (err) {
      console.error("Clear error:", err);
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
          const newStatus = doc.data().status === "recording";
          setIsRecording(newStatus);

          // Reset command tracking when status changes
          if (newStatus !== isRecording) {
            lastCommandSent.current = null;
          }
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
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 shadow-sm flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Meeting Assistant</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearTranscripts}
            className="px-3 py-1.5 rounded-md font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            disabled={isLoading || !rawTranscript}
          >
            Clear
          </button>
          <button
            onClick={toggleRecording}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              isRecording
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isLoading ? (
              "Loading..."
            ) : isRecording ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></span>
                Recording
              </>
            ) : (
              "Start"
            )}
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-600 text-white rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-sm underline hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Transcript Sidebar */}
        <div className="w-72 bg-gray-800 flex flex-col border-r border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <h2 className="font-semibold text-gray-400 uppercase text-xs tracking-wider">
              LIVE TRANSCRIPT
            </h2>
          </div>
          <Transcript rawTranscript={rawTranscript} />
        </div>

        {/* Notes Area */}
        <div className="flex-1 flex flex-col bg-gray-700">
          <Notes notes={notes} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
