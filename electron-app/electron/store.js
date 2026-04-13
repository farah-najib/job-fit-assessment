import Store from "electron-store";

export const settingsStore = new Store({
  name: "job-fit-settings",
  encryptionKey: "job-fit-desktop-local-store",
  defaults: {
    geminiApiKey: "",
  },
});

export function getStoredApiKey() {
  return settingsStore.get("geminiApiKey", "").trim();
}

export function saveApiKey(apiKey) {
  settingsStore.set("geminiApiKey", apiKey.trim());
}

export function clearApiKey() {
  settingsStore.set("geminiApiKey", "");
}
