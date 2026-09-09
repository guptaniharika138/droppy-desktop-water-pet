const hearts = document.getElementById("hearts");
const pet = document.getElementById("pet");
const petWrapper = document.getElementById("pet-wrapper");
const petVisual = document.getElementById("pet-visual");

const eyeLeft = document.getElementById("eye-left");
const eyeRight = document.getElementById("eye-right");
const patchLeft = document.getElementById("patch-left");
const patchRight = document.getElementById("patch-right");

const waterBubble = document.getElementById("water-bubble");
const waterDoneBtn = document.getElementById("water-done");
const waterSnoozeBtn = document.getElementById("water-snooze");

const reactionBubble = document.getElementById("reaction-bubble");
const reactionEmoji = document.getElementById("reaction-emoji");
const reactionText = document.getElementById("reaction-text");

const sleepBubble = document.getElementById("sleep-bubble");
const zzzContainer = document.getElementById("zzz-container");

const menuBubble = document.getElementById("menu-bubble");
const moodBadge = document.getElementById("mood-badge");

const gameBubble = document.getElementById("game-bubble");
const gameArea = document.getElementById("game-area");
const gameScoreEl = document.getElementById("game-score");
const gameCloseBtn = document.getElementById("game-close");

let isDragging = false;
let mouseDownPos = null;
let moved = false;
let clickTimer = null;
let isAsleep = false;

let jumpOnClickEnabled = true;
let heartsOnDoubleClickEnabled = true;
let eyeMovementEnabled = true;
let doubleBlinkEnabled = true;
let moodSystemEnabled = true;
let wakeOnMouseEnabled = true;
let sleepEnabled = true;
let currentBlinkSpeed = "normal";

/* ------------------------------------------------------------------ */
/* Panel Manager                                                       */
/* ------------------------------------------------------------------ */

const panelEls = {
    water: waterBubble,
    reaction: reactionBubble,
    sleep: sleepBubble,
    menu: menuBubble,
    game: gameBubble
};

let activePanel = null;

function openPanel(name) {
    if (activePanel === name) return;

    if (activePanel) {
        panelEls[activePanel].classList.remove("show");
        activePanel = null;
    }

    activePanel = name;
    panelEls[name].classList.add("show");

    if (name === "game") {
        window.electron.bubbleShowGame();
    } else {
        window.electron.bubbleShow();
    }

    petVisual.classList.remove("walking");
    syncWalkPause();
}

function closePanel(name) {
    if (activePanel !== name) return;

    panelEls[name].classList.remove("show");
    activePanel = null;
    syncWalkPause();

    setTimeout(() => {
        window.electron.bubbleHide();
    }, 250);
}

/* ------------------------------------------------------------------ */
/* Dragging (isolated block — do not merge with other mouse handlers) */
/* ------------------------------------------------------------------ */

pet.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;

    isDragging = true;
    moved = false;
    mouseDownPos = { x: event.screenX, y: event.screenY };

    petVisual.classList.remove("walking");
    window.electron?.dragStart?.();
    syncWalkPause();
});

document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    const dx = Math.abs(event.screenX - mouseDownPos.x);
    const dy = Math.abs(event.screenY - mouseDownPos.y);

    if (dx > 3 || dy > 3) moved = true;

    window.electron?.dragMove?.();
});

document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    isDragging = false;
    const wasMoved = moved;

    if (wasMoved) {
        dropBounce();
    }

    window.electron?.dragEnd?.();
    syncWalkPause();
});

pet.addEventListener("click", () => {
    if (moved) return;
    if (clickTimer) return;
    if (!jumpOnClickEnabled) return;

    clickTimer = setTimeout(() => {
        clickTimer = null;
        jump();
    }, 220);
});

pet.addEventListener("dblclick", () => {
    if (moved) return;
    if (!heartsOnDoubleClickEnabled) return;

    clearTimeout(clickTimer);
    clickTimer = null;

    spawnHearts();
});

function jump() {
    const wasWalking = petVisual.classList.contains("walking");
    petVisual.classList.remove("walking");

    petVisual.classList.remove("jump");
    void petVisual.offsetWidth;
    petVisual.classList.add("jump");

    setTimeout(() => {
        petVisual.classList.remove("jump");
        if (wasWalking) petVisual.classList.add("walking");
    }, 500);
}

