const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { doc, setDoc, onSnapshot, getDoc } = require("firebase/firestore");
const axios = require("axios");
const { db } = require("./firebase");

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
      "-f",
      "avfoundation",
      "-i",
      ":BlackHole 2ch",
      "-t",
      "60",
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
        console.error("[transcriber.js] Recording failed:", code);
      }
      recordingProcess = null;
    });

    recordingProcess.stderr.on("data", (data) => {
      console.error("[transcriber.js] FFmpeg error:", data.toString());
    });
  } catch (err) {
    console.error("[transcriber.js] Recording setup error:", err);
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
    console.log("[transcriber.js] enhance with llm:", rawText);

    // Step 1: Formatting
    const formatResponse = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: llmModel,
        prompt: `Improve this transcript's readability. Add punctuation and paragraphs:\n\n${rawText}\n\nFormatted version:`,
        stream: false,
      }
    );

    const formattedText = formatResponse.data.response;

    const summaryResponse = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: llmModel,
        prompt: `You are an expert meeting assistant. Given the raw meeting transcript below, extract and summarize the most important points in this EXACT format:
         
        ### Key Discussion Points   
        - [Concise bullet point 3-7 words]
        - [Concise bullet point 3-7 words] 
        - [Concise bullet point 3-7 words]
        
        ### Action Items
        - [Owner]: [Task description in 3-5 words] (due: [date if mentioned])
        - [Owner]: [Task description in 3-5 words] (due: [date if mentioned])
        
        ### Decisions Made
        - [Topic]: [Decision in 5-8 words]
        - [Topic]: [Decision in 5-8 words]
        
        Rules:
        1. Keep EVERY bullet point VERY short (under 10 words)
        2. Only include truly important information
        3. Use exact format above with these section headers
        4. If a section has no content, omit it entirely
        5. Never write paragraphs - only bullet points
                
        Transcript:
        \`\`\`
        ${formatResponse}
        \`\`\`
    `,
        stream: false,
      }
    );

    const docRef = doc(db, "meetings", "current");
    await setDoc(
      docRef,
      {
        formattedTranscript: formattedText,
        meetingNotes: `${summaryResponse.data.response}`,
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
        startRecording();
        setDoc(ref, { status: "recording" }, { merge: true });
      } else if (data.command === "stop") {
        stopRecording();
        setDoc(ref, { status: "idle" }, { merge: true });
      }
    }
  });
}

module.exports = {
  startRecording,
  stopRecording,
  setupRecordingListener,
};
