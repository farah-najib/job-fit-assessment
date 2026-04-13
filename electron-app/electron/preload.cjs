const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  getAppState: () => ipcRenderer.invoke("app:get-state"),
  testAndSaveApiKey: (apiKey) => ipcRenderer.invoke("settings:test-and-save-key", apiKey),
  clearApiKey: () => ipcRenderer.invoke("settings:clear-api-key"),
  analyzeResume: (payload) => ipcRenderer.invoke("assessment:analyze", payload),
});
