const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const Store = require("electron-store").default;

app.commandLine.appendSwitch("high-dpi-support", "1");
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-http-cache");

const store = new Store();

const SIZE_MAP = {
    small: { width: 80, height: 100, petWidth: 70 },
    medium: { width: 100, height: 125, petWidth: 90 },
    large: { width: 130, height: 163, petWidth: 120 }
};

const WALK_SPEED_MAP = { slow: 1.5, normal: 3, fast: 5 };

function getSettings() {
    return {
        petSize: store.get("petSize", "medium"),
        alwaysOnTop: store.get("alwaysOnTop", true),
        startWithWindows: store.get("startWithWindows", false),
        opacity: store.get("opacity", 100),

        blinkSpeed: store.get("blinkSpeed", "normal"),
        eyeMovement: store.get("eyeMovement", true),
        doubleBlink: store.get("doubleBlink", true),

        jumpOnClick: store.get("jumpOnClick", true),
        heartsOnDoubleClick: store.get("heartsOnDoubleClick", true),
        floatingAnimation: store.get("floatingAnimation", true),

        movementMode: store.get("movementMode", "random-walk"),
        autoWalk: store.get("autoWalk", true),
        randomWalking: store.get("randomWalking", true),
        bounceAtEdges: store.get("bounceAtEdges", true),
        walkSpeed: store.get("walkSpeed", "normal"),

        moodSystem: store.get("moodSystem", true),
        sleepAfter: store.get("sleepAfter", "1min"),
        wakeOnMouse: store.get("wakeOnMouse", true),

        reminderEnabled: store.get("reminderEnabled", true),
        reminderInterval: store.get("reminderInterval", 45),
        reminderMessage: store.get("reminderMessage", "Time to drink water!"),

        favoriteFood: store.get("favoriteFood", "cookie"),

        theme: store.get("theme", "midnight"),
        bubbleStyle: store.get("bubbleStyle", "modern"),

        customPrimaryColor: store.get("customPrimaryColor", "#4fb0ff"),
        customBubbleColor: store.get("customBubbleColor", "#ffffff"),
        customBackgroundColor: store.get("customBackgroundColor", "#f5f5f5"),

        accessory: store.get("accessory", "none"),
        skin: store.get("skin", "default")
    };
}

function getHomePosition() {
    return {
        x: store.get("homeX", 300),
        y: store.get("homeY", 300)
    };
}

let win;
let settingsWin = null;
let ballWin = null;
let footprintsWin = null;
let dragOffset = null;

let bubbleOpen = false;
let baseBounds = null;

let walking = false;
let walkPaused = false;
let walkDirection = 1;
let currentWalkSpeed = 3;
let walkFloatX = null;
let walkStateTimer = null;
let lastStoreSave = 0;

const EXIT_CHANCE = 0.3;
let isExiting = false;
let offScreenPause = false;
let exitAreaRef = null;

let fetchActive = false;

let movementMode = "random-walk";
let autoWalkEnabled = true;
let randomWalkingEnabled = true;
let bounceAtEdgesEnabled = true;

let patrolling = false;
let patrolLoopTimer = null;

let following = false;
let followLoopTimer = null;

let liveMood = "happy";

function todayKey() {
    return new Date().toDateString();
}

function ensureStatsDay() {
    const today = todayKey();
    const storedDate = store.get("statsDate", today);

    if (storedDate !== today) {
        store.set("statsDate", today);
        store.set("interactionsToday", 0);
        store.set("waterRemindersSentToday", 0);
        store.set("feedCountToday", 0);
    }
}

ipcMain.on("report-interaction", () => {
    ensureStatsDay();
    store.set("interactionsToday", store.get("interactionsToday", 0) + 1);
});

ipcMain.on("report-water-reminder-sent", () => {
    ensureStatsDay();
    store.set("waterRemindersSentToday", store.get("waterRemindersSentToday", 0) + 1);
});

ipcMain.on("report-feed", () => {
    ensureStatsDay();
    store.set("feedCountToday", store.get("feedCountToday", 0) + 1);
});

ipcMain.on("report-mood", (event, mood) => {
    liveMood = mood || "happy";
});

ipcMain.handle("stats-get", () => {
    ensureStatsDay();
    return {
        interactionsToday: store.get("interactionsToday", 0),
        waterRemindersSentToday: store.get("waterRemindersSentToday", 0),
        feedCountToday: store.get("feedCountToday", 0),
        currentMood: liveMood
    };
});

