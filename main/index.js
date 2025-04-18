const { app, BrowserWindow } = require("electron");
const path = require("path");
const { setupRecordingListener } = require("../server/transcriber");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
  });

  const startUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  // if (process.env.NODE_ENV === "development") {
  mainWindow.webContents.openDevTools({ mode: "right" });

  // }

  console.log("[main/index.js] intialize recording listerner");
  setupRecordingListener();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