const BOUNCE_DURATION = 900;

function bounceDroppy() {
    const wasWalking = petVisual.classList.contains("walking");
    petVisual.classList.remove("walking");

    petVisual.classList.remove("natural-bounce");
    void petVisual.offsetWidth;
    petVisual.classList.add("natural-bounce");

    setTimeout(() => {
        petVisual.classList.remove("natural-bounce");
        if (wasWalking) petVisual.classList.add("walking");
    }, BOUNCE_DURATION);
}

function dropBounce() {
    bounceDroppy();
}

function spawnHearts() {
    const count = 3;

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const heart = document.createElement("div");
            heart.className = "heart";
            heart.innerHTML = "\u2764\ufe0f";

            heart.style.left = `${-10 + Math.random() * 60}px`;
            heart.style.top = "0px";
            heart.style.fontSize = `${16 + Math.random() * 12}px`;

            hearts.appendChild(heart);

            heart.addEventListener("animationend", () => heart.remove());
        }, i * 120);
    }
}

/* ------------------------------------------------------------------ */
/* Eye Blink                                                           */
/* ------------------------------------------------------------------ */

function hideOverlayEyes() {
    eyeLeft.classList.add("hidden");
    eyeRight.classList.add("hidden");
    patchLeft.classList.add("hidden");
    patchRight.classList.add("hidden");
}

function showOverlayEyes() {
    if (isAsleep) return;
    eyeLeft.classList.remove("hidden");
    eyeRight.classList.remove("hidden");
    patchLeft.classList.remove("hidden");
    patchRight.classList.remove("hidden");
}

function closeEyesVisual() {
    const cfg = SKIN_IMAGES[currentSkinKey] || SKIN_IMAGES.default;

    if (cfg.closed) {
        pet.src = cfg.closed;
    } else {
        eyelidLeft.classList.add("show");
        eyelidRight.classList.add("show");
    }

    hideOverlayEyes();
}

function openEyesVisual() {
    const cfg = SKIN_IMAGES[currentSkinKey] || SKIN_IMAGES.default;
    pet.src = cfg.open;

    eyelidLeft.classList.remove("show");
    eyelidRight.classList.remove("show");

    showOverlayEyes();
}

const BLINK_SPEED_RANGES = {
    slow: [4000, 9000],
    normal: [2000, 6000],
    fast: [1000, 3000]
};

function blink() {
    if (!isAsleep) {
        closeEyesVisual();

        setTimeout(() => {
            if (!isAsleep) {
                openEyesVisual();
            }
        }, 90);

        if (doubleBlinkEnabled && Math.random() < 0.3) {
            setTimeout(() => {
                if (isAsleep) return;

                closeEyesVisual();

                setTimeout(() => {
                    if (!isAsleep) {
                        openEyesVisual();
                    }
                }, 90);
            }, 180);
        }
    }

    scheduleBlink();
}

function scheduleBlink() {
    const range = BLINK_SPEED_RANGES[currentBlinkSpeed] || BLINK_SPEED_RANGES.normal;
    setTimeout(blink, range[0] + Math.random() * (range[1] - range[0]));
}

scheduleBlink();

/* ------------------------------------------------------------------ */
/* Water Reminder                                                      */
/* ------------------------------------------------------------------ */

const REMINDER_INTERVAL = 45 * 60 * 1000;
const SNOOZE_INTERVAL = 10 * 60 * 1000;
const AUTO_HIDE_TIMEOUT = 12000;

const FOOD_MAP = {
    cookie: "\ud83c\udf6a",
    apple: "\ud83c\udf4e",
    carrot: "\ud83e\udd55",
    bone: "\ud83e\uddb4"
};

let favoriteFoodEmoji = FOOD_MAP.cookie;

function updateFeedMenuIcon() {
    const feedBtn = menuBubble.querySelector('[data-action="feed"]');
    if (feedBtn) feedBtn.textContent = `${favoriteFoodEmoji} Feed`;
}

