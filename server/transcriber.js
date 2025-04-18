const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { doc, setDoc, onSnapshot, getDoc } = require("firebase/firestore");
const axios = require("axios");
const { db } = require("./firebase");
const chalk = require("chalk");
const tempAudioFile = path.resolve(__dirname, "../temp_audio.wav");
const tempDir = path.resolve(__dirname, "../temp_whisper_output");
const whisperModel = "base";
const llmModel = "mistral";

let recordingProcess = null;
let whisperProcess = null;

function cleanup() {
  if (fs.existsSync(tempAudioFile)) {
    try {
      fs.unlinkSync(tempAudioFile);
    } catch (err) {
      console.error("Audio cleanup error:", err);
    }
  }

  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch (err) {
      console.error("Whisper output cleanup error:", err);
    }
  }
}

async function startRecording() {
  try {
    cleanup();
    console.log("[transcriber.js] Starting recording...");

    recordingProcess = spawn("ffmpeg", [
      "-nostdin",
      "-f",
      "avfoundation",
      "-i",
      ":BlackHole 2ch",
      "-t",
      "5",
      "-y",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      tempAudioFile,
    ]);

    recordingProcess.on("close", (code) => {
      if (code === 0) {
        transcribeAudio(tempAudioFile);
      } else {
        console.log(chalk.red("[transcriber.js] recording failed!: "));
      }
      recordingProcess = null;
    });

    recordingProcess.stderr.on("data", (data) => {
      console.log(chalk.red("[transcriber.js] ffmpeg error!"));
    });
  } catch (err) {
    console.log(chalk.red("[transcriber.js] recording setup error!"));
  }
}

function stopRecording() {
  if (recordingProcess) {
    recordingProcess.kill();
    recordingProcess = null;
  }
  if (whisperProcess) {
    whisperProcess.kill();
    whisperProcess = null;
  }
  cleanup();
}

async function transcribeAudio(audioFile) {
  console.log("[transcriber.js] Transcribing audio...");

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  whisperProcess = spawn("whisper", [
    audioFile,
    "--model",
    whisperModel,
    "--output_dir",
    tempDir,
    "--output_format",
    "txt",
    "--language",
    "en",
    "--word_timestamps",
    "True",
  ]);

  let rawTranscript = "";

  whisperProcess.stdout.on("data", (data) => {
    rawTranscript += data.toString();
  });

  whisperProcess.stderr.on("data", (data) => {
    const message = data.toString();
    if (!message.includes("OMP: Info #276")) {
      console.error("[transcriber.js] Whisper error:", message);
    }
  });

  whisperProcess.on("close", async () => {
    try {
      // Read the transcript file from output directory
      const outputFiles = fs.readdirSync(tempDir);
      const txtFile = outputFiles.find((f) => f.endsWith(".txt"));

      if (txtFile) {
        const transcriptPath = path.join(tempDir, txtFile);
        rawTranscript = fs.readFileSync(transcriptPath, "utf-8");
      }

      if (rawTranscript.trim()) {
        const docRef = doc(db, "meetings", "current");
        const docSnap = await getDoc(docRef);
        const existingTranscript = docSnap.exists()
          ? docSnap.data().rawTranscript || ""
          : "";

        // Append new transcript with timestamp separator
        const timestamp = new Date().toLocaleTimeString();
        const updatedTranscript = existingTranscript
          ? `${existingTranscript}\n\n[${timestamp}]\n${rawTranscript}`
          : rawTranscript;

        await setDoc(
          docRef,
          {
            rawTranscript: updatedTranscript,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        await enhanceTranscript(updatedTranscript);
      }
    } catch (err) {
      console.error("[transcriber.js] Transcript processing error:", err);
    } finally {
      if (recordingProcess === null) {
        startRecording();
      }
    }
  });
}

async function enhanceTranscript(rawText) {
  try {
    console.log("[transcriber.js] enhance with llm:");

    const notes = await axios.post("http://127.0.0.1:11434/api/generate", {
      model: llmModel,
      prompt: `You are a professional meeting notes generator. Transform the following video call transcript into concise, structured notes using STRICT MARKDOWN FORMATTING.

      # INSTRUCTIONS:
      1. FORMAT: Use exactly this markdown structure (copy headers verbatim):
      ## Key Points
      - [3-7 word bullet]
      - [3-7 word bullet]
      - [3-7 word bullet]

      2. RULES:
      - MAX 7 words per bullet point
      - ONLY use bullet points (no numbered lists)
      - NO paragraphs or long sentences
      - ABSOLUTELY NO INDENTATION (start bullets at beginning of line)
      - NO nested bullets
      - OMIT any section that would be empty
      - PRESERVE exact markdown syntax (## for headers, - for bullets)
      - NEVER add information not in the transcript
      - IGNORE conversational filler (ums, ahs, greetings)
      - EXTRACT only actionable/important points

      3. OUTPUT REQUIREMENTS:
      - Clean GitHub-flavored markdown
      - Consistent formatting throughout
      - Each bullet on its own line
      - No trailing spaces
      - No extra line breaks between bullets

      # TRANSCRIPT TO PROCESS:
      <|transcript_begin|>
      ${rawText}
      <|transcript_end|>

      # OUTPUT READY (remember: strict markdown, max 7 words per bullet, NO INDENTATION):
    `,
      stream: false,
    });

    // Clean up any accidental whitespace
    const cleanedNotes = notes.data.response
      .replace(/\\n/g, "\n") // Unescape newlines
      .split("\n")
      .map((line) => line.trimStart()) // Remove any leading whitespace
      .join("\n")
      .trim();

    const docRef = doc(db, "meetings", "current");
    await setDoc(
      docRef,
      {
        meetingNotes: cleanedNotes,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("[transcriber.js] LLM enhancement error:", err.message);
  }
}

function setupRecordingListener() {
  const ref = doc(db, "controls", "recording");

  console.log("[transcriber.js] etting up recording listener...");
  onSnapshot(ref, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      if (data.command === "start") {
        console.log(
          "\n\n------------------ START RECORDING ------------------\n\n"
        );
        startRecording();
        setDoc(ref, { status: "recording" }, { merge: true });
      } else if (data.command === "stop") {
        console.log(
          "\n\n------------------ STOP RECORDING ------------------\n\n"
        );
        stopRecording();
        setDoc(ref, { status: "idle" }, { merge: true });
      }
    }
  });
}

function setupClearListener() {
  const clearRef = doc(db, "controls", "clear");

  onSnapshot(clearRef, async (doc) => {
    if (doc.exists() && doc.data().command === "clear") {
      console.log("[transcriber.js] Clearing transcripts and files...");
      try {
        cleanup(); // This already deletes temp_audio.wav and temp_whisper_output
        await setDoc(clearRef, { status: "cleared" }, { merge: true });
      } catch (err) {
        console.error("[transcriber.js] Clear error:", err);
      }
    }
  });
}

module.exports = {
  startRecording,
  stopRecording,
  setupRecordingListener,
  setupClearListener,
};
