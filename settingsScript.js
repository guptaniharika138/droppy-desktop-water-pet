const petSizeRadios = document.querySelectorAll('input[name="petSize"]');
const alwaysOnTopBox = document.getElementById("alwaysOnTop");
const startWithWindowsBox = document.getElementById("startWithWindows");
const opacitySlider = document.getElementById("opacity");
const opacityValue = document.getElementById("opacityValue");

const blinkSpeedRadios = document.querySelectorAll('input[name="blinkSpeed"]');
const eyeMovementBox = document.getElementById("eyeMovement");
const doubleBlinkBox = document.getElementById("doubleBlink");

const jumpOnClickBox = document.getElementById("jumpOnClick");
const heartsOnDoubleClickBox = document.getElementById("heartsOnDoubleClick");
const floatingAnimationBox = document.getElementById("floatingAnimation");

const autoWalkBox = document.getElementById("autoWalk");
const randomWalkingBox = document.getElementById("randomWalking");
const bounceAtEdgesBox = document.getElementById("bounceAtEdges");
const walkSpeedRadios = document.querySelectorAll('input[name="walkSpeed"]');
const movementModeRadios = document.querySelectorAll('input[name="movementMode"]');

const moodSystemBox = document.getElementById("moodSystem");
const sleepAfterRadios = document.querySelectorAll('input[name="sleepAfter"]');
const wakeOnMouseBox = document.getElementById("wakeOnMouse");

const reminderEnabledBox = document.getElementById("reminderEnabled");
const reminderIntervalRadios = document.querySelectorAll('input[name="reminderInterval"]');
const reminderMessageInput = document.getElementById("reminderMessage");

const favoriteFoodRadios = document.querySelectorAll('input[name="favoriteFood"]');

const statInteractionsEl = document.getElementById("statInteractions");
const statWaterRemindersEl = document.getElementById("statWaterReminders");
const statFeedCountEl = document.getElementById("statFeedCount");
const statCurrentMoodEl = document.getElementById("statCurrentMood");

const MOOD_DISPLAY = {
    happy: "😊 Happy",
    lonely: "🥺 Lonely",
    sleepy: "😴 Sleepy",
    excited: "😍 Excited",
    angry: "😤 Angry"
};

async function loadStats() {
    const stats = await window.settingsAPI.getStats();

    statInteractionsEl.textContent = stats.interactionsToday;
    statWaterRemindersEl.textContent = stats.waterRemindersSentToday;
    statFeedCountEl.textContent = stats.feedCountToday;
    statCurrentMoodEl.textContent = MOOD_DISPLAY[stats.currentMood] || "😊 Happy";
}

const themeRadios = document.querySelectorAll('input[name="theme"]');
const bubbleStyleRadios = document.querySelectorAll('input[name="bubbleStyle"]');

const accessoryRadios = document.querySelectorAll('input[name="accessory"]');
const skinRadios = document.querySelectorAll('input[name="skin"]');

const customColorsRow = document.getElementById("customColorsRow");
const customPrimaryColorInput = document.getElementById("customPrimaryColor");
const customBubbleColorInput = document.getElementById("customBubbleColor");
const customBackgroundColorInput = document.getElementById("customBackgroundColor");

function updateCustomColorsVisibility() {
    const customSelected = document.querySelector('input[name="theme"]:checked')?.value === "custom";
    customColorsRow.style.display = customSelected ? "flex" : "none";
}

async function loadSettings() {
    const settings = await window.settingsAPI.getSettings();

    petSizeRadios.forEach((r) => { r.checked = r.value === settings.petSize; });
    alwaysOnTopBox.checked = settings.alwaysOnTop;
    startWithWindowsBox.checked = settings.startWithWindows;
    opacitySlider.value = settings.opacity;
    opacityValue.textContent = `${settings.opacity}%`;

    blinkSpeedRadios.forEach((r) => { r.checked = r.value === settings.blinkSpeed; });
    eyeMovementBox.checked = settings.eyeMovement;
    doubleBlinkBox.checked = settings.doubleBlink;

    jumpOnClickBox.checked = settings.jumpOnClick;
    heartsOnDoubleClickBox.checked = settings.heartsOnDoubleClick;
    floatingAnimationBox.checked = settings.floatingAnimation;

    autoWalkBox.checked = settings.autoWalk;
    randomWalkingBox.checked = settings.randomWalking;
    bounceAtEdgesBox.checked = settings.bounceAtEdges;
    walkSpeedRadios.forEach((r) => { r.checked = r.value === settings.walkSpeed; });
    movementModeRadios.forEach((r) => { r.checked = r.value === settings.movementMode; });

    moodSystemBox.checked = settings.moodSystem;
    sleepAfterRadios.forEach((r) => { r.checked = r.value === settings.sleepAfter; });
    wakeOnMouseBox.checked = settings.wakeOnMouse;

    reminderEnabledBox.checked = settings.reminderEnabled;
    reminderIntervalRadios.forEach((r) => { r.checked = r.value === String(settings.reminderInterval); });
    reminderMessageInput.value = settings.reminderMessage;

    favoriteFoodRadios.forEach((r) => { r.checked = r.value === settings.favoriteFood; });

    themeRadios.forEach((r) => { r.checked = r.value === settings.theme; });
    bubbleStyleRadios.forEach((r) => { r.checked = r.value === settings.bubbleStyle; });

    customPrimaryColorInput.value = settings.customPrimaryColor;
    customBubbleColorInput.value = settings.customBubbleColor;
    customBackgroundColorInput.value = settings.customBackgroundColor;
    updateCustomColorsVisibility();

    accessoryRadios.forEach((r) => { r.checked = r.value === settings.accessory; });
    skinRadios.forEach((r) => { r.checked = r.value === settings.skin; });
}

petSizeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("petSize", radio.value);
    });
});

alwaysOnTopBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("alwaysOnTop", alwaysOnTopBox.checked);
});

startWithWindowsBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("startWithWindows", startWithWindowsBox.checked);
});

opacitySlider.addEventListener("input", () => {
    const val = parseInt(opacitySlider.value, 10);
    opacityValue.textContent = `${val}%`;
    window.settingsAPI.setSetting("opacity", val);
});

blinkSpeedRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("blinkSpeed", radio.value);
    });
});

eyeMovementBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("eyeMovement", eyeMovementBox.checked);
});

doubleBlinkBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("doubleBlink", doubleBlinkBox.checked);
});

jumpOnClickBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("jumpOnClick", jumpOnClickBox.checked);
});

heartsOnDoubleClickBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("heartsOnDoubleClick", heartsOnDoubleClickBox.checked);
});

floatingAnimationBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("floatingAnimation", floatingAnimationBox.checked);
});

autoWalkBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("autoWalk", autoWalkBox.checked);
});

randomWalkingBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("randomWalking", randomWalkingBox.checked);
});

bounceAtEdgesBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("bounceAtEdges", bounceAtEdgesBox.checked);
});

walkSpeedRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("walkSpeed", radio.value);
    });
});

movementModeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("movementMode", radio.value);
    });
});

document.getElementById("btnPause").addEventListener("click", () => {
    window.settingsAPI.pauseMovement();
});

document.getElementById("btnResume").addEventListener("click", () => {
    window.settingsAPI.resumeMovement();
});

document.getElementById("btnStay").addEventListener("click", () => {
    window.settingsAPI.stayAtPosition();
    loadSettings();
});

document.getElementById("btnHome").addEventListener("click", () => {
    window.settingsAPI.returnHome();
});

moodSystemBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("moodSystem", moodSystemBox.checked);
});

sleepAfterRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("sleepAfter", radio.value);
    });
});

wakeOnMouseBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("wakeOnMouse", wakeOnMouseBox.checked);
});

reminderEnabledBox.addEventListener("change", () => {
    window.settingsAPI.setSetting("reminderEnabled", reminderEnabledBox.checked);
});

reminderIntervalRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("reminderInterval", parseInt(radio.value, 10));
    });
});

let reminderMessageDebounce = null;
reminderMessageInput.addEventListener("input", () => {
    clearTimeout(reminderMessageDebounce);
    reminderMessageDebounce = setTimeout(() => {
        const val = reminderMessageInput.value.trim() || "Time to drink water!";
        window.settingsAPI.setSetting("reminderMessage", val);
    }, 500);
});

favoriteFoodRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("favoriteFood", radio.value);
    });
});

themeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("theme", radio.value);
        updateCustomColorsVisibility();
    });
});

bubbleStyleRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("bubbleStyle", radio.value);
    });
});

customPrimaryColorInput.addEventListener("input", () => {
    window.settingsAPI.setSetting("customPrimaryColor", customPrimaryColorInput.value);
});

customBubbleColorInput.addEventListener("input", () => {
    window.settingsAPI.setSetting("customBubbleColor", customBubbleColorInput.value);
});

customBackgroundColorInput.addEventListener("input", () => {
    window.settingsAPI.setSetting("customBackgroundColor", customBackgroundColorInput.value);
});

accessoryRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("accessory", radio.value);
    });
});

skinRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        if (radio.checked) window.settingsAPI.setSetting("skin", radio.value);
    });
});

loadSettings();
loadStats();
setInterval(loadStats, 4000);