window.electron?.onApplyFoodSettings?.((settings) => {
    favoriteFoodEmoji = FOOD_MAP[settings.favoriteFood] || FOOD_MAP.cookie;
    updateFeedMenuIcon();
});

function hexToRgb(hex) {
    hex = (hex || "#ffffff").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const num = parseInt(hex, 16) || 0xffffff;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function pickTextColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? "#2b2b2b" : "#f5f5f5";
}

function toRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const dr = Math.max(0, Math.round(r * (1 - amount)));
    const dg = Math.max(0, Math.round(g * (1 - amount)));
    const db = Math.max(0, Math.round(b * (1 - amount)));
    return `rgb(${dr}, ${dg}, ${db})`;
}

const CUSTOM_THEME_PROPS = [
    "--accent", "--accent-hover", "--bubble-bg", "--bubble-text", "--bubble-muted-text",
    "--snooze-bg", "--snooze-bg-hover", "--menu-item-hover", "--menu-separator",
    "--game-header-bg", "--game-area-bg-start", "--game-area-bg-end",
    "--game-score-bg", "--game-score-text"
];

const accessorySlot = document.getElementById("accessory-slot");
const eyelidLeft = document.getElementById("eyelid-left");
const eyelidRight = document.getElementById("eyelid-right");

const ACCESSORY_MAP = {
    hat: "\ud83c\udfa9",
    glasses: "\ud83d\udd76",
    bow: "\ud83c\udf80",
    headphones: "\ud83c\udfa7",
    crown: "\ud83d\udc51"
};

// Real image per skin. `closed` is the eyes-closed frame for blink/sleep.
// All 5 skins now have a real closed-eye image.
const SKIN_IMAGES = {
    default: { open: "./assets/pet.png", closed: "./assets/pet_eyes_close.png" },
    cat: { open: "./assets/cat.png", closed: "./assets/cat_eye_close.png" },
    dog: { open: "./assets/dog.png", closed: "./assets/dog_eye_close.png" },
    panda: { open: "./assets/panda.png", closed: "./assets/panda_eye_close.png" },
    frog: { open: "./assets/frog.png", closed: "./assets/frog_eye_close.png" }
};

// ============================================================
// EYE POSITION TUNING — adjust these if a skin's mouse-follow
// pupils don't line up with its actual eyes.
//
//   lx / ly  = LEFT eye center position, as a % of the pet image's
//              width/height (lx = from left edge, ly = from top edge)
//   rx / ry  = RIGHT eye center position, same units
//   w  / h   = size of the skin-colored "patch" circle that covers the
//              artwork's printed eye (width % / height %)
//   patch1/2 = patch color (gradient), should match the fur/skin right
//              around that skin's eyes so the patch blends in
//   pupilW/H = size of the little animated pupil dot drawn on top
//
// Increasing ly/ry moves eyes DOWN. Increasing lx moves the LEFT eye
// RIGHT (toward center); increasing rx moves the RIGHT eye further
// RIGHT (away from center). Decreasing them moves the opposite way.
// ============================================================
const SKIN_EYE_CONFIG = {
    default: {
        lx: "38.8%", ly: "31.9%", rx: "75.8%", ry: "36.9%",
        w: "22%", h: "20%", patch1: "#fbd2c4", patch2: "#f6c0b0",
        pupilW: "13%", pupilH: "12%"
    },
    cat: {
        lx: "32%", ly: "38%", rx: "65%", ry: "38%",
        w: "20%", h: "18%", patch1: "#fdf1e6", patch2: "#f6e2cf",
        pupilW: "12%", pupilH: "13%"
    },
    dog: {
        lx: "38%", ly: "37%", rx: "68%", ry: "40%",
        w: "16%", h: "15%", patch1: "#fbf3e8", patch2: "#f2e3cd",
        pupilW: "12%", pupilH: "13%"
    },
    panda: {
        lx: "35%", ly: "32%", rx: "62%", ry: "36%",
        w: "19%", h: "17%", patch1: "#1c1c1c", patch2: "#141414",
        pupilW: "12%", pupilH: "13%"
    },
    frog: {
        lx: "28%", ly: "21%", rx: "75%", ry: "27%",
        w: "23%", h: "21%", patch1: "#a8d84f", patch2: "#8fc93d",
        pupilW: "14%", pupilH: "16%"
    }
};

