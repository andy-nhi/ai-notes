const { app, BrowserWindow, Tray, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let electron;

function createWindow() {
  electron = new BrowserWindow({
    width: 1500,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });
  electron.loadURL("http://localhost:5173");
  electron.webContents.openDevTools();
  electron.webContents.on("did-finish-load", () => {
    let backend = spawn("node", [
      "../meeting-transcripts/backend/transcriber.js",
    ]);

    backend.stdout.on("data", (data) => {
      console.log(`[transcriber]: ${data}`);
      electron.webContents.send("transcript-data", data.toString());
    });

    backend.stderr.on("data", (data) => {
      console.error(`[transcriber error]: ${data}`);
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => mainWindow.show() },
    { label: "Quit", click: () => app.quit() },
  ]);
});
