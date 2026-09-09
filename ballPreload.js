const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ballAPI", {
    onLand: (callback) => {
        ipcRenderer.on("ball-land", () => callback());
    }
});