let currentSkinKey = "default";

function applySkinEyeConfig(key) {
    const cfg = SKIN_EYE_CONFIG[key] || SKIN_EYE_CONFIG.default;
    petVisual.style.setProperty("--eye-lx", cfg.lx);
    petVisual.style.setProperty("--eye-ly", cfg.ly);
    petVisual.style.setProperty("--eye-rx", cfg.rx);
    petVisual.style.setProperty("--eye-ry", cfg.ry);
    petVisual.style.setProperty("--eye-w", cfg.w);
    petVisual.style.setProperty("--eye-h", cfg.h);
    petVisual.style.setProperty("--eye-patch-color1", cfg.patch1);
    petVisual.style.setProperty("--eye-patch-color2", cfg.patch2);
    petVisual.style.setProperty("--pupil-w", cfg.pupilW);
    petVisual.style.setProperty("--pupil-h", cfg.pupilH);
}

function applyAccessory(type) {
    accessorySlot.className = "";

    if (!type || type === "none" || !ACCESSORY_MAP[type]) {
        accessorySlot.textContent = "";
        return;
    }

    accessorySlot.textContent = ACCESSORY_MAP[type];
    accessorySlot.classList.add("show", `accessory-${type}`);
}

function applySkin(skin) {
    const key = SKIN_IMAGES[skin] ? skin : "default";
    currentSkinKey = key;

    applySkinEyeConfig(key);

    if (isAsleep) {
        closeEyesVisual();
    } else {
        pet.src = SKIN_IMAGES[key].open;
    }
}

window.electron?.onApplyCustomizationSettings?.((settings) => {
    applyAccessory(settings.accessory);
    applySkin(settings.skin);
});

window.electron?.onApplyAppearanceSettings?.((settings) => {
    document.body.setAttribute("data-theme", settings.theme || "midnight");
    document.body.setAttribute("data-bubble-style", settings.bubbleStyle || "modern");

    if (settings.theme === "custom") {
        const primary = settings.customPrimaryColor || "#4fb0ff";
        const bubble = settings.customBubbleColor || "#ffffff";
        const bg = settings.customBackgroundColor || "#f5f5f5";

        const bubbleText = pickTextColor(bubble);
        const isDarkBubble = bubbleText === "#f5f5f5";
        const hoverOverlay = isDarkBubble ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
        const hoverOverlay2 = isDarkBubble ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)";
        const separatorColor = isDarkBubble ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";

        document.body.style.setProperty("--accent", primary);
        document.body.style.setProperty("--accent-hover", darkenColor(primary, 0.15));
        document.body.style.setProperty("--bubble-bg", bubble);
        document.body.style.setProperty("--bubble-text", bubbleText);
        document.body.style.setProperty("--bubble-muted-text", toRgba(bubbleText === "#f5f5f5" ? "#ffffff" : "#000000", 0.6));
        document.body.style.setProperty("--snooze-bg", hoverOverlay);
        document.body.style.setProperty("--snooze-bg-hover", hoverOverlay2);
        document.body.style.setProperty("--menu-item-hover", hoverOverlay);
        document.body.style.setProperty("--menu-separator", separatorColor);
        document.body.style.setProperty("--game-header-bg", bg);
        document.body.style.setProperty("--game-area-bg-start", bg);
        document.body.style.setProperty("--game-area-bg-end", bubble);
        document.body.style.setProperty("--game-score-bg", isDarkBubble ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.85)");
        document.body.style.setProperty("--game-score-text", bubbleText);
    } else {
        CUSTOM_THEME_PROPS.forEach((prop) => document.body.style.removeProperty(prop));
    }
});

let reminderEnabled = true;
let reminderIntervalMs = REMINDER_INTERVAL;

const waterMessageEl = waterBubble.querySelector(".bubble-content p");

let reminderTimer = null;
let waterAutoHideTimer = null;

