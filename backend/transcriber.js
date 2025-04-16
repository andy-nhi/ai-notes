const { spawn } = require("child_process");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const transcriptFile = path.resolve(__dirname, "../transcript.txt");
const historyDir = path.resolve(__dirname, "../sessions");
const notesFile = path.join(historyDir, "notes.md");
const tempAudioFile = path.resolve(__dirname, "../temp_audio.wav");

// ensure history dir exists
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir);
}

// create meeting transcript file if it doesn't exist
if (!fs.existsSync(transcriptFile)) {
  fs.writeFileSync(transcriptFile, "", "utf-8");
}

// ensure temporary audio file does not exist
if (fs.existsSync(tempAudioFile)) {
  fs.unlinkSync(tempAudioFile);
}

function startTranscription() {
  console.log("🎙️  Starting transcription...");

  const record = spawn("ffmpeg", [
    "-f",
    "avfoundation",
    "-i",
    ":BlackHole 2ch",
    "-t",
    "30", // record for <number> seconds
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    tempAudioFile,
  ]);

  record.on("close", () => {
    console.log("🎙️ Recording finished, transcribing...");
    transcribeAudio(tempAudioFile);
  });

  record.stderr.on("data", (data) => {
    console.error(`[Recording ERR] ${data}`);
  });
}

function transcribeAudio(audioFile) {
  const whisper = spawn("whisper", [audioFile, "--model", "base"]);
  whisper.stdout.setEncoding("utf8");

  // Optionally log real-time output
  // whisper.stdout.on("data", (data) => {
  //   const lines = data.split("\n").filter(Boolean);
  //   lines.forEach((line) => {
  //     console.log(`[🧠 whisper] ${line}`);
  //     fs.appendFileSync(transcriptFile, line + "\n");
  //   });
  // });

  whisper.stderr.on("data", (data) => {
    console.error(`[whisper ERR] ${data}`);
  });

  whisper.on("close", (code) => {
    console.log(`🛑 whisper stopped (exit code ${code})`);

    const whisperOutputFile = audioFile.replace(
      path.extname(audioFile),
      ".txt"
    );

    if (fs.existsSync(whisperOutputFile)) {
      const transcription = fs.readFileSync(whisperOutputFile, "utf-8");
      // append the transcription text to the meeting transcript file.
      fs.appendFileSync(transcriptFile, transcription + "\n");
      // now update the notes file with the latest transcript
      generateTranscriptNotes();
    } else {
      console.error("❌ Expected whisper output file not found");
    }
  });
}

async function generateTranscriptNotes() {
  console.log("🧾 generating notes from transcript...");

  if (!fs.existsSync(transcriptFile)) {
    console.error("❌ transcript file not found");
    return;
  }

  const text = fs.readFileSync(transcriptFile, "utf-8");
  if (!text.trim()) {
    console.error("❌ transcript file is empty");
    return;
  }

  try {
    const prompt = `You are an expert meeting assistant.

    Given the raw meeting transcript, your job is to extract and summarize the most important points.  
    Your output should be **concise**, **clearly organized**, and **strictly formatted using valid GitHub-flavored Markdown (GFM)**.
    
    ### Markdown formatting rules you must follow:
    
    - Use valid Markdown syntax for headers (e.g. \`## Header\`).
    - Start bullet point lists with \`- \` (dash + space), with **no indentation** before the dash.
    - Insert a **blank line before and after** each list or header.
    - Do **not** indent list items, even under headers.
    - Do **not** use tab characters.
    - Use numbered lists (\`1. \`, \`2. \`) for ordered steps.
    - Ensure there are **no extra spaces** between list items.
    - Avoid using HTML tags.
    - Make sure **list items are directly under** the list header without extra blank lines.
    
    ### Content guidelines:
    
    - Group related content under appropriate headers.
    - Use bullet points or numbered lists where helpful.
    - Omit filler, small talk, or redundant phrases.
    - If decisions or action items are mentioned, highlight them under a separate **Decisions/Action Items** section.
    
    Here is the transcript to summarize:
    
    \`\`\`
    ${text}
    \`\`\`
    `;

    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt,
      stream: false,
    });

    const notes = response.data.response;
    // overwrite the notes file with the latest notes along with a header
    const content = `${notes}`;
    fs.writeFileSync(notesFile, content, "utf-8");
    console.log(`✅ notes updated in ${notesFile}`);
  } catch (err) {
    console.error("❌ failed to build notes:", err.message);
  }
}

// Start the transcription process.
startTranscription();