function loadMovementSettingsIntoState() {
    const s = getSettings();
    movementMode = s.movementMode;
    autoWalkEnabled = s.autoWalk;
    randomWalkingEnabled = s.randomWalking;
    bounceAtEdgesEnabled = s.bounceAtEdges;
    currentWalkSpeed = WALK_SPEED_MAP[s.walkSpeed] || 3;
}

function sendMoodSettings() {
    if (!win || win.isDestroyed()) return;
    const s = getSettings();
    win.webContents.send("apply-mood-settings", {
        moodSystem: s.moodSystem,
        sleepAfter: s.sleepAfter,
        wakeOnMouse: s.wakeOnMouse
    });
}

function sendReminderSettings() {
    if (!win || win.isDestroyed()) return;
    const s = getSettings();
    win.webContents.send("apply-reminder-settings", {
        enabled: s.reminderEnabled,
        interval: s.reminderInterval,
        message: s.reminderMessage
    });
}

function sendFoodSettings() {
    if (!win || win.isDestroyed()) return;
    const s = getSettings();
    win.webContents.send("apply-food-settings", {
        favoriteFood: s.favoriteFood
    });
}

function sendAppearanceSettings() {
    if (!win || win.isDestroyed()) return;
    const s = getSettings();
    win.webContents.send("apply-appearance-settings", {
        theme: s.theme,
        bubbleStyle: s.bubbleStyle,
        customPrimaryColor: s.customPrimaryColor,
        customBubbleColor: s.customBubbleColor,
        customBackgroundColor: s.customBackgroundColor
    });
}

function sendCustomizationSettings() {
    if (!win || win.isDestroyed()) return;
    const s = getSettings();
    win.webContents.send("apply-customization-settings", {
        accessory: s.accessory,
        skin: s.skin
    });
}

function sendAllSettingsToRenderer() {
    if (!win || win.isDestroyed()) return;

    const s = getSettings();
    const cfg = SIZE_MAP[s.petSize] || SIZE_MAP.medium;

    win.webContents.send("apply-pet-size", cfg.petWidth);

    win.webContents.send("apply-eye-settings", {
        blinkSpeed: s.blinkSpeed,
        eyeMovement: s.eyeMovement,
        doubleBlink: s.doubleBlink
    });

    win.webContents.send("apply-interaction-settings", {
        jumpOnClick: s.jumpOnClick,
        heartsOnDoubleClick: s.heartsOnDoubleClick,
        floatingAnimation: s.floatingAnimation
    });

    win.webContents.send("apply-mood-settings", {
        moodSystem: s.moodSystem,
        sleepAfter: s.sleepAfter,
        wakeOnMouse: s.wakeOnMouse
    });

    win.webContents.send("apply-reminder-settings", {
        enabled: s.reminderEnabled,
        interval: s.reminderInterval,
        message: s.reminderMessage
    });

    win.webContents.send("apply-food-settings", {
        favoriteFood: s.favoriteFood
    });

    win.webContents.send("apply-appearance-settings", {
        theme: s.theme,
        bubbleStyle: s.bubbleStyle,
        customPrimaryColor: s.customPrimaryColor,
        customBubbleColor: s.customBubbleColor,
        customBackgroundColor: s.customBackgroundColor
    });

    win.webContents.send("apply-customization-settings", {
        accessory: s.accessory,
        skin: s.skin
    });
}