function showWaterReminder() {
    if (!reminderEnabled) return;

    if (activePanel) {
        scheduleReminder(5000);
        return;
    }

    if (isAsleep) {
        wakeUp();
        setTimeout(showWaterReminder, 400);
        return;
    }

    openPanel("water");
    window.electron?.reportWaterReminderSent?.();

    waterAutoHideTimer = setTimeout(() => {
        hideWaterReminder(true);
    }, AUTO_HIDE_TIMEOUT);
}

function hideWaterReminder(rescheduleFull) {
    clearTimeout(waterAutoHideTimer);
    closePanel("water");
    scheduleReminder(rescheduleFull ? reminderIntervalMs : SNOOZE_INTERVAL);
}

function scheduleReminder(delay) {
    clearTimeout(reminderTimer);
    if (!reminderEnabled) return;
    reminderTimer = setTimeout(showWaterReminder, delay);
}

waterDoneBtn.addEventListener("click", () => {
    jump();
    spawnHearts();
    registerInteraction();
    hideWaterReminder(true);
});

waterSnoozeBtn.addEventListener("click", () => {
    hideWaterReminder(false);
});

scheduleReminder(reminderIntervalMs);

window.electron?.onApplyReminderSettings?.((settings) => {
    reminderEnabled = settings.enabled !== false;
    reminderIntervalMs = (settings.interval || 45) * 60 * 1000;

    if (waterMessageEl && settings.message) {
        waterMessageEl.textContent = settings.message;
    }

    clearTimeout(reminderTimer);

    if (reminderEnabled) {
        scheduleReminder(reminderIntervalMs);
    } else if (activePanel === "water") {
        hideWaterReminder(false);
    }
});

/* ------------------------------------------------------------------ */
/* Sleep Mode                                                           */
/* ------------------------------------------------------------------ */

const SLEEP_AFTER_MAP = {
    "30sec": [25000, 35000],
    "1min": [55000, 70000],
    "5min": [280000, 320000],
    "never": null
};

let SLEEP_MIN = 55000;
let SLEEP_MAX = 70000;

let idleTimer = null;
let zzzInterval = null;

function getRandomIdleDelay() {
    return SLEEP_MIN + Math.random() * (SLEEP_MAX - SLEEP_MIN);
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (!sleepEnabled) return;
    idleTimer = setTimeout(goToSleep, getRandomIdleDelay());
}

function spawnZzz() {
    const sizes = [14, 18, 24];
    const letters = ["z", "z", "Z"];
    const i = Math.floor(Math.random() * 3);

    const z = document.createElement("span");
    z.className = "zzz-particle";
    z.textContent = letters[i];
    z.style.fontSize = `${sizes[i]}px`;

    zzzContainer.appendChild(z);
    z.addEventListener("animationend", () => z.remove());
}

function goToSleep() {
    if (isAsleep || activePanel) {
        resetIdleTimer();
        return;
    }

    isAsleep = true;

    closeEyesVisual();
    petWrapper.classList.add("sleeping");
    petVisual.classList.remove("walking");
    setMood("sleepy");
    syncWalkPause();

    openPanel("sleep");

    spawnZzz();
    zzzInterval = setInterval(spawnZzz, 700);
}

function wakeUp() {
    if (!isAsleep) {
        resetIdleTimer();
        return;
    }

    isAsleep = false;

    openEyesVisual();
    petWrapper.classList.remove("sleeping");

    clearInterval(zzzInterval);
    zzzContainer.innerHTML = "";

    closePanel("sleep");

    lastInteractionTime = Date.now();
    setMood("happy");
    syncWalkPause();

    resetIdleTimer();
}

/* ------------------------------------------------------------------ */
/* Wake-on-mouse (isolated block — separate from dragging listeners)  */
/* ------------------------------------------------------------------ */

let lastScreenPos = { x: null, y: null };

document.addEventListener("mousemove", (event) => {
    if (!wakeOnMouseEnabled) return;

    if (lastScreenPos.x === event.screenX && lastScreenPos.y === event.screenY) {
        return;
    }
    lastScreenPos = { x: event.screenX, y: event.screenY };

    wakeUp();
});

document.addEventListener("mousedown", () => {
    if (!wakeOnMouseEnabled) return;
    wakeUp();
});

