const PAW_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="66" rx="26" ry="22" fill="currentColor"/>
    <ellipse cx="20" cy="38" rx="11" ry="15" fill="currentColor" transform="rotate(-15 20 38)"/>
    <ellipse cx="40" cy="24" rx="11" ry="15" fill="currentColor" transform="rotate(-5 40 24)"/>
    <ellipse cx="60" cy="24" rx="11" ry="15" fill="currentColor" transform="rotate(5 60 24)"/>
    <ellipse cx="80" cy="38" rx="11" ry="15" fill="currentColor" transform="rotate(15 80 38)"/>
</svg>`;

window.footprintsAPI.onSpawn(({ x, y, flip }) => {
    const fp = document.createElement("div");
    fp.className = "footprint";
    fp.style.left = `${x}px`;
    fp.style.top = `${y}px`;
    fp.style.color = "#f48fb1"; // pet ke pink theme se match karta hua
    fp.innerHTML = PAW_SVG;

    if (flip) {
        fp.style.transform = "translate(-50%, -50%) scaleX(-1)";
    }

    document.body.appendChild(fp);

    fp.addEventListener("animationend", () => fp.remove());
});