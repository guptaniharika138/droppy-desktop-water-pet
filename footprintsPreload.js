const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("footprintsAPI", {
    onSpawn: (callback) => {
        ipcRenderer.on("spawn-footprint", (event, pos) => callback(pos));
    }
});