document.addEventListener("click", () => {
    if (!wakeOnMouseEnabled) return;
    wakeUp();
});

resetIdleTimer();

/* ------------------------------------------------------------------ */
/* Reaction Bubble (Feed/Drink)                                         */
/* ------------------------------------------------------------------ */

let reactionHideTimer = null;

function showReaction(emoji, text, duration = 1600, forceStyle = null) {
    reactionEmoji.textContent = emoji;
    reactionText.textContent = text;

    reactionBubble.classList.toggle("force-thought", forceStyle === "thought");

    openPanel("reaction");

    clearTimeout(reactionHideTimer);
    reactionHideTimer = setTimeout(() => {
        closePanel("reaction");
    }, duration);
}

/* ------------------------------------------------------------------ */
/* Feed System — Right Click Bubble Menu                               */
/* ------------------------------------------------------------------ */

pet.addEventListener("contextmenu", (event) => {
    event.preventDefault();

    if (activePanel === "menu") {
        closePanel("menu");
        return;
    }

    if (isAsleep) wakeUp();

    openPanel("menu");
});

document.addEventListener("click", (event) => {
    if (activePanel !== "menu") return;
    if (menuBubble.contains(event.target)) return;

    closePanel("menu");
});

menuBubble.addEventListener("click", (event) => {
    const btn = event.target.closest(".menu-item");
    if (!btn) return;

    const action = btn.dataset.action;
    closePanel("menu");

    setTimeout(() => {
        handleMenuAction(action);
    }, 260);
});

function handleMenuAction(action) {
    if (action === "feed") {
        if (isAsleep) {
            wakeUp();
            setTimeout(() => {
                jump();
                registerInteraction();
                flashExcited();
                spawnHearts();
                showReaction(favoriteFoodEmoji, "Yum!!");
                window.electron?.reportFeed?.();
            }, 400);
        } else {
            jump();
            registerInteraction();
            flashExcited();
            spawnHearts();
            showReaction(favoriteFoodEmoji, "Yum!!");
            window.electron?.reportFeed?.();
        }
    }

    if (action === "drink") {
        if (isAsleep) {
            wakeUp();
            setTimeout(() => {
                jump();
                registerInteraction();
                flashExcited();
                showReaction("\ud83d\udca7", "Glug glug!");
            }, 400);
        } else {
            jump();
            registerInteraction();
            flashExcited();
            showReaction("\ud83d\udca7", "Glug glug!");
        }
    }

    if (action === "sleep") {
        if (!isAsleep) {
            clearTimeout(idleTimer);
            goToSleep();
        }
    }

    if (action === "throw-ball") {
        if (isAsleep) wakeUp();
        registerInteraction();
        window.electron?.startThrowBall?.();
    }

    if (action === "catch-cookie") {
        if (isAsleep) wakeUp();
        registerInteraction();
        startCatchCookie();
    }

    if (action === "settings") {
        window.electron.openSettings();
    }

    if (action === "exit") {
        window.electron.exitApp();
    }
}

/* ------------------------------------------------------------------ */
/* Mouse Follow Eyes                                                    */
/* ------------------------------------------------------------------ */

const MAX_PUPIL_OFFSET = 3.5;

window.electron.onCursorMove(({ dx, dy }) => {
    if (isAsleep) return;
    if (!eyeMovementEnabled) return;

    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const offsetX = Math.max(-MAX_PUPIL_OFFSET, Math.min(MAX_PUPIL_OFFSET, (dx / dist) * MAX_PUPIL_OFFSET));
    const offsetY = Math.max(-MAX_PUPIL_OFFSET, Math.min(MAX_PUPIL_OFFSET, (dy / dist) * MAX_PUPIL_OFFSET));

    eyeLeft.style.setProperty("--offsetX", `${offsetX}px`);
    eyeLeft.style.setProperty("--offsetY", `${offsetY}px`);
    eyeRight.style.setProperty("--offsetX", `${offsetX}px`);
    eyeRight.style.setProperty("--offsetY", `${offsetY}px`);
});

/* ------------------------------------------------------------------ */
/* Mood System                                                          */
/* ------------------------------------------------------------------ */

