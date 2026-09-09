const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsAPI", {
    getSettings: () => ipcRenderer.invoke("settings-get"),
    setSetting: (key, value) => ipcRenderer.send("settings-set", { key, value }),

    getStats: () => ipcRenderer.invoke("stats-get"),

    pauseMovement: () => ipcRenderer.send("movement-pause"),
    resumeMovement: () => ipcRenderer.send("movement-resume"),
    stayAtPosition: () => ipcRenderer.send("movement-stay"),
    returnHome: () => ipcRenderer.send("movement-go-home")
});