function createWindow() {
    console.log("createWindow called");

    const settings = getSettings();
    const sizeCfg = SIZE_MAP[settings.petSize] || SIZE_MAP.medium;

    win = new BrowserWindow({
        width: sizeCfg.width,
        height: sizeCfg.height,
        x: store.get("windowX", 300),
        y: store.get("windowY", 300),
        backgroundColor: "#00000000",
        transparent: true,
        frame: false,
        alwaysOnTop: settings.alwaysOnTop,
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        },
        titleBarStyle: "hidden"
    });

    win.setOpacity(settings.opacity / 100);

    console.log("Window created");
    win.loadFile("index.html");

    setInterval(() => {
        if (!win || win.isDestroyed()) return;

        const cursor = screen.getCursorScreenPoint();
        const bounds = win.getBounds();

        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;

        win.webContents.send("cursor-move", {
            dx: cursor.x - centerX,
            dy: cursor.y - centerY
        });
    }, 50);

    win.webContents.on("did-finish-load", () => {
        console.log("HTML loaded");

        setTimeout(() => {
            sendAllSettingsToRenderer();
        }, 200);
    });

    win.webContents.on("did-fail-load", (event, code, desc) => {
        console.log("HTML load failed:", code, desc);
    });

    win.on("moved", () => {
        if (bubbleOpen || walking || fetchActive || patrolling || following) return;
        if (!win || win.isDestroyed()) return;

        const [x, y] = win.getPosition();

        const display = screen.getDisplayNearestPoint({ x, y });
        const area = display.workArea;
        const [winWidth, winHeight] = win.getSize();

        let newX = Math.min(Math.max(x, area.x), area.x + area.width - winWidth);
        let newY = Math.min(Math.max(y, area.y), area.y + area.height - winHeight);

        if (newX !== x || newY !== y) {
            win.setPosition(newX, newY);
        }

        store.set("windowX", newX);
        store.set("windowY", newY);
    });

    startWalkLoop();
    loadMovementSettingsIntoState();
    applyMovementMode();
}

