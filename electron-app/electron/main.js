import path from "path";
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import { analyzeAssessment, testGeminiKey } from "./analysisService.js";
import { clearApiKey, getStoredApiKey, saveApiKey } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#0f172a",
    title: "Job Fit Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpcHandlers() {
  ipcMain.handle("app:get-state", async () => {
    return {
      apiKeyConfigured: Boolean(getStoredApiKey()),
    };
  });

  ipcMain.handle("settings:test-and-save-key", async (_event, apiKey) => {
    await testGeminiKey(apiKey);
    saveApiKey(apiKey);
    return {
      success: true,
      apiKeyConfigured: true,
    };
  });

  ipcMain.handle("settings:clear-api-key", async () => {
    clearApiKey();
    return {
      success: true,
      apiKeyConfigured: false,
    };
  });

  ipcMain.handle("assessment:analyze", async (_event, payload) => {
    return analyzeAssessment(payload);
  });
}
