const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const transcriptPath = path.join(__dirname, "..", "transcript.txt");
const notesPath = path.join(__dirname, "..", "sessions", "notes.md");

contextBridge.exposeInMainWorld("electronAPI", {
  readTranscript: async () => {
    try {
      console.log("reading transcript from", transcriptPath);
      const data = await fs.readFile(transcriptPath, "utf-8");
      return data;
    } catch (err) {
      console.error("error reading transcript:", err);
      return "";
    }
  },

  readNotes: async () => {
    try {
      const data = await fs.readFile(notesPath, "utf-8");
      return data;
    } catch (err) {
      console.error("error reading notes:", err);
      return "";
    }
  },

  onTranscriptData: (callback) => {
    ipcRenderer.on("transcript-data", (event, data) => callback(data));
  },
});