function getVirtualScreenBounds() {
    const displays = screen.getAllDisplays();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    displays.forEach((d) => {
        minX = Math.min(minX, d.bounds.x);
        minY = Math.min(minY, d.bounds.y);
        maxX = Math.max(maxX, d.bounds.x + d.bounds.width);
        maxY = Math.max(maxY, d.bounds.y + d.bounds.height);
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function createFootprintsWindow() {
    const vb = getVirtualScreenBounds();

    footprintsWin = new BrowserWindow({
        x: vb.x,
        y: vb.y,
        width: vb.width,
        height: vb.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        focusable: false,
        backgroundColor: "#00000000",
        webPreferences: {
            preload: path.join(__dirname, "footprintsPreload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    footprintsWin.setIgnoreMouseEvents(true, { forward: true });
    footprintsWin.loadFile("footprints.html");
}

let footprintSide = 1;

function startFootprintSpawner() {
    setInterval(() => {
        if (!win || win.isDestroyed()) return;
        if (!footprintsWin || footprintsWin.isDestroyed()) return;

        const isMoving = (walking && !walkPaused && !bubbleOpen) || patrolling || following || fetchActive;
        if (!isMoving) return;

        const [x, y] = win.getPosition();
        const [w, h] = win.getSize();
        const vb = getVirtualScreenBounds();

        const footX = x + w / 2 + footprintSide * 10 - vb.x;
        const footY = y + h - 6 - vb.y;
        const flip = footprintSide === -1;
        footprintSide *= -1;

        footprintsWin.webContents.send("spawn-footprint", { x: footX, y: footY, flip });
    }, 300);
}

app.whenReady().then(() => {
    console.log("App ready");
    createWindow();
    createFootprintsWindow();
    startFootprintSpawner();

    const settings = getSettings();
    app.setLoginItemSettings({ openAtLogin: settings.startWithWindows });
});

ipcMain.on("drag-start", () => {
    if (!win) return;

    const cursor = screen.getCursorScreenPoint();
    const [winX, winY] = win.getPosition();

    dragOffset = {
        x: cursor.x - winX,
        y: cursor.y - winY
    };
});

ipcMain.on("drag-move", () => {
    if (!dragOffset || bubbleOpen || !win) return;

    const cursor = screen.getCursorScreenPoint();

    let newX = cursor.x - dragOffset.x;
    let newY = cursor.y - dragOffset.y;

    const display = screen.getDisplayNearestPoint(cursor);
    const area = display.workArea;
    const [winWidth, winHeight] = win.getSize();

    if (newX < area.x) newX = area.x;
    if (newY < area.y) newY = area.y;
    if (newX > area.x + area.width - winWidth) newX = area.x + area.width - winWidth;
    if (newY > area.y + area.height - winHeight) newY = area.y + area.height - winHeight;

    if (!Number.isFinite(newX) || !Number.isFinite(newY)) return;

    win.setPosition(Math.round(newX), Math.round(newY));

    store.set("windowX", newX);
    store.set("windowY", newY);
});

ipcMain.on("drag-end", () => {
    dragOffset = null;
});

const BUBBLE_EXTRA_WIDTH = 90;
const BUBBLE_EXTRA_HEIGHT = 300;

const GAME_EXTRA_WIDTH = 260;
const GAME_EXTRA_HEIGHT = 320;

ipcMain.on("bubble-show", () => {
    if (bubbleOpen || !win || win.isDestroyed()) return;
    bubbleOpen = true;

    baseBounds = win.getBounds();

    win.setBounds({
        x: baseBounds.x - Math.round(BUBBLE_EXTRA_WIDTH / 2),
        y: baseBounds.y - BUBBLE_EXTRA_HEIGHT,
        width: baseBounds.width + BUBBLE_EXTRA_WIDTH,
        height: baseBounds.height + BUBBLE_EXTRA_HEIGHT
    });
});

ipcMain.on("bubble-show-game", () => {
    if (bubbleOpen || !win || win.isDestroyed()) return;
    bubbleOpen = true;

    baseBounds = win.getBounds();

    win.setBounds({
        x: baseBounds.x - Math.round(GAME_EXTRA_WIDTH / 2),
        y: baseBounds.y - GAME_EXTRA_HEIGHT,
        width: baseBounds.width + GAME_EXTRA_WIDTH,
        height: baseBounds.height + GAME_EXTRA_HEIGHT
    });
});

ipcMain.on("bubble-hide", () => {
    if (!win || win.isDestroyed()) return;

    const restoreBounds = baseBounds || {
        width: 100,
        height: 125,
        x: win.getBounds().x,
        y: win.getBounds().y
    };

    win.setBounds(restoreBounds);

    setImmediate(() => {
        bubbleOpen = false;
        baseBounds = null;
    });
});

function startWalkLoop() {
    setInterval(() => {
        if (movementMode !== "random-walk") return;
        if (!win || win.isDestroyed()) return;
        if (walkPaused || !walking || bubbleOpen || dragOffset || offScreenPause || fetchActive) return;

        const [x, y] = win.getPosition();

        if (walkFloatX === null) {
            walkFloatX = x;
        }

        const [winWidth] = win.getSize();

        let area;
        if (isExiting && exitAreaRef) {
            area = exitAreaRef;
        } else {
            const display = screen.getDisplayNearestPoint({ x, y });
            area = display.workArea;
        }

        walkFloatX += currentWalkSpeed * walkDirection;

        if (!isExiting) {
            if (walkFloatX <= area.x) {
                if (bounceAtEdgesEnabled && Math.random() < EXIT_CHANCE) {
                    isExiting = true;
                    exitAreaRef = area;
                } else {
                    walkFloatX = area.x;
                    walkDirection = 1;
                    win.webContents.send("walk-direction", walkDirection);
                    if (bounceAtEdgesEnabled) win.webContents.send("walk-bounce");
                }
            } else if (walkFloatX >= area.x + area.width - winWidth) {
                if (bounceAtEdgesEnabled && Math.random() < EXIT_CHANCE) {
                    isExiting = true;
                    exitAreaRef = area;
                } else {
                    walkFloatX = area.x + area.width - winWidth;
                    walkDirection = -1;
                    win.webContents.send("walk-direction", walkDirection);
                    if (bounceAtEdgesEnabled) win.webContents.send("walk-bounce");
                }
            }
        } else {
            const fullyOffLeft = walkFloatX + winWidth <= area.x;
            const fullyOffRight = walkFloatX >= area.x + area.width;

            if (fullyOffLeft || fullyOffRight) {
                handleOffScreenReentry(area, winWidth, y);
                return;
            }
        }

        win.setPosition(Math.round(walkFloatX), y);

        const now = Date.now();
        if (now - lastStoreSave > 1000) {
            store.set("windowX", Math.round(walkFloatX));
            store.set("windowY", y);
            lastStoreSave = now;
        }
    }, 30);
}

function handleOffScreenReentry(area, winWidth, y) {
    offScreenPause = true;

    const hideDuration = 2000 + Math.random() * 4000;

    setTimeout(() => {
        if (!win || win.isDestroyed()) return;

        const enterFromLeft = Math.random() < 0.5;

        if (enterFromLeft) {
            walkFloatX = area.x - winWidth;
            walkDirection = 1;
        } else {
            walkFloatX = area.x + area.width;
            walkDirection = -1;
        }

        win.setPosition(Math.round(walkFloatX), y);
        win.webContents.send("walk-direction", walkDirection);

        isExiting = false;
        exitAreaRef = null;
        offScreenPause = false;
    }, hideDuration);
}

function scheduleWalkState() {
    clearTimeout(walkStateTimer);

    if (movementMode !== "random-walk" || !autoWalkEnabled || !randomWalkingEnabled) {
        walking = false;
        return;
    }

    if (walking) {
        const walkDuration = 6000 + Math.random() * 9000;

        walkStateTimer = setTimeout(() => {
            walking = false;
            walkFloatX = null;

            if (win && !win.isDestroyed()) {
                win.webContents.send("walk-state", false);

                const [x, y] = win.getPosition();
                store.set("windowX", x);
                store.set("windowY", y);
            }
            scheduleWalkState();
        }, walkDuration);
    } else {
        const pauseDuration = 4000 + Math.random() * 8000;

        walkStateTimer = setTimeout(() => {
            if (!win || win.isDestroyed() || bubbleOpen || fetchActive) {
                scheduleWalkState();
                return;
            }

            walking = true;
            walkDirection = Math.random() < 0.5 ? -1 : 1;
            walkFloatX = null;

            win.webContents.send("walk-direction", walkDirection);
            win.webContents.send("walk-state", true);

            scheduleWalkState();
        }, pauseDuration);
    }
}

ipcMain.on("walk-pause", () => {
    walkPaused = true;
    clearTimeout(walkStateTimer);
});

ipcMain.on("walk-resume", () => {
    if (fetchActive) return;

    walkPaused = false;

    if (movementMode === "random-walk") {
        walkFloatX = null;

        if (win && !win.isDestroyed()) {
            win.webContents.send("walk-direction", walkDirection);
            win.webContents.send("walk-state", walking);
        }

        scheduleWalkState();
    }
});

function startPatrol() {
    if (patrolling || !win || win.isDestroyed()) return;
    patrolling = true;

    walkDirection = 1;
    win.webContents.send("walk-direction", walkDirection);
    win.webContents.send("walk-state", true);

    patrolLoopTimer = setInterval(() => {
        if (!win || win.isDestroyed()) {
            clearInterval(patrolLoopTimer);
            patrolling = false;
            return;
        }

        if (movementMode !== "patrol-screen" || !autoWalkEnabled) {
            clearInterval(patrolLoopTimer);
            patrolling = false;
            win.webContents.send("walk-state", false);
            return;
        }

        if (walkPaused || bubbleOpen || dragOffset || fetchActive) return;

        const [x, y] = win.getPosition();
        const display = screen.getDisplayNearestPoint({ x, y });
        const area = display.workArea;
        const [winWidth] = win.getSize();

        let newX = x + currentWalkSpeed * walkDirection;

        if (newX <= area.x) {
            newX = area.x;
            walkDirection = 1;
            win.webContents.send("walk-direction", walkDirection);
            if (bounceAtEdgesEnabled) win.webContents.send("walk-bounce");
        } else if (newX >= area.x + area.width - winWidth) {
            newX = area.x + area.width - winWidth;
            walkDirection = -1;
            win.webContents.send("walk-direction", walkDirection);
            if (bounceAtEdgesEnabled) win.webContents.send("walk-bounce");
        }

        win.setPosition(Math.round(newX), y);
    }, 30);
}

function startContinuousFollow() {
    if (following || !win || win.isDestroyed()) return;
    following = true;

    win.webContents.send("walk-state", true);

    followLoopTimer = setInterval(() => {
        if (!win || win.isDestroyed()) {
            clearInterval(followLoopTimer);
            following = false;
            return;
        }

        if (movementMode !== "follow-mouse" || !autoWalkEnabled) {
            clearInterval(followLoopTimer);
            following = false;
            win.webContents.send("walk-state", false);
            return;
        }

        if (walkPaused || bubbleOpen || dragOffset || fetchActive) return;

        const cursor = screen.getCursorScreenPoint();
        const [x, y] = win.getPosition();

        const display = screen.getDisplayNearestPoint({ x, y });
        const area = display.workArea;
        const [winWidth] = win.getSize();

        let targetX = cursor.x - winWidth / 2;
        targetX = Math.max(area.x, Math.min(area.x + area.width - winWidth, targetX));

        const dx = targetX - x;
        if (Math.abs(dx) < 2) return;

        const dir = dx > 0 ? 1 : -1;
        win.webContents.send("walk-direction", dir);

        let newX = x;
        if (Math.abs(dx) > currentWalkSpeed) {
            newX = x + currentWalkSpeed * dir;
        } else {
            newX = targetX;
        }

        win.setPosition(Math.round(newX), y);
    }, 30);
}

function goToSleepSpot() {
    if (!win || win.isDestroyed()) return;

    const home = getHomePosition();
    const [, y] = win.getPosition();

    win.webContents.send("walk-state", true);

    runPetTo(home.x, y, () => {
        win.setPosition(home.x, home.y);
        store.set("windowX", home.x);
        store.set("windowY", home.y);
        win.webContents.send("walk-state", false);
        win.webContents.send("force-sleep");
    });
}

function stopAllMovementActivity() {
    clearTimeout(walkStateTimer);
    clearInterval(patrolLoopTimer);
    clearInterval(followLoopTimer);

    walking = false;
    patrolling = false;
    following = false;
    walkFloatX = null;

    if (win && !win.isDestroyed()) {
        win.webContents.send("walk-state", false);
    }
}

function applyMovementMode() {
    stopAllMovementActivity();

    if (!autoWalkEnabled || movementMode === "stay-still") {
        return;
    }

    if (movementMode === "random-walk") {
        if (!randomWalkingEnabled) return;
        scheduleWalkState();
        return;
    }

    if (movementMode === "follow-mouse") {
        startContinuousFollow();
        return;
    }

    if (movementMode === "patrol-screen") {
        startPatrol();
        return;
    }

    if (movementMode === "sleep-spot") {
        goToSleepSpot();
        return;
    }
}

ipcMain.on("movement-pause", () => {
    walkPaused = true;
});

ipcMain.on("movement-resume", () => {
    walkPaused = false;
    if (win && !win.isDestroyed()) {
        applyMovementMode();
    }
});

ipcMain.on("movement-stay", () => {
    movementMode = "stay-still";
    store.set("movementMode", "stay-still");
    stopAllMovementActivity();
});

ipcMain.on("movement-go-home", () => {
    if (!win || win.isDestroyed()) return;

    const wasMode = movementMode;
    stopAllMovementActivity();

    const home = getHomePosition();
    const [, y] = win.getPosition();

    runPetTo(home.x, y, () => {
        win.setPosition(home.x, home.y);
        store.set("windowX", home.x);
        store.set("windowY", home.y);

        movementMode = wasMode;
        applyMovementMode();
    });
});

function createBallWindow(x, y) {
    ballWin = new BrowserWindow({
        width: 40,
        height: 40,
        x: Math.round(x),
        y: Math.round(y),
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        focusable: false,
        backgroundColor: "#00000000",
        webPreferences: {
            preload: path.join(__dirname, "ballPreload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    ballWin.loadFile("ball.html");
}

function runPetTo(targetX, y, callback) {
    if (!win || win.isDestroyed()) return;

    const dir = targetX > win.getPosition()[0] ? 1 : -1;
    win.webContents.send("walk-direction", dir);
    win.webContents.send("fetch-state", "going");

    let currentX = win.getPosition()[0];
    const SPEED = 6;

    const loop = setInterval(() => {
        if (!win || win.isDestroyed()) {
            clearInterval(loop);
            return;
        }

        const d = targetX > currentX ? 1 : -1;
        currentX += SPEED * d;

        const arrived = (d === 1 && currentX >= targetX) || (d === -1 && currentX <= targetX);

        if (arrived) {
            currentX = targetX;
            win.setPosition(Math.round(currentX), y);
            clearInterval(loop);
            callback();
            return;
        }

        win.setPosition(Math.round(currentX), y);
    }, 20);
}

function startBallFetch() {
    if (!win || win.isDestroyed() || fetchActive) return;

    fetchActive = true;
    walkPaused = true;
    clearTimeout(walkStateTimer);

    const [startX, startY] = win.getPosition();
    const display = screen.getDisplayNearestPoint({ x: startX, y: startY });
    const area = display.workArea;

    let targetX = startX + (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 220);
    targetX = Math.max(area.x, Math.min(area.x + area.width - 40, targetX));

    const groundY = startY;
    const ballStartX = startX + 30;

    createBallWindow(ballStartX, groundY);

    const throwDuration = 650;
    const throwStart = Date.now();
    const arcHeight = 60;

    const throwTimer = setInterval(() => {
        const t = Math.min(1, (Date.now() - throwStart) / throwDuration);
        const curX = ballStartX + (targetX - ballStartX) * t;
        const curY = groundY - Math.sin(Math.PI * t) * arcHeight;

        if (ballWin && !ballWin.isDestroyed()) {
            ballWin.setPosition(Math.round(curX), Math.round(curY));
        }

        if (t >= 1) {
            clearInterval(throwTimer);

            if (ballWin && !ballWin.isDestroyed()) {
                ballWin.webContents.send("ball-land");
            }

            runPetTo(targetX, startY, () => {
                win.webContents.send("fetch-state", "grabbed");

                if (ballWin && !ballWin.isDestroyed()) {
                    ballWin.close();
                    ballWin = null;
                }

                setTimeout(() => {
                    win.webContents.send("walk-direction", startX > targetX ? 1 : -1);
                    win.webContents.send("fetch-state", "returning");

                    runPetTo(startX, startY, () => {
                        win.webContents.send("fetch-state", "done");

                        fetchActive = false;
                        walkPaused = false;
                        applyMovementMode();
                    });
                }, 500);
            });
        }
    }, 20);
}

ipcMain.on("start-ball-fetch", startBallFetch);

ipcMain.on("open-settings", () => {
    try {
        if (settingsWin && !settingsWin.isDestroyed()) {
            settingsWin.focus();
            return;
        }

        settingsWin = new BrowserWindow({
            width: 340,
            height: 560,
            resizable: false,
            title: "Water Pet Settings",
            autoHideMenuBar: true,
            webPreferences: {
                preload: path.join(__dirname, "settingsPreload.js"),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        settingsWin.loadFile("settings.html");

        settingsWin.on("closed", () => {
            settingsWin = null;
        });
    } catch (err) {
        console.log("Settings window error:", err);
    }
});

ipcMain.handle("settings-get", () => {
    return getSettings();
});

ipcMain.on("settings-set", (event, { key, value }) => {
    store.set(key, value);

    if (!win || win.isDestroyed()) return;

    if (key === "petSize") {
        const cfg = SIZE_MAP[value] || SIZE_MAP.medium;
        win.setSize(cfg.width, cfg.height);
        win.webContents.send("apply-pet-size", cfg.petWidth);
    }

    if (key === "alwaysOnTop") {
        win.setAlwaysOnTop(value);
    }

    if (key === "opacity") {
        win.setOpacity(value / 100);
    }

    if (key === "startWithWindows") {
        app.setLoginItemSettings({ openAtLogin: value });
    }

    if (key === "blinkSpeed" || key === "eyeMovement" || key === "doubleBlink") {
        const s = getSettings();
        win.webContents.send("apply-eye-settings", {
            blinkSpeed: s.blinkSpeed,
            eyeMovement: s.eyeMovement,
            doubleBlink: s.doubleBlink
        });
    }

    if (key === "jumpOnClick" || key === "heartsOnDoubleClick" || key === "floatingAnimation") {
        const s = getSettings();
        win.webContents.send("apply-interaction-settings", {
            jumpOnClick: s.jumpOnClick,
            heartsOnDoubleClick: s.heartsOnDoubleClick,
            floatingAnimation: s.floatingAnimation
        });
    }

    if (key === "moodSystem" || key === "sleepAfter" || key === "wakeOnMouse") {
        sendMoodSettings();
    }

    if (key === "reminderEnabled" || key === "reminderInterval" || key === "reminderMessage") {
        sendReminderSettings();
    }

    if (key === "favoriteFood") {
        sendFoodSettings();
    }

    if (key === "theme" || key === "bubbleStyle" || key === "customPrimaryColor" || key === "customBubbleColor" || key === "customBackgroundColor") {
        sendAppearanceSettings();
    }

    if (key === "accessory" || key === "skin") {
        sendCustomizationSettings();
    }

    if (["movementMode", "autoWalk", "randomWalking", "bounceAtEdges", "walkSpeed"].includes(key)) {
        loadMovementSettingsIntoState();
        applyMovementMode();
    }
});

ipcMain.on("app-exit", () => {
    app.quit();
});

app.on("window-all-closed", () => {
    app.quit();
});