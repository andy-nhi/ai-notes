const { app, BrowserWindow } = require("electron");
const chalk = require("chalk");
const path = require("path");
const {
  setupClearListener,
  setupRecordingListener,
} = require("../server/transcriber");

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

  console.log(chalk.green("[main/index.js] intialize recording listerner"));
  setupRecordingListener();
  setupClearListener();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
