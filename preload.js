const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    dragStart: () => ipcRenderer.send("drag-start"),
    dragMove: () => ipcRenderer.send("drag-move"),
    dragEnd: () => ipcRenderer.send("drag-end"),

    bubbleShow: () => ipcRenderer.send("bubble-show"),
    bubbleShowGame: () => ipcRenderer.send("bubble-show-game"),
    bubbleHide: () => ipcRenderer.send("bubble-hide"),

    onCursorMove: (callback) => {
        ipcRenderer.on("cursor-move", (event, data) => callback(data));
    },

    openSettings: () => ipcRenderer.send("open-settings"),
    exitApp: () => ipcRenderer.send("app-exit"),

    walkPause: () => ipcRenderer.send("walk-pause"),
    walkResume: () => ipcRenderer.send("walk-resume"),
    onWalkDirection: (callback) => {
        ipcRenderer.on("walk-direction", (event, dir) => callback(dir));
    },
    onWalkState: (callback) => {
        ipcRenderer.on("walk-state", (event, isWalking) => callback(isWalking));
    },
    onWalkBounce: (callback) => {
        ipcRenderer.on("walk-bounce", () => callback());
    },

    startThrowBall: () => ipcRenderer.send("start-ball-fetch"),
    onFetchState: (callback) => {
        ipcRenderer.on("fetch-state", (event, state) => callback(state));
    },

    onApplyPetSize: (callback) => {
        ipcRenderer.on("apply-pet-size", (event, px) => callback(px));
    },
    onApplyEyeSettings: (callback) => {
        ipcRenderer.on("apply-eye-settings", (event, settings) => callback(settings));
    },
    onApplyInteractionSettings: (callback) => {
        ipcRenderer.on("apply-interaction-settings", (event, settings) => callback(settings));
    },
    onApplyMoodSettings: (callback) => {
        ipcRenderer.on("apply-mood-settings", (event, settings) => callback(settings));
    },
    onApplyReminderSettings: (callback) => {
        ipcRenderer.on("apply-reminder-settings", (event, settings) => callback(settings));
    },
    onApplyFoodSettings: (callback) => {
        ipcRenderer.on("apply-food-settings", (event, settings) => callback(settings));
    },
    onApplyAppearanceSettings: (callback) => {
        ipcRenderer.on("apply-appearance-settings", (event, settings) => callback(settings));
    },
    onApplyCustomizationSettings: (callback) => {
        ipcRenderer.on("apply-customization-settings", (event, settings) => callback(settings));
    },

    reportInteraction: () => ipcRenderer.send("report-interaction"),
    reportWaterReminderSent: () => ipcRenderer.send("report-water-reminder-sent"),
    reportFeed: () => ipcRenderer.send("report-feed"),
    reportMood: (mood) => ipcRenderer.send("report-mood", mood),
    onForceSleep: (callback) => {
        ipcRenderer.on("force-sleep", () => callback());
    }
});