const MOOD_EMOJI = {
    happy: "\ud83d\ude0a",
    lonely: "\ud83e\udd7a",
    sleepy: "\ud83d\ude34",
    excited: "\ud83d\ude0d",
    angry: "\ud83d\ude24"
};

const LONELY_THRESHOLD = 10 * 60 * 1000;
const IDLE_CHECK_INTERVAL = 15 * 1000;
const SPAM_WINDOW = 3000;
const SPAM_CLICK_LIMIT = 5;

let currentMood = "happy";
let lastInteractionTime = Date.now();
let excitedRevertTimer = null;
let angryRevertTimer = null;
let clickTimestamps = [];

function setMood(mood) {
    if (currentMood === mood) return;

    currentMood = mood;
    moodBadge.textContent = MOOD_EMOJI[mood];
    window.electron?.reportMood?.(mood);

    moodBadge.classList.remove("pop");
    void moodBadge.offsetWidth;
    moodBadge.classList.add("pop");
}

function registerInteraction() {
    window.electron?.reportInteraction?.();

    if (!moodSystemEnabled) return;

    const wasLonely = currentMood === "lonely";
    lastInteractionTime = Date.now();

    if (wasLonely) {
        setMood("excited");
        showReaction("\ud83e\udd70", "Yay!", 1500);

        clearTimeout(excitedRevertTimer);
        excitedRevertTimer = setTimeout(() => {
            if (currentMood === "excited") setMood("happy");
        }, 2500);
    } else if (currentMood !== "sleepy" && currentMood !== "angry") {
        setMood("happy");
    }
}

function flashExcited() {
    if (!moodSystemEnabled) return;

    setMood("excited");
    clearTimeout(excitedRevertTimer);
    excitedRevertTimer = setTimeout(() => {
        if (currentMood === "excited") setMood("happy");
    }, 2500);
}

function registerClickForMoodSpam() {
    if (!moodSystemEnabled) return;

    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter((t) => now - t <= SPAM_WINDOW);

    if (clickTimestamps.length >= SPAM_CLICK_LIMIT) {
        clickTimestamps = [];
        setMood("angry");
        showReaction("\ud83d\ude24", "Stop it!", 1500);

        clearTimeout(angryRevertTimer);
        angryRevertTimer = setTimeout(() => {
            if (currentMood === "angry") setMood("happy");
        }, 2500);
    }
}

setInterval(() => {
    if (!moodSystemEnabled) return;
    if (isAsleep) return;
    if (currentMood === "lonely") return;

    if (Date.now() - lastInteractionTime > LONELY_THRESHOLD) {
        setMood("lonely");
        showReaction("\ud83e\udd7a", "Miss you...", 4000, "thought");
    }
}, IDLE_CHECK_INTERVAL);

pet.addEventListener("mousedown", registerInteraction);
pet.addEventListener("click", registerClickForMoodSpam);

/* ------------------------------------------------------------------ */
/* Walking + Bounce                                                     */
/* ------------------------------------------------------------------ */

function syncWalkPause() {
    const shouldPause = isDragging || isAsleep || !!activePanel;

    if (shouldPause) {
        window.electron.walkPause();
    } else {
        window.electron.walkResume();
    }
}

window.electron.onWalkDirection((dir) => {
    petVisual.style.setProperty("--dir", dir === -1 ? "-1" : "1");
});

window.electron.onWalkState((isWalking) => {
    if (isWalking && !isAsleep && !activePanel && !isDragging) {
        petVisual.classList.add("walking");
    } else {
        petVisual.classList.remove("walking");
    }
});

window.electron.onWalkBounce(() => {
    if (isAsleep || activePanel || isDragging) return;

    petVisual.classList.remove("bounce");
    void petVisual.offsetWidth;
    petVisual.classList.add("bounce");

    petVisual.classList.remove("jump");
    void petVisual.offsetWidth;
    petVisual.classList.add("jump");

    setTimeout(() => {
        petVisual.classList.remove("bounce");
        petVisual.classList.remove("jump");
    }, 500);
});

syncWalkPause();

/* ------------------------------------------------------------------ */
/* Fetch (Throw Ball) reactions                                         */
/* ------------------------------------------------------------------ */

window.electron?.onFetchState?.((state) => {
    if (state === "going") {
        petVisual.classList.add("walking");
    }

    if (state === "grabbed") {
        petVisual.classList.remove("walking");
        bounceDroppy();
        showReaction("\ud83c\udfbe", "Got it!", 800);
    }

    if (state === "returning") {
        petVisual.classList.add("walking");
    }

    if (state === "done") {
        petVisual.classList.remove("walking");
        showReaction("\ud83d\ude0a", "Here you go!", 1200);
    }
});

/* ------------------------------------------------------------------ */
/* Mini Game — Catch Cookie                                             */
/* ------------------------------------------------------------------ */

let gameScore = 0;
let cookieSpawnTimer = null;

function startCatchCookie() {
    gameScore = 0;
    gameScoreEl.textContent = "Score: 0";
    openPanel("game");
    spawnCookieLoop();
}

function spawnCookieLoop() {
    clearTimeout(cookieSpawnTimer);
    if (activePanel !== "game") return;

    spawnCookie();

    cookieSpawnTimer = setTimeout(spawnCookieLoop, 500 + Math.random() * 500);
}

function spawnCookie() {
    const cookie = document.createElement("div");
    cookie.className = "falling-cookie";
    cookie.textContent = "\ud83c\udf6a";

    const areaWidth = gameArea.clientWidth;
    cookie.style.left = `${Math.random() * (areaWidth - 26)}px`;

    const fallDuration = 2200 + Math.random() * 800;
    cookie.style.animationDuration = `${fallDuration}ms`;

    cookie.addEventListener("click", (event) => {
        event.stopPropagation();
        gameScore++;
        gameScoreEl.textContent = `Score: ${gameScore}`;
        cookie.remove();
    });

    cookie.addEventListener("animationend", () => {
        cookie.remove();
    });

    gameArea.appendChild(cookie);
}

gameCloseBtn.addEventListener("click", () => {
    clearTimeout(cookieSpawnTimer);
    closePanel("game");
});

/* ------------------------------------------------------------------ */
/* Settings — live apply listeners                                     */
/* ------------------------------------------------------------------ */

window.electron?.onApplyPetSize?.((px) => {
    pet.style.width = `${px}px`;
});

window.electron?.onApplyEyeSettings?.((settings) => {
    currentBlinkSpeed = settings.blinkSpeed || "normal";
    doubleBlinkEnabled = settings.doubleBlink !== false;
    eyeMovementEnabled = settings.eyeMovement !== false;

    if (!eyeMovementEnabled) {
        eyeLeft.style.setProperty("--offsetX", "0px");
        eyeLeft.style.setProperty("--offsetY", "0px");
        eyeRight.style.setProperty("--offsetX", "0px");
        eyeRight.style.setProperty("--offsetY", "0px");
    }
});

window.electron?.onApplyInteractionSettings?.((settings) => {
    jumpOnClickEnabled = settings.jumpOnClick !== false;
    heartsOnDoubleClickEnabled = settings.heartsOnDoubleClick !== false;

    const floatEnabled = settings.floatingAnimation !== false;

    if (floatEnabled) {
        petWrapper.classList.add("float-enabled");
    } else {
        petWrapper.classList.remove("float-enabled");
    }
});

window.electron?.onApplyMoodSettings?.((settings) => {
    moodSystemEnabled = settings.moodSystem !== false;
    wakeOnMouseEnabled = settings.wakeOnMouse !== false;

    if (!moodSystemEnabled) {
        moodBadge.style.display = "none";
    } else {
        moodBadge.style.display = "flex";
    }

    const range = SLEEP_AFTER_MAP[settings.sleepAfter];

    if (!range) {
        sleepEnabled = false;
        clearTimeout(idleTimer);
    } else {
        sleepEnabled = true;
        SLEEP_MIN = range[0];
        SLEEP_MAX = range[1];

        if (!isAsleep) {
            resetIdleTimer();
        }
    }
});

window.electron?.onForceSleep?.(() => {
    if (!isAsleep) {
        clearTimeout(idleTimer);
        goToSleep();
    }
});